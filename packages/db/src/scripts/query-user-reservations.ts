import { db } from '../index';

async function main() {
  const args = process.argv.slice(2);
  const emailArgIndex = args.findIndex((a) => a === '--email');
  const idArgIndex = args.findIndex((a) => a === '--id');
  const email = emailArgIndex >= 0 ? args[emailArgIndex + 1] : undefined;
  const userId = idArgIndex >= 0 ? args[idArgIndex + 1] : undefined;

  if (!email && !userId) {
    console.error('Uso: tsx src/scripts/query-user-reservations.ts --email <email> | --id <userId>');
    process.exit(1);
  }

  const user = userId
    ? await db.user.findUnique({ where: { id: userId } })
    : await db.user.findUnique({ where: { email: email! } });

  if (!user) {
    console.log(JSON.stringify({ userId: null, count: 0, reservations: [] }));
    process.exit(0);
  }

  const reservations = await db.reservation.findMany({
    where: { userId: user.id },
    orderBy: { startTime: 'asc' },
    select: {
      id: true,
      courtId: true,
      startTime: true,
      endTime: true,
      status: true,
      totalPrice: true,
      createdAt: true,
    },
  });

  console.log(
    JSON.stringify(
      {
        userId: user.id,
        email: user.email,
        count: reservations.length,
        reservations,
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


