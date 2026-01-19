/**
 * API Admin: Gestión de pagos de reservas
 * PUT /api/admin/reservations/[id]/payment - Marcar pago como pagado
 */

import { NextRequest } from 'next/server';
import { withAdminReservationsMiddleware, ApiResponse } from '@/lib/middleware';
import { db } from '@repo/db';
import { z } from 'zod';
import { reservationNotificationService } from '@/lib/services/reservation-notification.service';
import { getCreditSystemService } from '@/lib/services/credit-system.service';

const UpdatePaymentSchema = z.object({
  paymentMethod: z.enum(['CASH', 'CARD', 'TRANSFER', 'ONSITE', 'CREDITS', 'BIZUM']),
  paymentStatus: z.enum(['PAID', 'PENDING', 'REFUNDED']).optional(),
  notes: z.string().optional(),
  amount: z.number().positive().optional(),
});

export async function PUT(request: NextRequest) {
  return withAdminReservationsMiddleware(async (req) => {
    try {
      const id = req.nextUrl.pathname.split('/')[4]; // /api/admin/reservations/[id]/payment
      if (!id) return ApiResponse.badRequest('ID de reserva requerido');

      const body = await req.json();
      const data = UpdatePaymentSchema.parse(body);

      // Verificar que la reserva existe
      const existingReservation = await db.reservation.findUnique({
        where: { id },
        select: {
          id: true,
          status: true,
          totalPrice: true,
          paymentMethod: true,
          paymentStatus: true,
          userId: true
        }
      });

      if (!existingReservation) {
        return ApiResponse.notFound('Reserva no encontrada');
      }

      // Validar que el monto coincida (si se proporciona)
      if (data.amount && Math.abs(data.amount - Number(existingReservation.totalPrice)) > 0.01) {
        return ApiResponse.badRequest('El monto no coincide con el total de la reserva');
      }

      const amount = Number(existingReservation.totalPrice);

      // 🔧 FIX: Si el método de pago es CREDITS, deducir del balance del usuario
      if (data.paymentMethod === 'CREDITS') {
        console.log('💳 [ADMIN-PAYMENT] Procesando pago con créditos:', {
          reservationId: id,
          userId: existingReservation.userId,
          amount
        });

        const creditService = getCreditSystemService();

        // Verificar saldo suficiente
        const canAfford = await creditService.canAfford(existingReservation.userId, amount);
        if (!canAfford) {
          console.warn('❌ [ADMIN-PAYMENT] Usuario sin créditos suficientes:', {
            userId: existingReservation.userId,
            requiredAmount: amount
          });
          return ApiResponse.badRequest(
            `El usuario no tiene créditos suficientes. Se requieren €${amount.toFixed(2)}`
          );
        }

        // Deducir créditos
        const deductResult = await creditService.deductCredits({
          userId: existingReservation.userId,
          credits: amount,
          reason: 'Pago de reserva (confirmado por admin)',
          metadata: {
            reservationId: id,
            confirmedBy: 'ADMIN',
            notes: data.notes || undefined
          }
        });

        console.log('✅ [ADMIN-PAYMENT] Créditos deducidos:', {
          userId: existingReservation.userId,
          amount,
          balanceAfter: deductResult.balanceAfter
        });
      }

      // Preparar datos de actualización
      const updateData: any = {
        paymentMethod: data.paymentMethod,
        paymentStatus: 'PAID',
        updatedAt: new Date(),
      };

      // Actualizar el estado de la reserva
      updateData.status = 'PAID';

      // Actualizar la reserva
      const updatedReservation = await db.reservation.update({
        where: { id },
        data: updateData,
        include: {
          user: { select: { id: true, name: true, email: true } },
          court: { select: { id: true, name: true, center: { select: { id: true, name: true } } } },
        }
      });

      // Registrar evento de auditoría
      await db.outboxEvent.create({
        data: {
          eventType: 'PAYMENT_CONFIRMED',
          eventData: {
            reservationId: id,
            userId: existingReservation.userId,
            paymentMethod: data.paymentMethod,
            amount: Number(existingReservation.totalPrice),
            previousStatus: existingReservation.status,
            newStatus: 'PAID',
            confirmedBy: 'ADMIN',
            notes: data.notes,
            timestamp: new Date().toISOString()
          }
        }
      });

      // Enviar notificación de confirmación de pago
      try {
        await reservationNotificationService.sendReservationConfirmation(id);
      } catch (emailError) {
        console.warn('Error enviando confirmación de reserva pagada:', emailError);
      }

      return ApiResponse.success({
        id: updatedReservation.id,
        status: updatedReservation.status,
        paymentMethod: updatedReservation.paymentMethod,
        paymentStatus: 'PAID',
        message: 'Pago confirmado exitosamente'
      });

    } catch (error) {
      if (error instanceof z.ZodError) {
        return ApiResponse.validation(
          error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        );
      }
      console.error('Admin payment confirmation error:', error);
      return ApiResponse.internalError('Error interno del servidor');
    }
  })(request);
}

export async function OPTIONS() {
  return ApiResponse.success(null);
}
