import 'dotenv/config';
import { db } from '@repo/db';

async function main() {
  const timeoutMinutes = parseInt(process.env.PENDING_RESERVATION_TIMEOUT_MINUTES || '5', 10);
  const now = new Date();
  const cutoffTime = new Date(now.getTime() - timeoutMinutes * 60 * 1000);

  const expired = await db.reservation.findMany({
    where: {
      status: 'PENDING',
      NOT: {
        paymentMethod: {
          in: ['PENDING', 'COURTESY', 'TRANSFER', 'ONSITE'],
        },
      },
      OR: [
        {
          AND: [
            { expiresAt: { not: null } },
            { expiresAt: { lt: now } },
          ],
        },
        {
          AND: [
            { expiresAt: null },
            { createdAt: { lt: cutoffTime } },
          ],
        },
      ],
    },
    select: {
      id: true,
      paymentMethod: true,
      createdAt: true,
      expiresAt: true,
      notes: true,
    },
  });

  console.log('Expired reservations candidates:', expired.length);
  for (const reservation of expired) {
    console.log({
      id: reservation.id,
      method: reservation.paymentMethod,
      createdAt: reservation.createdAt.toISOString(),
      expiresAt: reservation.expiresAt?.toISOString() ?? null,
      notes: reservation.notes,
    });
  }

  await db.$disconnect();
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});



