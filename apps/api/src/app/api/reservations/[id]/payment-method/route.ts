/**
 * API: Actualizar método de pago de una reserva
 * PUT /api/reservations/[id]/payment-method
 */

import { NextRequest } from 'next/server';
import { withAuthMiddleware, ApiResponse } from '@/lib/middleware';
import { db } from '@repo/db';
import { z } from 'zod';

const UpdatePaymentMethodSchema = z.object({
  paymentMethod: z.enum(['CARD', 'BIZUM', 'ONSITE', 'CASH', 'TRANSFER', 'CREDITS']),
});

export async function PUT(request: NextRequest) {
  return withAuthMiddleware(async (req) => {
    try {
      const id = req.nextUrl.pathname.split('/')[3]; // /api/reservations/[id]/payment-method
      if (!id) return ApiResponse.badRequest('ID de reserva requerido');

      const body = await req.json();
      const data = UpdatePaymentMethodSchema.parse(body);

      // Obtener usuario desde la request
      const user = (req as any).user;
      if (!user || !user.id) {
        return ApiResponse.unauthorized('Usuario no autenticado');
      }

      // Verificar que la reserva existe y pertenece al usuario
      const existingReservation = await db.reservation.findFirst({
        where: { 
          id,
          userId: user.id
        },
        select: { 
          id: true, 
          status: true, 
          paymentMethod: true,
          startTime: true
        }
      });

      if (!existingReservation) {
        return ApiResponse.notFound('Reserva no encontrada');
      }

      // Solo permitir actualizar si está pendiente
      if (existingReservation.status !== 'PENDING') {
        return ApiResponse.badRequest('Solo se puede actualizar el método de pago de reservas pendientes');
      }

      // Validar que pago en sede solo se permita para reservas de hoy
      if (data.paymentMethod === 'ONSITE') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const reservationDate = new Date(existingReservation.startTime);
        reservationDate.setHours(0, 0, 0, 0);
        
        if (reservationDate.getTime() !== today.getTime()) {
          return ApiResponse.badRequest('El pago en sede solo está disponible para reservas de hoy');
        }
      }

      // Actualizar el método de pago
      const updatedReservation = await db.reservation.update({
        where: { id },
        data: {
          paymentMethod: data.paymentMethod,
          updatedAt: new Date(),
        },
        include: {
          user: { select: { id: true, name: true, email: true } },
          court: { select: { id: true, name: true, center: { select: { id: true, name: true } } } },
        }
      });

      // Registrar evento de auditoría
      await db.outboxEvent.create({
        data: {
          eventType: 'PAYMENT_METHOD_UPDATED',
          eventData: {
            reservationId: id,
            userId: user.id,
            previousPaymentMethod: existingReservation.paymentMethod,
            newPaymentMethod: data.paymentMethod,
            timestamp: new Date().toISOString()
          }
        }
      });

      // Enviar correo de confirmación si es pago en sede
      if (data.paymentMethod === 'ONSITE') {
        try {
          const { emailService } = await import('@repo/notifications');
          await emailService.sendOnSitePaymentConfirmation({
            reservationId: id,
            userEmail: updatedReservation.user.email,
            userName: updatedReservation.user.name || 'Usuario',
            courtName: updatedReservation.court.name,
            centerName: updatedReservation.court.center.name,
            totalAmount: Number(updatedReservation.totalPrice),
            startTime: updatedReservation.startTime.toISOString(),
            endTime: updatedReservation.endTime.toISOString(),
            reservationDate: new Date(updatedReservation.startTime).toLocaleDateString('es-ES', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            }),
            reservationTime: `${new Date(updatedReservation.startTime).toLocaleTimeString('es-ES', {
              hour: '2-digit',
              minute: '2-digit'
            })} - ${new Date(updatedReservation.endTime).toLocaleTimeString('es-ES', {
              hour: '2-digit',
              minute: '2-digit'
            })}`
          });
        } catch (emailError) {
          console.warn('Error enviando correo de confirmación de pago en sede:', emailError);
          // No fallar la operación por error de email
        }
      }

      return ApiResponse.success({
        id: updatedReservation.id,
        paymentMethod: updatedReservation.paymentMethod,
        message: 'Método de pago actualizado correctamente'
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
      console.error('Payment method update error:', error);
      return ApiResponse.internalError('Error interno del servidor');
    }
  })(request);
}

export async function OPTIONS() {
  return ApiResponse.success(null);
}
