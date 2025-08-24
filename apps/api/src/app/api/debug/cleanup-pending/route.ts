import { NextRequest, NextResponse } from 'next/server';
import { db } from '@repo/db';

/**
 * GET /api/debug/cleanup-pending
 * Devuelve un resumen de reservas PENDING expiradas que serían limpiadas
 */
export async function GET(_req: NextRequest) {
  try {
    const now = new Date();
    const expired = await db.reservation.findMany({
      where: {
        status: 'PENDING',
        expiresAt: { lt: now },
      },
      select: { id: true, createdAt: true, expiresAt: true },
      take: 100,
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({
      success: true,
      count: expired.length,
      sample: expired,
      timestamp: now.toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: { message: error?.message, name: error?.name },
    }, { status: 500 });
  }
}

/**
 * POST /api/debug/cleanup-pending
 * Ejecuta manualmente la limpieza de reservas PENDING expiradas
 */
export async function POST(_req: NextRequest) {
  const now = new Date();
  try {
    const expired = await db.reservation.findMany({
      where: {
        status: 'PENDING',
        expiresAt: { lt: now },
      },
      select: { id: true },
    });

    if (expired.length === 0) {
      return NextResponse.json({ success: true, cleaned: 0, message: 'No hay reservas expiradas.' });
    }

    await db.$transaction(async (tx) => {
      for (const r of expired) {
        await tx.reservation.update({
          where: { id: r.id },
          data: { status: 'CANCELLED', notes: 'Auto-cancelada por timeout (cleanup manual)' },
        });

        await tx.outboxEvent.create({
          data: {
            eventType: 'RESERVATION_EXPIRED',
            eventData: { reservationId: r.id, expiredAt: now.toISOString(), source: 'debug_route' },
          },
        });
      }
    });

    return NextResponse.json({ success: true, cleaned: expired.length });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: { message: error?.message, name: error?.name },
    }, { status: 500 });
  }
}