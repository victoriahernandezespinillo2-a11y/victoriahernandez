import { z } from 'zod';
import { db } from '@repo/db';

const prisma = db as any;

const RecordPaymentSchema = z.object({
  sourceType: z.enum(['RESERVATION', 'ORDER', 'TOPUP', 'MEMBERSHIP', 'OTHER']).default('OTHER'),
  sourceId: z.string().min(1),
  direction: z.literal('CREDIT').optional().default('CREDIT'),
  amountEuro: z.number().nonnegative(),
  currency: z.string().optional().default('EUR'),
  paymentStatus: z.enum(['PAID', 'PENDING']).optional().default('PAID'),
  paidAt: z.date().optional().default(() => new Date()),
  method: z.enum(['CARD', 'CASH', 'CREDITS', 'TRANSFER', 'COURTESY', 'REDSYS', 'OTHER']).default('OTHER'),
  gatewayRef: z.string().optional(),
  idempotencyKey: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

const RecordRefundSchema = z.object({
  sourceType: z.enum(['RESERVATION', 'ORDER', 'TOPUP', 'MEMBERSHIP', 'OTHER']).default('OTHER'),
  sourceId: z.string().min(1),
  amountEuro: z.number().nonnegative(),
  currency: z.string().optional().default('EUR'),
  paidAt: z.date().optional().default(() => new Date()),
  method: z.enum(['CARD', 'CASH', 'CREDITS', 'TRANSFER', 'COURTESY', 'REDSYS', 'OTHER']).default('OTHER'),
  gatewayRef: z.string().optional(),
  idempotencyKey: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

export type RecordPaymentInput = z.infer<typeof RecordPaymentSchema>;
export type RecordRefundInput = z.infer<typeof RecordRefundSchema>;

class LedgerService {
  private ensureIdempotencyKey(input: { sourceType: string; sourceId: string; method?: string; gatewayRef?: string; idempotencyKey?: string }) {
    if (input.idempotencyKey && input.idempotencyKey.trim()) return input.idempotencyKey.trim();
    if (input.gatewayRef && input.gatewayRef.trim()) return `${input.sourceType}:${input.sourceId}:${input.gatewayRef.trim()}`;
    return `${input.sourceType}:${input.sourceId}:${(input.method || 'OTHER')}`;
  }

  async recordPayment(data: RecordPaymentInput) {
    const payload = RecordPaymentSchema.parse(data);
    const idempotencyKey = this.ensureIdempotencyKey(payload);

    try {
      // Intentar crear transacción contable idempotente
      const tx = await prisma.ledgerTransaction.upsert({
        where: { idempotencyKey },
        update: {},
        create: {
          sourceType: payload.sourceType,
          sourceId: payload.sourceId,
          direction: 'CREDIT',
          amountEuro: payload.amountEuro,
          currency: payload.currency || 'EUR',
          paymentStatus: 'PAID',
          paidAt: payload.paidAt || new Date(),
          method: payload.method,
          gatewayRef: payload.gatewayRef || null,
          idempotencyKey,
          metadata: payload.metadata || {},
        },
      });

      // Marcar entidad de origen (no confundir estado operativo con pago)
      const paidAt = payload.paidAt || new Date();
      switch (payload.sourceType) {
        case 'RESERVATION': {
          try {
            await prisma.reservation.update({
              where: { id: payload.sourceId },
              data: { paymentStatus: 'PAID', paidAt },
            });
          } catch {}
          break;
        }
        case 'ORDER': {
          try {
            await prisma.order.update({
              where: { id: payload.sourceId },
              data: { paymentStatus: 'PAID', paidAt },
            });
          } catch {}
          break;
        }
        case 'TOPUP': {
          try {
            await prisma.order.update({
              where: { id: payload.sourceId },
              data: { paymentStatus: 'PAID', paidAt },
            });
          } catch {}
          break;
        }
      }

      // Outbox para auditoría
      try {
        await prisma.outboxEvent.create({
          data: {
            eventType: 'LEDGER_PAYMENT_RECORDED',
            eventData: {
              sourceType: payload.sourceType,
              sourceId: payload.sourceId,
              amountEuro: payload.amountEuro,
              method: payload.method,
              idempotencyKey,
            } as any,
          },
        });
      } catch {}

      return tx;
    } catch (e: any) {
      // Si es idempotente y ya existe, devolver existente
      try {
        const existing = await prisma.ledgerTransaction.findUnique({ where: { idempotencyKey } });
        if (existing) return existing;
      } catch {}
      throw e;
    }
  }

  async recordRefund(data: RecordRefundInput) {
    const payload = RecordRefundSchema.parse(data);
    const idempotencyKey = this.ensureIdempotencyKey({ ...payload, method: payload.method });

    try {
      const tx = await prisma.ledgerTransaction.upsert({
        where: { idempotencyKey },
        update: {},
        create: {
          sourceType: payload.sourceType,
          sourceId: payload.sourceId,
          direction: 'DEBIT',
          amountEuro: payload.amountEuro,
          currency: payload.currency || 'EUR',
          paymentStatus: 'REFUNDED',
          paidAt: payload.paidAt || new Date(),
          method: payload.method,
          gatewayRef: payload.gatewayRef || null,
          idempotencyKey,
          metadata: payload.metadata || {},
        },
      });

      // Actualizar entidad origen si el reembolso es total (heurística: iguala monto)
      switch (payload.sourceType) {
        case 'RESERVATION': {
          try {
            const res = await prisma.reservation.findUnique({ where: { id: payload.sourceId } });
            const total = Number(res?.totalPrice || 0);
            if (payload.amountEuro >= total && total > 0) {
              await prisma.reservation.update({ where: { id: payload.sourceId }, data: { paymentStatus: 'REFUNDED' } });
            }
          } catch {}
          break;
        }
        case 'ORDER': {
          try {
            const ord = await prisma.order.findUnique({ where: { id: payload.sourceId } });
            const total = Number(ord?.totalEuro || 0);
            if (payload.amountEuro >= total && total > 0) {
              await prisma.order.update({ where: { id: payload.sourceId }, data: { paymentStatus: 'REFUNDED' } });
            }
          } catch {}
          break;
        }
      }

      try {
        await prisma.outboxEvent.create({
          data: {
            eventType: 'LEDGER_REFUND_RECORDED',
            eventData: {
              sourceType: payload.sourceType,
              sourceId: payload.sourceId,
              amountEuro: payload.amountEuro,
              method: payload.method,
              idempotencyKey,
            } as any,
          },
        });
      } catch {}

      return tx;
    } catch (e: any) {
      try {
        const existing = await prisma.ledgerTransaction.findUnique({ where: { idempotencyKey } });
        if (existing) return existing;
      } catch {}
      throw e;
    }
  }
}

export const ledgerService = new LedgerService();



