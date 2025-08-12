/**
 * API Admin: Gestión de una reserva específica
 * - GET /api/admin/reservations/[id]
 * - PUT /api/admin/reservations/[id]
 * - DELETE /api/admin/reservations/[id]
 */

import { NextRequest } from 'next/server';
import { withAdminMiddleware, ApiResponse } from '@/lib/middleware';
import { db } from '@repo/db';
import { z } from 'zod';

const UpdateReservationSchema = z.object({
  status: z.enum(['PENDING','PAID','IN_PROGRESS','COMPLETED','CANCELLED','NO_SHOW']).optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  notes: z.string().optional(),
});

export async function GET(request: NextRequest) {
  return withAdminMiddleware(async (req) => {
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
  })(request, {} as any);
}

export async function PUT(request: NextRequest) {
  return withAdminMiddleware(async (req) => {
    try {
      const id = req.nextUrl.pathname.split('/').pop() as string;
      if (!id) return ApiResponse.badRequest('ID requerido');
      const body = await req.json();
      const data = UpdateReservationSchema.parse(body);

      // Preparar payload
      const updateData: any = {};
      if (data.status) updateData.status = data.status;
      if (data.startTime) updateData.startTime = new Date(data.startTime);
      if (data.endTime) updateData.endTime = new Date(data.endTime);
      if (data.notes !== undefined) updateData.notes = data.notes;

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
  })(request, {} as any);
}

export async function DELETE(request: NextRequest) {
  return withAdminMiddleware(async (req) => {
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
  })(request, {} as any);
}

export async function OPTIONS() {
  return ApiResponse.success(null);
}




