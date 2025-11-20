/**
 * API Admin: Gestión de una reserva específica
 * - GET /api/admin/reservations/[id]
 * - PUT /api/admin/reservations/[id]
 * - DELETE /api/admin/reservations/[id]
 */

import { NextRequest } from 'next/server';
import { withAdminReservationsMiddleware, ApiResponse } from '@/lib/middleware';
import { db } from '@repo/db';
import { z } from 'zod';
import { reservationService } from '@/lib/services/reservation.service';
import { 
  UpdateReservationSchema, 
  validateAndMapReservationStatus 
} from '@/lib/validators/reservation.validator';

export async function GET(request: NextRequest) {
  return withAdminReservationsMiddleware(async (req) => {
    try {
      const id = req.nextUrl.pathname.split('/').pop() as string;
      if (!id) return ApiResponse.badRequest('ID requerido');

      const reservation = await db.reservation.findUnique({
        where: { id },
        include: {
          user: { select: { id: true, name: true, email: true } },
          court: { select: { id: true, name: true, center: { select: { id: true, name: true } } } },
        },
      });
      if (!reservation) return ApiResponse.notFound('Reserva');

      return ApiResponse.success(reservation);
    } catch (error) {
      console.error('Admin GET reservation error:', error);
      return ApiResponse.internalError('Error interno del servidor');
    }
  })(request);
}

export async function PUT(request: NextRequest) {
  return withAdminReservationsMiddleware(async (req) => {
    try {
      const id = req.nextUrl.pathname.split('/').pop() as string;
      if (!id) return ApiResponse.badRequest('ID requerido');
      
      const body = await req.json();
      
      // Validar y mapear estado si es necesario
      if (body.status) {
        const statusValidation = validateAndMapReservationStatus(body.status);
        if (!statusValidation.isValid) {
          return ApiResponse.badRequest(statusValidation.error!);
        }
        // Usar el estado mapeado si es necesario
        if (statusValidation.mappedStatus) {
          body.status = statusValidation.mappedStatus;
        }
      }
      
      const data = UpdateReservationSchema.parse(body);

      // Usar el servicio de reservas que SÍ verifica disponibilidad
      // El servicio verifica: cancha activa, conflictos con otras reservas, mantenimientos
      const updated = await reservationService.updateReservation(id, {
        ...data,
        // El servicio espera startTime como ISO string si se proporciona
        startTime: data.startTime ? data.startTime : undefined,
        duration: data.duration,
        status: data.status,
        notes: data.notes,
      });

      return ApiResponse.success(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return ApiResponse.validation(
          error.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
        );
      }
      console.error('Admin PUT reservation error:', error);
      return ApiResponse.internalError('Error interno del servidor');
    }
  })(request);
}

export async function DELETE(request: NextRequest) {
  return withAdminReservationsMiddleware(async (req) => {
    try {
      const id = req.nextUrl.pathname.split('/').pop() as string;
      if (!id) return ApiResponse.badRequest('ID requerido');

      // En entornos reales se prefiere cancelar en lugar de borrar
      const cancelled = await db.reservation.update({
        where: { id },
        data: { status: 'CANCELLED' },
      });
      return ApiResponse.success({ id: cancelled.id, status: cancelled.status });
    } catch (error) {
      console.error('Admin DELETE reservation error:', error);
      return ApiResponse.internalError('Error interno del servidor');
    }
  })(request);
}

export async function OPTIONS() {
  return ApiResponse.success(null);
}























