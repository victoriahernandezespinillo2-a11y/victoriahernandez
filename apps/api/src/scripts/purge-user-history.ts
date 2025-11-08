import { db } from '@repo/db';

const TARGET_EMAILS = [
  'cieloyverdad@gmail.com',
  'gabbx.nlfn@gmail.com',
];

type CleanupSummary = {
  email: string;
  userId: string;
  reservationsDeleted: number;
  reservationPaymentsDeleted: number;
  ordersDeleted: number;
  orderPaymentsDeleted: number;
  standalonePaymentsDeleted: number;
  ledgerTransactionsDeleted: number;
  walletEntriesDeleted: number;
  notificationsDeleted: number;
};

async function purgeUserData(email: string): Promise<CleanupSummary | null> {
  const user = await db.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true },
  });

  if (!user) {
    console.warn(`⚠️  Usuario no encontrado para correo ${email}`);
    return null;
  }

  console.log(`🧹 Iniciando limpieza para ${email} (${user.id})`);

  const summary: CleanupSummary = {
    email,
    userId: user.id,
    reservationsDeleted: 0,
    reservationPaymentsDeleted: 0,
    ordersDeleted: 0,
    orderPaymentsDeleted: 0,
    standalonePaymentsDeleted: 0,
    ledgerTransactionsDeleted: 0,
    walletEntriesDeleted: 0,
    notificationsDeleted: 0,
  };

  await db.$transaction(async (tx) => {
    const reservations = await tx.reservation.findMany({
      where: { userId: user.id },
      select: { id: true },
    });
    const reservationIds = reservations.map((r) => r.id);

    if (reservationIds.length > 0) {
      const reservationLedger = await tx.ledgerTransaction.deleteMany({
        where: {
          sourceType: 'RESERVATION',
          sourceId: { in: reservationIds },
        },
      });
      summary.ledgerTransactionsDeleted += reservationLedger.count;

      const reservationPayments = await tx.payment.deleteMany({
        where: {
          referenceType: 'RESERVATION',
          referenceId: { in: reservationIds },
        },
      });
      summary.reservationPaymentsDeleted += reservationPayments.count;

      const deletedReservations = await tx.reservation.deleteMany({
        where: { id: { in: reservationIds } },
      });
      summary.reservationsDeleted += deletedReservations.count;
    }

    const orders = await tx.order.findMany({
      where: { userId: user.id },
      select: { id: true },
    });
    const orderIds = orders.map((o) => o.id);

    if (orderIds.length > 0) {
      const orderLedger = await tx.ledgerTransaction.deleteMany({
        where: {
          sourceType: 'ORDER',
          sourceId: { in: orderIds },
        },
      });
      summary.ledgerTransactionsDeleted += orderLedger.count;

      const orderPayments = await tx.payment.deleteMany({
        where: {
          referenceType: 'ORDER',
          referenceId: { in: orderIds },
        },
      });
      summary.orderPaymentsDeleted += orderPayments.count;

      const deletedOrders = await tx.order.deleteMany({
        where: { id: { in: orderIds } },
      });
      summary.ordersDeleted += deletedOrders.count;
    }

    const wallet = await tx.walletLedger.deleteMany({
      where: { userId: user.id },
    });
    summary.walletEntriesDeleted += wallet.count;

    const standalonePayments = await tx.payment.deleteMany({
      where: {
        userId: user.id,
      },
    });
    summary.standalonePaymentsDeleted += standalonePayments.count;

    const notifications = await tx.notification.deleteMany({
      where: { userId: user.id },
    });
    summary.notificationsDeleted += notifications.count;

    await tx.user.update({
      where: { id: user.id },
      data: { creditsBalance: 0 },
    });
  });

  console.log(`✅ Limpieza completada para ${email}`);
  return summary;
}

async function main() {
  console.log('🚀 Iniciando limpieza de historial de usuarios...');

  const summaries: CleanupSummary[] = [];

  for (const email of TARGET_EMAILS) {
    const summary = await purgeUserData(email);
    if (summary) {
      summaries.push(summary);
    }
  }

  if (summaries.length === 0) {
    console.log('⚠️  No se encontraron usuarios para limpiar.');
    return;
  }

  console.log('📊 Resumen de la operación:');
  for (const item of summaries) {
    console.table({
      email: item.email,
      reservations: item.reservationsDeleted,
      reservationPayments: item.reservationPaymentsDeleted,
      orders: item.ordersDeleted,
      orderPayments: item.orderPaymentsDeleted,
      standalonePayments: item.standalonePaymentsDeleted,
      ledgerTransactions: item.ledgerTransactionsDeleted,
      walletEntries: item.walletEntriesDeleted,
      notifications: item.notificationsDeleted,
    });
  }
}

main()
  .then(() => {
    console.log('🏁 Limpieza finalizada.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error durante la limpieza:', error);
    process.exit(1);
  });



