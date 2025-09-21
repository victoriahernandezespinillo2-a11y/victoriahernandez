import { NextRequest } from 'next/server';
import { ApiResponse } from '@/lib/middleware';
import { db } from '@repo/db';
import { ledgerService } from '@/lib/services/ledger.service';

export const runtime = 'nodejs';

function isAuthorized(request: NextRequest): boolean {
  const url = new URL(request.url);
  const headerSecret = request.headers.get('x-cron-secret') || '';
  const querySecret = url.searchParams.get('key') || '';
  const secret = process.env.CRON_SECRET || '';
  if (!secret) {
    // En desarrollo, si no hay CRON_SECRET configurado, permitir
    return process.env.NODE_ENV !== 'production';
  }
  return headerSecret === secret || querySecret === secret;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return ApiResponse.unauthorized('Cron no autorizado');
  }

  try {
    const { searchParams } = new URL(request.url);
    const daysParam = Number(searchParams.get('days') || '2');
    const days = Number.isFinite(daysParam) ? Math.min(Math.max(1, Math.floor(daysParam)), 30) : 2;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const summary = {
      reservations: { created: 0, skipped: 0, total: 0 },
      orders: { created: 0, skipped: 0, total: 0 },
      refunds: { created: 0, skipped: 0, total: 0 },
    } as any;

    // --- Reconciliar RESERVATIONS pagadas sin asiento en ledger ---
    const reservations = await db.reservation.findMany({
      where: {
        OR: [
          { status: 'PAID' as any },
          { paymentMethod: { not: null } as any },
        ],
        updatedAt: { gte: since },
      },
      select: { id: true, totalPrice: true, paymentMethod: true, paidAt: true, createdAt: true },
    });
    summary.reservations.total = reservations.length;
    for (const r of reservations) {
      const exists = await (db as any).ledgerTransaction.findFirst({ where: { sourceType: 'RESERVATION', sourceId: r.id, direction: 'CREDIT' } });
      if (exists) { summary.reservations.skipped++; continue; }
      try {
        await ledgerService.recordPayment({
          paymentStatus: 'PAID',
          sourceType: 'RESERVATION',
          sourceId: r.id,
          direction: 'CREDIT',
          amountEuro: Number(r.totalPrice || 0),
          currency: 'EUR',
          method: ((r as any).paymentMethod || 'OTHER') as any,
          paidAt: r.paidAt || r.createdAt,
          idempotencyKey: `RECON:RES:${r.id}`,
          metadata: { recon: true, days },
        });
        summary.reservations.created++;
      } catch (e) {
        // Continuar
      }
    }

    // --- Reconciliar ORDERS pagadas sin asiento en ledger ---
    const orders = await (db as any).order.findMany({
      where: { status: 'PAID', updatedAt: { gte: since } },
      select: { id: true, totalEuro: true, paymentMethod: true, paidAt: true, createdAt: true },
    });
    summary.orders.total = orders.length;
    for (const o of orders) {
      const exists = await (db as any).ledgerTransaction.findFirst({ where: { sourceType: 'ORDER', sourceId: o.id, direction: 'CREDIT' } });
      if (exists) { summary.orders.skipped++; continue; }
      try {
        await ledgerService.recordPayment({
          paymentStatus: 'PAID',
          sourceType: 'ORDER',
          sourceId: o.id,
          direction: 'CREDIT',
          amountEuro: Number(o.totalEuro || 0),
          currency: 'EUR',
          method: ((o as any).paymentMethod || 'OTHER') as any,
          paidAt: (o as any).paidAt || o.createdAt,
          idempotencyKey: `RECON:ORD:${o.id}`,
          metadata: { recon: true, days },
        });
        summary.orders.created++;
      } catch (e) {
        // Continuar
      }
    }

    // --- Reconciliar REFUNDS de reservas desde outbox sin asiento en ledger ---
    const refundedEvents = await (db as any).outboxEvent.findMany({
      where: { eventType: 'RESERVATION_REFUNDED', createdAt: { gte: since } },
      select: { eventData: true },
    }).catch(() => []);
    summary.refunds.total = refundedEvents.length;
    for (const ev of refundedEvents) {
      const rid = ev?.eventData?.reservationId as string | undefined;
      const amount = Number(ev?.eventData?.amount || 0);
      const refundId = ev?.eventData?.refundId as string | undefined;
      if (!rid || !(amount > 0)) { summary.refunds.skipped++; continue; }
      const exists = await (db as any).ledgerTransaction.findFirst({ where: { sourceType: 'RESERVATION', sourceId: rid, direction: 'DEBIT' } });
      if (exists) { summary.refunds.skipped++; continue; }
      try {
        await ledgerService.recordRefund({
          sourceType: 'RESERVATION',
          sourceId: rid,
          amountEuro: amount,
          currency: 'EUR',
          method: 'CARD',
          paidAt: new Date(),
          idempotencyKey: `RECON:REFUND:RES:${rid}:${refundId || 'no-ref'}`,
          gatewayRef: refundId,
          metadata: { recon: true, days },
        });
        summary.refunds.created++;
      } catch (e) {
        // Continuar
      }
    }

    return ApiResponse.success({ ok: true, since, summary });
  } catch (error) {
    console.error('Error en cron reconcile:', error);
    return ApiResponse.internalError('Error en conciliación');
  }
}

export async function OPTIONS() {
  return ApiResponse.success(null);
}


