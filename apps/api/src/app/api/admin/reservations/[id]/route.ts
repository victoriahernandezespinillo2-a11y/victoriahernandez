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

      // Preparar payload (endTime se deriva de startTime + duration)
      const existing = await db.reservation.findUnique({ where: { id }, select: { startTime: true, endTime: true } });
      if (!existing) return ApiResponse.notFound('Reserva');

      const updateData: any = {};
      // status y notas directos
      if (data.status) updateData.status = data.status;
      if (data.notes !== undefined) updateData.notes = data.notes;

      // calcular start/end
      const existingStart = new Date(existing.startTime as any);
      const existingEnd = new Date(existing.endTime as any);
      const newStart = data.startTime ? new Date(data.startTime) : existingStart;
      const durationMinutes = data.duration ?? Math.max(30, Math.round((existingEnd.getTime() - existingStart.getTime()) / 60000));
      const newEnd = new Date(newStart.getTime() + durationMinutes * 60000);
      if (data.startTime || data.duration !== undefined) {
        updateData.startTime = newStart;
        updateData.endTime = newEnd;
      }

      const updated = await db.reservation.update({ where: { id }, data: updateData });
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























