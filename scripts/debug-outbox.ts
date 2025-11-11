import 'dotenv/config';
import { db } from '@repo/db';

async function main() {
  const events = await db.outboxEvent.findMany({
    where: {
      eventType: { in: ['PAYMENT_PENDING_REMINDER', 'PAYMENT_PENDING_REMINDER_SENT'] },
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  console.log(`Eventos: ${events.length}`);
  for (const event of events) {
    console.log({
      id: event.id,
      type: event.eventType,
      processed: event.processed,
      processedAt: event.processedAt,
      createdAt: event.createdAt,
      data: event.eventData,
    });
  }

  await db.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
