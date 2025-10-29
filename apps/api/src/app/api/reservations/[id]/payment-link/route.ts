import { NextRequest, NextResponse } from 'next/server';
import { db } from '@repo/db';
import { withReservationMiddleware, ApiResponse } from '@/lib/middleware';

export async function POST(request: NextRequest) {
  return withReservationMiddleware(async (req) => {
    try {
      const id = req.nextUrl.pathname.split('/').slice(-2, -1)[0];
      if (!id) return ApiResponse.badRequest('ID requerido');

      const user = (req as any).user;
      if (!user?.id) return ApiResponse.unauthorized('No autorizado');

      const reservation = await db.reservation.findUnique({ where: { id }, include: { user: true, court: true } });
      if (!reservation || reservation.userId !== user.id) {
        return ApiResponse.unauthorized('No autorizado');
      }

      // Generar URL de redirección a Redsys (pasarela vigente)
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';
      const redirectUrl = `${apiUrl}/api/payments/redsys/redirect?rid=${encodeURIComponent(id)}`;
      // Responder en formato plano esperado por el frontend
      return NextResponse.json({ url: redirectUrl }, { status: 200 });
    } catch (e) {
      console.error('Error generando payment-link:', e);
      return ApiResponse.error('Error interno del servidor', 500);
    }
  })(request);
}




