import { db } from '@repo/db';
import { config } from 'dotenv';
config();

const TARGET_EMAILS = ['alheco78@gmail.com', 'piratasoft@gmail.com'];

async function main() {
  console.log('🔍 Inspeccionando reservas PENDING de:', TARGET_EMAILS.join(', '));

  const reservations = await db.reservation.findMany({
    where: {
      status: 'PENDING',
      user: { email: { in: TARGET_EMAILS } },
    },
    select: {
      id: true,
      createdAt: true,
      startTime: true,
      endTime: true,
      expiresAt: true,
      paymentMethod: true,
      paymentStatus: true,
      totalPrice: true,
      user: { select: { email: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  if (reservations.length === 0) {
    console.log('✅ No se encontraron reservas PENDING para esos usuarios.');
    await db.$disconnect();
    return;
  }

  console.table(
    reservations.map((r) => ({
      id: r.id,
      email: r.user.email,
      created: r.createdAt.toISOString(),
      start: r.startTime.toISOString(),
      expires: r.expiresAt ? r.expiresAt.toISOString() : null,
      payMethod: r.paymentMethod,
      payStatus: r.paymentStatus,
      total: r.totalPrice,
    }))
  );

  const ids = reservations.map((r) => r.id);
  const events = await db.outboxEvent.findMany({
    where: {
      eventData: { path: ['reservationId'], in: ids } as any,
    },
    select: { createdAt: true, eventType: true, eventData: true },
    orderBy: { createdAt: 'asc' },
  });

  console.log('\nEventos de auditoría asociados:\n');
  events.forEach((e) =>
    console.log(
      `${e.createdAt.toISOString()} | ${e.eventType} | res ${(e.eventData as any).reservationId}`
    )
  );

  await db.$disconnect();
}

main().catch((e) => {
  console.error('❌ Error ejecutando script:', e);
  db.$disconnect();
  process.exit(1);
});
