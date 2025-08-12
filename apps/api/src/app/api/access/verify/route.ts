// Verificación de acceso por QR
export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { db } from '@repo/db';

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token');
    if (!token) return new Response(JSON.stringify({ ok: false, error: 'Token requerido' }), { status: 400 });

    const jwt = (await import('jsonwebtoken')) as unknown as typeof import('jsonwebtoken');
    let payload: any;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    } catch {
      return new Response(JSON.stringify({ ok: false, error: 'Token inválido o expirado' }), { status: 401 });
    }

    const reservationId = String(payload?.reservationId || '');
    if (!reservationId) {
      return new Response(JSON.stringify({ ok: false, error: 'Token sin datos de reserva' }), { status: 400 });
    }

    const reservation = await db.reservation.findUnique({
      where: { id: reservationId },
      include: { user: true, court: { include: { center: true } } },
    });
    if (!reservation) return new Response(JSON.stringify({ ok: false, error: 'Reserva no encontrada' }), { status: 404 });

    const now = new Date();
    const validFrom = new Date(reservation.startTime.getTime() - 2 * 60 * 60 * 1000); // 2h antes
    const validUntil = new Date(reservation.endTime.getTime() + 2 * 60 * 60 * 1000); // 2h después
    const withinWindow = now >= validFrom && now <= validUntil;

    return new Response(
      JSON.stringify({
        ok: withinWindow,
        reservation: withinWindow
          ? {
              id: reservation.id,
              user: { id: reservation.userId, name: reservation.user?.name, email: reservation.user?.email },
              court: { id: reservation.courtId, name: reservation.court.name, center: reservation.court.center.name },
              startTime: reservation.startTime,
              endTime: reservation.endTime,
            }
          : undefined,
        error: withinWindow ? undefined : 'Fuera de ventana horaria',
      }),
      { status: withinWindow ? 200 : 403, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: 'Error interno' }), { status: 500 });
  }
}



