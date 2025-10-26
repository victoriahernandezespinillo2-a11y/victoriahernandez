import { db } from '@repo/db';
import { config } from 'dotenv';

// Carga variables de entorno (.env.local, etc.)
config();

async function main() {
  console.log('🔍 [CLEANUP] Buscando reservas PENDING expiradas con paymentMethod NULL o LINK...');

  const now = new Date();

  const targets = await db.reservation.findMany({
    where: {
      status: 'PENDING',
      OR: [
        { paymentMethod: null },
        { paymentMethod: 'LINK' },
      ],
      expiresAt: { lt: now },
    },
    select: { id: true, userId: true, courtId: true, expiresAt: true, paymentMethod: true },
  });

  if (targets.length === 0) {
    console.log('✅ No hay reservas que cancelar.');
    return;
  }

  console.log(`⚠️ Se encontrarón ${targets.length} reservas a cancelar:`);
  targets.forEach((r) => console.log(` - ${r.id} | user ${r.userId} | court ${r.courtId} | expiresAt ${r.expiresAt?.toISOString()}`));

  // Cancela en batch
  await db.reservation.updateMany({
    where: { id: { in: targets.map((r) => r.id) } },
    data: { status: 'CANCELLED', notes: 'Auto-cancelada por script cleanup' },
  });

  console.log('🚀 Limpieza completada.');
}

main()
  .catch((e) => {
    console.error('❌ Error en cleanup:', e);
  })
  .finally(async () => {
    await db.$disconnect();
  });
