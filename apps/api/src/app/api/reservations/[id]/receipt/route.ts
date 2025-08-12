import { NextRequest } from 'next/server';
import { auth } from '@repo/auth';
import { db } from '@repo/db';
import PDFDocument from 'pdfkit';

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response('No autorizado', { status: 401 });
  }
  const id = request.nextUrl.pathname.split('/').slice(-2, -1)[0];
  if (!id) return new Response('ID requerido', { status: 400 });
  const reservation = await db.reservation.findUnique({ where: { id }, include: { user: true, court: { include: { center: true } } } });
  if (!reservation || reservation.userId !== session.user.id) {
    return new Response('No autorizado', { status: 401 });
  }

  const doc = new PDFDocument({ margin: 50 });
  const chunks: any[] = [];
  doc.on('data', (c) => chunks.push(c));
  const done = new Promise<Buffer>((resolve) => doc.on('end', () => resolve(Buffer.concat(chunks as any))));

  // Configuración dinámica del centro
  const centerSettings: any = (reservation.court.center as any).settings || {};
  const receiptCfg: any = centerSettings.receipt || {};
  const legalName: string | undefined = receiptCfg.legalName || centerSettings.legalName;
  const taxId: string | undefined = receiptCfg.taxId || centerSettings.taxId;
  const fiscalAddress: string | undefined = receiptCfg.fiscalAddress || centerSettings.fiscalAddress;
  const contactEmail: string | undefined = receiptCfg.contactEmail || reservation.court.center.email || centerSettings.contactEmail;
  const contactPhone: string | undefined = receiptCfg.contactPhone || reservation.court.center.phone || centerSettings.contactPhone;
  const footerNotes: string | undefined = receiptCfg.footerNotes;

  doc.fontSize(16).text(legalName || 'Recibo de Reserva', { align: 'center' });
  if (taxId) doc.fontSize(9).text(`CIF/NIF: ${taxId}`, { align: 'center' });
  if (fiscalAddress) doc.fontSize(9).text(fiscalAddress, { align: 'center' });
  doc.moveDown(1);
  doc.fontSize(10).text(`Centro: ${reservation.court.center.name}`);
  doc.text(`Cancha: ${reservation.court.name}`);
  doc.text(`Fecha: ${reservation.startTime.toLocaleDateString('es-ES')} ${reservation.startTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`);
  doc.text(`Duración: ${Math.round((reservation.endTime.getTime() - reservation.startTime.getTime()) / 60000)} min`);
  const paymentMethod = (reservation as any).paymentMethod || 'N/D';
  doc.text(`Método de pago: ${paymentMethod}`);
  doc.moveDown(1);
  
  let total = Number(reservation.totalPrice || 0);
  let sumOverrides = 0;
  let reasons: string[] = [];
  try {
    const overrideEvents = await db.outboxEvent.findMany({
      where: { eventType: 'PRICE_OVERRIDE', eventData: { path: ['reservationId'], equals: reservation.id } as any } as any,
      select: { eventData: true },
      orderBy: { createdAt: 'asc' },
    });
    for (const ev of overrideEvents as any[]) {
      sumOverrides += Number(ev?.eventData?.delta || 0);
      if (ev?.eventData?.reason) reasons.push(String(ev.eventData.reason));
    }
  } catch {}
  const base = total - sumOverrides;
  
  doc.fontSize(12).text(`Número: ${reservation.id.slice(0, 10).toUpperCase()}`, { align: 'right' });
  doc.moveDown(1);
  doc.fontSize(12).text(`Base: €${base.toFixed(2)}`, { align: 'right' });
  if (sumOverrides !== 0) {
    doc.text(`Ajustes: €${sumOverrides.toFixed(2)}`, { align: 'right' });
    if (reasons.length > 0) doc.fontSize(9).text(`Motivos: ${reasons.join(' | ')}`, { align: 'right' });
  }
  // Impuestos dinámicos desde center.settings.taxes
  try {
    const settings: any = (reservation.court.center as any).settings || {};
    const taxes: any = settings.taxes || {};
    const rate = Number(taxes.rate || 0);
    const included = !!taxes.included;
    if (rate > 0) {
      if (included) {
        const net = Number(reservation.totalPrice || 0) / (1 + rate / 100);
        const taxAmount = Number(reservation.totalPrice || 0) - net;
        doc.text(`Impuestos incluidos (${rate}%): €${taxAmount.toFixed(2)}`, { align: 'right' });
      } else {
        const taxAmount = (Number(reservation.totalPrice || 0) - base) - sumOverrides; // aproximado
        doc.text(`Impuestos (${rate}%): €${Math.max(0, taxAmount).toFixed(2)}`, { align: 'right' });
      }
    }
  } catch {}
  doc.fontSize(12).text(`Total: €${total.toFixed(2)}`, { align: 'right' });

  if (contactEmail || contactPhone) {
    doc.moveDown(1);
    if (contactEmail) doc.fontSize(9).text(`Contacto: ${contactEmail}`);
    if (contactPhone) doc.fontSize(9).text(`Teléfono: ${contactPhone}`);
  }
  if (footerNotes) {
    doc.moveDown(1);
    doc.fontSize(9).text(String(footerNotes));
  }

  doc.end();
  const buffer = await done;
  return new Response(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename=recibo-${reservation.id}.pdf`,
    },
  });
}


