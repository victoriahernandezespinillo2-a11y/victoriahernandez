import { db } from '@repo/db';
import { walletService } from './wallet.service';
import { ledgerService } from './ledger.service';
import { evaluateAutoCreditRefund } from './refund-policy-evaluator';

interface AutoRefundResult {
  success: boolean;
  creditsRefunded?: number;
  reason?: string;
}

/**
 * Procesa reembolso automático en créditos para una reserva específica ya cancelada.
 * Se ejecuta post-cancelación, fuera de la transacción, de forma idempotente.
 */
export async function processReservationAutoRefund(reservationId: string, cancelEventTime?: Date): Promise<AutoRefundResult> {
  try {
    const reservation = await db.reservation.findUnique({
      where: { id: reservationId },
      include: { court: { include: { center: true } } }
    });

    if (!reservation) {
      return { success: false, reason: 'Reserva no encontrada' };
    }

    // Validaciones básicas de estado
    if ((reservation as any).status !== 'CANCELLED') {
      return { success: false, reason: 'La reserva no está cancelada' };
    }
    if ((reservation as any).paymentStatus === 'REFUNDED') {
      return { success: false, reason: 'La reserva ya fue reembolsada' };
    }
    if ((reservation as any).paymentStatus !== 'PAID') {
      return { success: false, reason: 'La reserva no estaba pagada (no aplica reembolso)' };
    }

    const startTime: Date = new Date((reservation as any).startTime);
    const cancellationTime: Date = cancelEventTime || new Date();

    const centerSettings: any = ((reservation as any).court?.center as any)?.settings || {};
    const evaluation = evaluateAutoCreditRefund({
      centerSettings,
      reservationStartTime: startTime,
      cancellationTime,
    });

    if (!evaluation.eligible) {
      return { success: false, reason: evaluation.reason || 'No elegible para reembolso automático' };
    }

    // Obtener euroPerCredit
    const creditsCfg: any = (centerSettings?.credits as any) || {};
    const euroPerCredit: number = typeof creditsCfg.euroPerCredit === 'number' && creditsCfg.euroPerCredit > 0
      ? creditsCfg.euroPerCredit
      : 1;

    // Calcular importe en euros a reembolsar
    let amountEuro = Number((reservation as any).totalPrice || 0);
    if (!amountEuro || amountEuro <= 0) {
      const payment = await db.payment.findFirst({
        where: { referenceType: 'RESERVATION', referenceId: reservationId },
        orderBy: { processedAt: 'desc' }
      });
      amountEuro = Number((payment as any)?.amount || (payment as any)?.cardAmount || 0);
    }

    if (!amountEuro || amountEuro <= 0) {
      return { success: false, reason: 'Importe de reembolso inválido o no encontrado' };
    }

    let creditsToRefund = Number((reservation as any).creditsUsed || 0);
    if (!creditsToRefund || creditsToRefund <= 0) {
      creditsToRefund = amountEuro / euroPerCredit;
    }
    creditsToRefund = Number(creditsToRefund.toFixed(6));
    if (creditsToRefund <= 0) {
      return { success: false, reason: 'Créditos a reembolsar inválidos' };
    }

    // Idempotencia por reserva
    const walletIdempotencyKey = `AUTO_REFUND_CREDITS:RES:${reservationId}`;
    const ledgerIdempotencyKey = `AUTO_REFUND:RES:${reservationId}`;

    // Reembolsar créditos al usuario (fuera de transacción para evitar bloquear cancelación)
    await walletService.refundCredits({
      userId: (reservation as any).userId,
      credits: creditsToRefund,
      reason: 'REFUND' as any,
      metadata: {
        reservationId,
        refundReason: 'AUTO_REFUND',
        policy: evaluation.policyUsed,
        deadlineHours: evaluation.deadlineHoursUsed,
        amountEuro,
        euroPerCredit,
      },
      idempotencyKey: walletIdempotencyKey,
    });

    // Actualizar estado de pago de la reserva y crear registro de pago "refund" en créditos
    await db.$transaction(async (tx) => {
      await tx.reservation.update({
        where: { id: reservationId },
        data: { paymentStatus: 'REFUNDED' }
      });

      await tx.payment.create({
        data: {
          userId: (reservation as any).userId,
          amount: -amountEuro, // Negativo para reembolso
          currency: 'EUR',
          method: 'CREDITS',
          creditAmount: creditsToRefund,
          cardAmount: 0,
          status: 'REFUNDED',
          referenceType: 'RESERVATION',
          referenceId: reservationId,
          metadata: {
            type: 'AUTO_REFUND_CREDITS',
            policy: evaluation.policyUsed,
            deadlineHours: evaluation.deadlineHoursUsed,
            euroPerCredit,
          },
          processedAt: new Date(),
        }
      });

      // Emitir outbox para que el front marque como reembolsada
      await tx.outboxEvent.create({
        data: {
          eventType: 'RESERVATION_REFUNDED',
          eventData: {
            reservationId,
            refundId: null,
            amount: amountEuro,
            reason: 'AUTO_REFUND',
            creditsRefunded: creditsToRefund,
          } as any,
        }
      });
    });

    // Registrar en ledger (idempotente)
    try {
      await ledgerService.recordRefund({
        sourceType: 'RESERVATION',
        sourceId: reservationId,
        amountEuro,
        currency: 'EUR',
        method: 'CREDITS',
        paidAt: new Date(),
        idempotencyKey: ledgerIdempotencyKey,
        metadata: {
          provider: 'CREDITS',
          creditsRefunded: creditsToRefund,
          amountEuro,
          euroPerCredit,
          policy: evaluation.policyUsed,
        }
      });
    } catch (e: any) {
      // No bloquear por ledger; si es conflicto de idempotencia, ignorar
      console.warn('Ledger recordRefund failed (AUTO RESERVATION):', e?.message || e);
    }

    return { success: true, creditsRefunded: creditsToRefund };
  } catch (error: any) {
    console.error('Error procesando auto reembolso:', error);
    return { success: false, reason: error?.message || 'Error desconocido' };
  }
}