import { db } from '@repo/db';
import { ledgerService } from '../lib/services/ledger.service';

async function backfillReservations() {
  const paidReservations = await (db as any).reservation.findMany({
    where: {
      OR: [
        { status: 'PAID' },
        { paymentMethod: { not: null } },
      ],
    },
    select: { id: true, totalPrice: true, paidAt: true, createdAt: true, paymentMethod: true },
  });

  let created = 0; let skipped = 0;
  for (const r of paidReservations) {
    try {
      await (db as any).ledgerTransaction.findFirstOrThrow({ where: { sourceType: 'RESERVATION', sourceId: r.id } });
      skipped++;
    } catch {
      try {
        await ledgerService.recordPayment({
          paymentStatus: 'PAID',
          sourceType: 'RESERVATION',
          sourceId: r.id,
          direction: 'CREDIT',
          amountEuro: Number(r.totalPrice || 0),
          currency: 'EUR',
          method: (r.paymentMethod || 'OTHER') as any,
          paidAt: r.paidAt || r.createdAt,
          idempotencyKey: `LEGACY:RES:${r.id}`,
          metadata: { backfill: true },
        });
        created++;
      } catch (e) {
        console.warn('Failed to backfill reservation ledger:', r.id, e);
      }
    }
  }
  return { created, skipped, total: paidReservations.length };
}

async function backfillOrders() {
  const paidOrders = await (db as any).order.findMany({
    where: { status: 'PAID' },
    select: { id: true, totalEuro: true, paidAt: true, createdAt: true, paymentMethod: true },
  });
  let created = 0; let skipped = 0;
  for (const o of paidOrders) {
    try {
      await (db as any).ledgerTransaction.findFirstOrThrow({ where: { sourceType: 'ORDER', sourceId: o.id } });
      skipped++;
    } catch {
      try {
        await ledgerService.recordPayment({
          paymentStatus: 'PAID',
          sourceType: 'ORDER',
          sourceId: o.id,
          direction: 'CREDIT',
          amountEuro: Number(o.totalEuro || 0),
          currency: 'EUR',
          method: (o.paymentMethod || 'OTHER') as any,
          paidAt: o.paidAt || o.createdAt,
          idempotencyKey: `LEGACY:ORD:${o.id}`,
          metadata: { backfill: true },
        });
        created++;
      } catch (e) {
        console.warn('Failed to backfill order ledger:', o.id, e);
      }
    }
  }
  return { created, skipped, total: paidOrders.length };
}

async function main() {
  console.log('Starting Ledger backfill...');
  const res = await backfillReservations();
  const ord = await backfillOrders();
  console.log('Ledger backfill completed:', { reservations: res, orders: ord });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


