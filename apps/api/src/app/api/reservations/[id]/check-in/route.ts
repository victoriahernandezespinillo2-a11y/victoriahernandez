import { NextRequest } from 'next/server';
import { withAdminMiddleware, ApiResponse } from '@/lib/middleware';
import { db } from '@repo/db';
import jwt from 'jsonwebtoken';

export async function POST(request: NextRequest) {
  return withAdminMiddleware(async (req) => {
    try {
      const id = req.nextUrl.pathname.split('/').slice(-3, -2)[0];
      if (!id) return ApiResponse.badRequest('ID requerido');
      const { token } = await req.json();
      if (!token) return ApiResponse.badRequest('Token requerido');

      const secret = process.env.JWT_SECRET || 'your-secret-key';
      let payload: any;
      try {
        payload = jwt.verify(token, secret);
      } catch {
        return ApiResponse.unauthorized('Token inválido');
      }

      if (payload?.reservationId !== id) {
        return ApiResponse.unauthorized('Token no corresponde');
      }

      const reservation = await db.reservation.findUnique({ where: { id } });
      if (!reservation) return ApiResponse.notFound('Reserva');

      const now = new Date();
      const start = new Date(reservation.startTime);
      const toleranceMin = 30;
      const earliest = new Date(start.getTime() - toleranceMin * 60000);
      const latest = new Date(start.getTime() + toleranceMin * 60000);
      if (now < earliest || now > latest) {
        return ApiResponse.forbidden('Fuera de ventana de check-in');
      }

      const updated = await db.reservation.update({
        where: { id },
        data: { status: 'IN_PROGRESS', checkInTime: new Date() },
      });
      return ApiResponse.success(updated);
    } catch (e) {
      return ApiResponse.internalError('Error interno del servidor');
    }
  })(request, {} as any);
}

export async function OPTIONS() { return ApiResponse.success(null); }




