// Pase de acceso del usuario (con QR)
// Runtime Node.js para compatibilidad con pdfkit
export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { auth } from '@repo/auth';
import { db } from '@repo/db';

export async function GET(request: NextRequest) {
  // 1) Autenticación usuario final
  const session = await auth();
  if (!session?.user?.id) {
    return new Response('No autorizado', { status: 401 });
  }

  // 2) ID de reserva y validación de pertenencia
  const id = request.nextUrl.pathname.split('/').slice(-2, -1)[0];
  if (!id) return new Response('ID requerido', { status: 400 });

  const reservation = await db.reservation.findUnique({
    where: { id },
    include: { user: true, court: { include: { center: true } } },
  });
  if (!reservation || reservation.userId !== session.user.id) {
    return new Response('No autorizado', { status: 401 });
  }

  // 3) Cargas dinámicas de librerías Node
  const { createRequire } = await import('module');
  const require = createRequire(import.meta.url);
  const PDFDocument = require('pdfkit');
  const jwt = (await import('jsonwebtoken')) as unknown as typeof import('jsonwebtoken');
  const QRCode = (await import('qrcode')).default as typeof import('qrcode').default;

  // 4) Construir token de acceso (expira poco después del fin de la reserva)
  const endPlus = new Date(reservation.endTime.getTime() + 60 * 60 * 1000); // +1h
  const expSeconds = Math.floor(endPlus.getTime() / 1000);
  const token = jwt.sign(
    { reservationId: reservation.id, uid: reservation.userId, exp: expSeconds },
    process.env.JWT_SECRET || 'your-secret-key'
  );
  const qrDataUrl = await QRCode.toDataURL(token, { width: 320, margin: 1 });
  const base64 = qrDataUrl.split(',')[1];
  const qrBuffer = Buffer.from(base64, 'base64');

  // 5) Crear PDF tipo “ticket”
  const doc = new PDFDocument({ margin: 36, size: 'A6' }); // tamaño pequeño
  const chunks: any[] = [];
  doc.on('data', (c: any) => chunks.push(c));
  const done = new Promise<Buffer>((resolve) => doc.on('end', () => resolve(Buffer.concat(chunks as any))));

  const center: any = reservation.court.center;
  const title = (center?.name || 'Polideportivo').toString();
  const code = reservation.id.slice(0, 10).toUpperCase();
  const dateStr = reservation.startTime.toLocaleDateString('es-ES');
  const timeStr = reservation.startTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  const durationMin = Math.round((reservation.endTime.getTime() - reservation.startTime.getTime()) / 60000);

  // Encabezado
  doc.font('Helvetica-Bold').fontSize(14).text(title, { align: 'center' });
  doc.moveDown(0.2);
  doc.font('Helvetica').fontSize(9).fillColor('#374151').text('Pase de acceso', { align: 'center' }).fillColor('black');

  // QR centrado
  doc.moveDown(0.6);
  const qrSize = 180;
  const x = (doc.page.width - qrSize) / 2;
  const y = doc.y;
  doc.image(qrBuffer, x, y, { width: qrSize, height: qrSize });
  doc.moveDown(1.2);

  // Datos
  doc.font('Helvetica-Bold').fontSize(10).text(`Reserva ${code}`, { align: 'center' });
  doc.moveDown(0.2);
  doc.font('Helvetica').fontSize(9).text(`${reservation.court.name}`, { align: 'center' });
  doc.text(`${dateStr} • ${timeStr} • ${durationMin} min`, { align: 'center' });
  if (reservation.user?.name) doc.text(`Titular: ${reservation.user.name}`, { align: 'center' });

  // Instrucciones
  doc.moveDown(0.6);
  doc.font('Helvetica').fontSize(8).fillColor('#6b7280');
  doc.text('Presente este QR en el acceso para su verificación.');
  doc.text('El pase es válido hasta 1 hora después de finalizada la reserva.');
  doc.text('No comparta este código.');
  doc.fillColor('black');

  doc.end();
  const buffer = await done;
  return new Response(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename=pase-${code}.pdf`,
    },
  });
}



