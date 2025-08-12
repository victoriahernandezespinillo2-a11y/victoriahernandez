import { NextRequest } from 'next/server';
import { withAdminMiddleware, ApiResponse } from '@/lib/middleware';
import { db } from '@repo/db';

export async function POST(request: NextRequest) {
  return withAdminMiddleware(async (req) => {
    try {
      const id = req.nextUrl.pathname.split('/').slice(-3, -2)[0];
      if (!id) return ApiResponse.badRequest('ID requerido');

      const reservation = await db.reservation.findUnique({ where: { id } });
      if (!reservation) return ApiResponse.notFound('Reserva');

      const updated = await db.reservation.update({
        where: { id },
        data: { status: 'COMPLETED', checkOutTime: new Date() },
      });
      return ApiResponse.success(updated);
    } catch (e) {
      return ApiResponse.internalError('Error interno del servidor');
    }
  })(request, {} as any);
}

export async function OPTIONS() { return ApiResponse.success(null); }




