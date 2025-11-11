import 'dotenv/config';
import { db } from '@repo/db';

async function main() {
  const events = await db.outboxEvent.findMany({
    orderBy: { createdAt: 'desc' },
    take: 15,
  });

  for (const event of events) {
    console.log({
      id: event.id,
      type: event.eventType,
      processed: event.processed,
      createdAt: event.createdAt.toISOString(),
      eventData: event.eventData,
    });
  }

  await db.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
