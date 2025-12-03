import { db } from '../src';

async function checkSettings() {
  const center = await db.center.findFirst({
    select: { id: true, name: true, settings: true }
  });
  const s = center?.settings as any;
  console.log('business.cancellationHours:', s?.business?.cancellationHours);
  console.log('payments.refundPolicy:', s?.payments?.refundPolicy);
  console.log('payments.refundDeadlineHours:', s?.payments?.refundDeadlineHours);
  console.log('Settings completo:', JSON.stringify(s, null, 2));
  await db.$disconnect();
}

checkSettings();

