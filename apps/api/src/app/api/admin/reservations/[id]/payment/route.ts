/**
 * API Admin: Gestión de pagos de reservas
 * PUT /api/admin/reservations/[id]/payment - Marcar pago como pagado
 */

import { NextRequest } from 'next/server';
import { withAdminReservationsMiddleware, ApiResponse } from '@/lib/middleware';
import { db } from '@repo/db';
import { z } from 'zod';
import { reservationNotificationService } from '@/lib/services/reservation-notification.service';

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

      // Preparar datos de actualización
      const updateData: any = {
        paymentMethod: data.paymentMethod,
        updatedAt: new Date(),
      };

      // Si se marca como pagado, actualizar el estado de la reserva
      if (data.paymentStatus === 'PAID' || data.paymentMethod) {
        updateData.status = 'PAID';
      }

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
