import { NextRequest } from 'next/server';
import { ApiResponse } from '@/lib/middleware';
import { db } from '@repo/db';

// Marca reservas como NO_SHOW cuando superan su endTime sin check-in.
// Seguridad: acepta llamadas del Cron de Vercel (x-vercel-cron) o con ?secret=CRON_SECRET
export async function GET(request: NextRequest) {
  try {
    const isVercelCron = request.headers.get('x-vercel-cron');
    const secret = request.nextUrl.searchParams.get('secret');
    const cronSecret = process.env.CRON_SECRET || '';
    if (!isVercelCron && (!cronSecret || secret !== cronSecret)) {
      return ApiResponse.unauthorized('Cron no autorizado');
    }

    const now = new Date();
    const graceMin = Math.max(0, Number(process.env.NO_SHOW_GRACE_MINUTES || '5'));
    const cutoff = new Date(now.getTime() - graceMin * 60000);

    // Candidatas: terminaron hace al menos `graceMin`, sin check-in, y no canceladas/completadas/en curso
    const candidates = await db.reservation.findMany({
      where: {
        endTime: { lt: cutoff },
        checkInTime: null,
        status: { in: ['PENDING', 'PAID'] as any },
      },
      select: { id: true },
    });

    let updated = 0;
    for (const r of candidates) {
      await db.reservation.update({
        where: { id: r.id },
        data: { status: 'NO_SHOW' as any },
      });
      await db.outboxEvent.create({
        data: {
          eventType: 'RESERVATION_NO_SHOW',
          eventData: { reservationId: r.id, at: now.toISOString() } as any,
        },
      });
      updated += 1;
    }

    return ApiResponse.success({ ok: true, updated });
  } catch (error) {
    console.error('mark-no-shows error:', error);
    return ApiResponse.internalError('Error marcando NO_SHOW');
  }
}

export async function OPTIONS() { return ApiResponse.success(null); }
























