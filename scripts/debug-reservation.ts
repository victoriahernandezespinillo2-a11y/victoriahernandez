import 'dotenv/config';
import { db } from '@repo/db';

async function main() {
  const reservations = await db.reservation.findMany({
    select: {
      id: true,
      status: true,
      paymentStatus: true,
      paymentMethod: true,
      updatedAt: true,
      user: { select: { email: true } },
    },
    orderBy: { updatedAt: 'desc' },
    take: 5,
  });

  console.table(
    reservations.map((r) => ({
      id: r.id,
      status: r.status,
      paymentStatus: r.paymentStatus,
      paymentMethod: r.paymentMethod,
      updatedAt: r.updatedAt.toISOString(),
      email: r.user?.email,
    })),
  );

  await db.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});



