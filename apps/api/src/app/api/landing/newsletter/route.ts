import { NextRequest, NextResponse } from 'next/server';
import { emailService } from '@repo/notifications/src/email';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Email inválido' }, { status: 400 });
    }

    // Guardar suscriptor (idempotente)
    await prisma.newsletterSubscriber.upsert({
      where: { email },
      update: { status: 'subscribed', unsubscribedAt: null },
      create: { email, status: 'subscribed', source: 'web' },
    });

    // Enviar email de bienvenida opcional
    await emailService.sendEmail({
      to: email,
      subject: '¡Gracias por suscribirte! – Polideportivo',
      html: '<p>Te has suscrito correctamente a nuestro boletín. ¡Pronto recibirás novedades!</p>',
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('Newsletter subscribe error:', e);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}


