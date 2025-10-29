import { NextRequest, NextResponse } from 'next/server';
import { reservationService } from '../../../../lib/services/reservation.service';
import { withReservationMiddleware, ApiResponse } from '@/lib/middleware';
import { db } from '@repo/db';
import { z } from 'zod';

// Esquema para actualizar reserva (normaliza estados a mayúsculas válidas)
const StatusEnum = z.enum(['PENDING', 'PAID', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW']);
const UpdateReservationSchema = z.object({
  startTime: z.string().datetime().optional(),
  duration: z.number().min(30).max(480).optional(),
  notes: z.string().optional(),
  status: z
    .preprocess((val) => {
      if (val == null) return val as any;
      const v = String(val).toLowerCase();
      const map: Record<string, string> = {
        confirmed: 'IN_PROGRESS',
        cancelled: 'CANCELLED',
        completed: 'COMPLETED',
        no_show: 'NO_SHOW',
        pending: 'PENDING',
        paid: 'PAID',
        in_progress: 'IN_PROGRESS',
      };
      return (map[v] || v.toUpperCase()) as any;
    }, StatusEnum)
    .optional(),
});

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * GET /api/reservations/[id]
 * Obtener detalles de una reserva específica
 */
export async function GET(request: NextRequest) {
  return withReservationMiddleware(async (req: NextRequest) => {
    try {
      const reservationId = req.nextUrl.pathname.split('/').pop() as string;
      if (!reservationId) {
        return ApiResponse.badRequest('ID de reserva requerido');
      }

      const user = (req as any).user;
      if (!user?.id) {
        return ApiResponse.unauthorized('No autorizado');
      }

      const reservation = await db.reservation.findUnique({
        where: { id: reservationId },
        include: { 
          user: true, 
          court: { 
            include: { 
              center: true 
            } 
          } 
        }
      });

      if (!reservation) {
        return ApiResponse.notFound('Reserva');
      }

      if (user.role === 'USER' && reservation.userId !== user.id) {
        return ApiResponse.forbidden('Solo puedes ver tus propias reservas');
      }

      return ApiResponse.success(reservation);
    } catch (error) {
      console.error('🚨 [GET-RESERVATION] Error obteniendo reserva:', error);
      return ApiResponse.internalError('Error interno del servidor');
    }
  })(request);
}

/**
 * PUT /api/reservations/[id]
 * Actualizar una reserva específica
 */
export async function PUT(
  request: NextRequest
) {
  return withReservationMiddleware(async (req: NextRequest) => {
    try {
      const reservationId = req.nextUrl.pathname.split('/').pop() as string;
      if (!reservationId) {
        return ApiResponse.badRequest('ID de reserva requerido');
      }

      const body = await req.json();
      const validatedData = UpdateReservationSchema.parse(body);

      const user = (req as any).user;
      if (!user?.id) {
        return ApiResponse.unauthorized('No autorizado');
      }

      // Verificar que la reserva pertenece al usuario
      const userReservations = await reservationService.getReservationsByUser(
        user.id
      );

      const existingReservation = userReservations.find(r => r.id === reservationId);

      if (!existingReservation) {
        return ApiResponse.notFound('Reserva');
      }

      // Verificar que la reserva se puede modificar
      if (existingReservation.status === 'CANCELLED' || existingReservation.status === 'COMPLETED') {
        return ApiResponse.error('No se puede modificar una reserva cancelada o completada', 400);
      }

      const updatedReservation = await reservationService.updateReservation(
        reservationId,
        validatedData
      );

      return ApiResponse.success({
        message: 'Reserva actualizada exitosamente',
        reservation: updatedReservation,
      });
    } catch (error) {
      console.error('Error actualizando reserva:', error);

      if (error instanceof z.ZodError) {
        return ApiResponse.error('Datos inválidos', 400, error.errors);
      }

      if (error instanceof Error && (error.message.includes('no disponible') || error.message.includes('conflicto')) ) {
        return ApiResponse.error(error.message, 409);
      }

      return ApiResponse.error('Error interno del servidor', 500);
    }
  })(request);
}

/**
 * DELETE /api/reservations/[id]
 * Cancelar una reserva específica
 */
export async function DELETE(
  request: NextRequest
) {
  return withReservationMiddleware(async (req: NextRequest) => {
    try {
      const reservationId = req.nextUrl.pathname.split('/').pop() as string;
      if (!reservationId) {
        return ApiResponse.badRequest('ID de reserva requerido');
      }

      const user = (req as any).user;
      if (!user?.id) {
        return ApiResponse.unauthorized('No autorizado');
      }

      // Verificar que la reserva pertenece al usuario
      const userReservations = await reservationService.getReservationsByUser(
        user.id
      );

      const existingReservation = userReservations.find(r => r.id === reservationId);
      if (!existingReservation) {
        return ApiResponse.notFound('Reserva');
      }

      // Verificar que la reserva se puede cancelar
      if (existingReservation.status === 'CANCELLED') {
        return ApiResponse.error('La reserva ya está cancelada', 400);
      }

      if (existingReservation.status === 'COMPLETED') {
        return ApiResponse.error('No se puede cancelar una reserva completada', 400);
      }

      const cancelledReservation = await reservationService.cancelReservation(
        reservationId,
        user.id
      );

      return ApiResponse.success({
        message: 'Reserva cancelada exitosamente',
        reservation: cancelledReservation,
      });
    } catch (error) {
      console.error('Error cancelando reserva:', error);

      if (error instanceof Error && (error.message.includes('muy tarde') || error.message.includes('no se puede cancelar'))) {
        return ApiResponse.error(error.message, 400);
      }

      return ApiResponse.error('Error interno del servidor', 500);
    }
  })(request);
}