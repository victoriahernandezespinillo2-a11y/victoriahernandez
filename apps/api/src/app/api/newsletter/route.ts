import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { emailService } from '@repo/notifications/src/email';
import type { Prisma } from '@prisma/client';

// GET /api/newsletter?search=&page=&limit=
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const skip = (page - 1) * limit;

  const where: Prisma.NewsletterSubscriberWhereInput = search
    ? { email: { contains: search, mode: 'insensitive' as Prisma.QueryMode } }
    : {};

  const [items, total] = await Promise.all([
    prisma.newsletterSubscriber.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
    prisma.newsletterSubscriber.count({ where }),
  ]);

  return NextResponse.json({ items, pagination: { page, limit, total } });
}

// POST /api/newsletter/send { subject, html, recipients? }
export async function POST(request: NextRequest) {
  try {
    const { subject, html, recipients } = await request.json();
    if (!subject || !html) return NextResponse.json({ error: 'Faltan campos' }, { status: 400 });

    const targets = recipients && recipients.length > 0
      ? recipients
      : (await prisma.newsletterSubscriber.findMany({ where: { status: 'subscribed' }, select: { email: true } })).map(s => s.email);

    const result = await emailService.sendBulkEmail({ recipients: targets, subject, html });
    return NextResponse.json(result);
  } catch (e) {
    console.error('newsletter send error', e);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}



