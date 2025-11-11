import 'dotenv/config';
import { db } from '@repo/db';

async function listReservations(userId: string) {
  const reservations = await db.reservation.findMany({
    where: { userId },
    select: {
      id: true,
      status: true,
      paymentMethod: true,
      paymentStatus: true,
      startTime: true,
      endTime: true,
      createdAt: true,
      expiresAt: true,
      notes: true,
    },
    orderBy: { startTime: 'asc' },
  });

  if (reservations.length === 0) {
    console.log('ℹ️ El usuario no tiene reservas registradas.');
    return [];
  }

  reservations.forEach((r) => {
    console.log(`   - Reserva ${r.id}`);
    console.log(`     estado=${r.status} pago=${r.paymentStatus} método=${r.paymentMethod}`);
    console.log(`     inicio=${r.startTime.toISOString()} fin=${r.endTime.toISOString()}`);
    console.log(`     creada=${r.createdAt.toISOString()} expira=${r.expiresAt?.toISOString() ?? 'null'}`);
    if (r.notes) console.log(`     notas=${r.notes}`);
  });

  return reservations;
}

async function main() {
  const emailArg = process.argv[2];
  const flag = process.argv[3];
  const email = emailArg?.toLowerCase();

  if (!email) {
    console.error('Uso: pnpm exec tsx scripts/delete-user-reservations.ts <email> [--delete]');
    process.exit(1);
  }

  const shouldDelete = flag === '--delete';

  console.log(`🔍 Buscando usuario con email ${email}...`);
  const user = await db.user.findUnique({ where: { email } });

  if (!user) {
    console.error('❌ Usuario no encontrado.');
    process.exit(1);
  }

  console.log(`👤 Usuario encontrado (ID: ${user.id}). Listando reservas asociadas...`);
  const reservations = await listReservations(user.id);

  if (shouldDelete && reservations.length > 0) {
    console.log('🗑️ Eliminando reservas...');
    const result = await db.reservation.deleteMany({ where: { userId: user.id } });
    console.log(`✅ Reservas eliminadas: ${result.count}`);
  } else if (!shouldDelete) {
    console.log('ℹ️ Modo lectura: No se eliminarán reservas. Usa --delete para borrarlas.');
  }
}

main()
  .catch((error) => {
    console.error('❌ Error ejecutando script:', error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
