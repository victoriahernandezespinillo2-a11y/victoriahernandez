import { db } from '../index.js';
import type { Prisma } from '@prisma/client';

type ArgMap = Record<string, string | boolean | undefined>;

function parseArgs(): ArgMap {
  const out: ArgMap = {};
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    const a = args[i]!; // non-null assertion safe due to loop bound
    if (a.startsWith('--')) {
      const key = a.replace(/^--/, '');
      const next = args[i + 1];
      if (!next || next.startsWith('--')) {
        out[key] = true;
      } else {
        out[key] = next;
        i++;
      }
    }
  }
  return out;
}

async function main() {
  const args = parseArgs();
  const from = typeof args.from === 'string' ? new Date(args.from) : undefined;
  const to = typeof args.to === 'string' ? new Date(args.to) : undefined;
  const centerId = typeof args.center === 'string' ? args.center : undefined;
  const courtId = typeof args.court === 'string' ? args.court : undefined;
  const limit = typeof args.limit === 'string' ? Math.max(1, parseInt(args.limit)) : 500;
  const statuses = typeof args.status === 'string'
    ? args.status.split(/[ ,]+/).map((s) => s.trim().toUpperCase()).filter(Boolean)
    : ['PAID'];

  const where: any = {
    status: { in: statuses },
  };

  if (from || to) {
    (where as any).createdAt = {} as any;
    if (from) (where as any).createdAt.gte = from;
    if (to) (where as any).createdAt.lte = to;
  }
  if (centerId) where.court = { centerId } as any;
  if (courtId) where.courtId = courtId;

  const rows = await db.reservation.findMany({
    where,
    take: limit,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      status: true,
      totalPrice: true,
      createdAt: true,
      startTime: true,
      endTime: true,
      user: { select: { id: true, email: true, name: true } },
      court: { select: { id: true, name: true, centerId: true } },
    },
  });

  type Row = {
    id: string;
    status: string;
    totalPrice: Prisma.Decimal | null;
    createdAt: Date;
    startTime: Date;
    endTime: Date;
    user: { id: string; email: string | null; name: string | null };
    court: { id: string; name: string | null; centerId: string };
  };
  const totalEUR = rows.reduce((sum: number, r: any) => sum + Number(r.totalPrice ?? 0), 0);

  const result = {
    filter: {
      statuses,
      from: from?.toISOString(),
      to: to?.toISOString(),
      centerId,
      courtId,
      limit,
    },
    count: rows.length,
    totalEUR,
    reservations: rows,
  };

  const pretty = !!args.pretty || !!args.p;
  console.log(JSON.stringify(result, null, pretty ? 2 : 0));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


