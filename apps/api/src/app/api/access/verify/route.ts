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
      // Si no hay reservationId, este token no es de una reserva
      return new Response(JSON.stringify({ ok: false, error: 'Token no válido para reserva' }), { status: 400 });
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

    // Verificar si la reserva ya fue utilizada
    const alreadyUsed = reservation.status === 'IN_PROGRESS' || reservation.status === 'COMPLETED';
    
    if (withinWindow && !alreadyUsed && reservation.status === 'PAID') {
      // Actualizar estado a IN_PROGRESS cuando se escanea por primera vez
      try {
        await db.reservation.update({
          where: { id: reservationId },
          data: { 
            status: 'IN_PROGRESS',
            checkInTime: new Date()
          }
        });
        
        // Actualizar la reserva local para la respuesta
        reservation.status = 'IN_PROGRESS';
        reservation.checkInTime = new Date();
      } catch (updateError) {
        console.error('Error actualizando estado de reserva:', updateError);
        // Continuar con la respuesta aunque falle la actualización
      }
    }

    return new Response(
      JSON.stringify({
        ok: withinWindow && !alreadyUsed,
        reservation: (withinWindow && !alreadyUsed)
          ? {
              id: reservation.id,
              user: { id: reservation.userId, name: reservation.user?.name, email: reservation.user?.email },
              court: { id: reservation.courtId, name: reservation.court.name, center: reservation.court.center.name },
              startTime: reservation.startTime,
              endTime: reservation.endTime,
              status: reservation.status,
            }
          : undefined,
        error: alreadyUsed 
          ? 'Esta reserva ya fue utilizada' 
          : withinWindow 
            ? undefined 
            : 'Fuera de ventana horaria',
      }),
      { 
        status: (withinWindow && !alreadyUsed) ? 200 : 403, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: 'Error interno' }), { status: 500 });
  }
}



