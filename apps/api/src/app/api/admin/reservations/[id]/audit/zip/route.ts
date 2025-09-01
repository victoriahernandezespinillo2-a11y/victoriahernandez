import { NextRequest } from 'next/server';
import { withAdminMiddleware, ApiResponse } from '@/lib/middleware';
import { db } from '@repo/db';

export const runtime = 'nodejs';

// Nota: Sin dependencia externa de zip; usamos multipart/mixed como contenedor ligero.
// Para producción con zip real, integrar archiver/JSZip y servir application/zip.

export async function GET(request: NextRequest) {
  return withAdminMiddleware(async (req) => {
    const { default: PDFDocument } = await import('pdfkit');
    const id = req.nextUrl.pathname.split('/').slice(-4, -3)[0];
    if (!id) return ApiResponse.badRequest('ID de reserva requerido');

    const reservation = await db.reservation.findUnique({
      where: { id },
      include: { user: true, court: { include: { center: true } } },
    });
    if (!reservation) return ApiResponse.notFound('Reserva no encontrada');

    const events = await db.outboxEvent.findMany({
      where: { eventData: { path: ['reservationId'], equals: id } as any },
      orderBy: { createdAt: 'desc' },
      select: { eventType: true, eventData: true, createdAt: true, id: true },
    } as any);

    // 1) Generar recibo PDF enriquecido en memoria (mismo estilo que el endpoint de recibo admin)
    const pdfDoc = new PDFDocument({ margin: 50 });
    const pdfChunks: any[] = [];
    pdfDoc.on('data', (c) => pdfChunks.push(c));
    const pdfDone = new Promise<Buffer>((resolve) => pdfDoc.on('end', () => resolve(Buffer.concat(pdfChunks as any))));

    // Configuración dinámica desde el centro
    const centerSettings: any = ((reservation.court as any).center as any).settings || {};
    const receiptCfg: any = centerSettings.receipt || {};
    const legalName: string | undefined = receiptCfg.legalName || centerSettings.legalName;
    const taxId: string | undefined = receiptCfg.taxId || centerSettings.taxId;
    const fiscalAddress: string | undefined = receiptCfg.fiscalAddress || centerSettings.fiscalAddress;
    const contactEmail: string | undefined = receiptCfg.contactEmail || ((reservation.court as any).center as any).email || centerSettings.contactEmail;
    const contactPhone: string | undefined = receiptCfg.contactPhone || ((reservation.court as any).center as any).phone || centerSettings.contactPhone;
    const footerNotes: string | undefined = receiptCfg.footerNotes;
    const showStripeReferences: boolean = !!receiptCfg.showStripeReferences;

    pdfDoc.fontSize(16).text(legalName || 'Recibo de Reserva', { align: 'center' });
    if (taxId) pdfDoc.fontSize(9).text(`CIF/NIF: ${taxId}`, { align: 'center' });
    if (fiscalAddress) pdfDoc.fontSize(9).text(fiscalAddress, { align: 'center' });
    pdfDoc.moveDown(1);
    pdfDoc.fontSize(10).text(`Centro: ${((reservation.court as any).center as any).name}`);
    pdfDoc.text(`Cancha: ${reservation.court.name}`);
    pdfDoc.text(`Cliente: ${reservation.user?.name || ''} - ${reservation.user?.email || ''}`);
    pdfDoc.text(`Fecha: ${reservation.startTime.toLocaleDateString('es-ES')} ${reservation.startTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`);
    pdfDoc.text(`Duración: ${Math.round((reservation.endTime.getTime() - reservation.startTime.getTime()) / 60000)} min`);
    const paymentMethod = (reservation as any).paymentMethod || 'N/D';
    pdfDoc.text(`Método de pago: ${paymentMethod}`);
    pdfDoc.moveDown(1);

    // Overrides de precio (si existen)
    let total = Number(reservation.totalPrice || 0);
    let sumOverrides = 0;
    let overrideReasons: string[] = [];
    try {
      const overrideEvents = await db.outboxEvent.findMany({
        where: { eventType: 'PRICE_OVERRIDE', eventData: { path: ['reservationId'], equals: reservation.id } as any } as any,
        orderBy: { createdAt: 'asc' },
        select: { eventData: true },
      });
      for (const ev of (overrideEvents as any[])) {
        const delta = Number(ev?.eventData?.delta || 0);
        sumOverrides += delta;
        if (ev?.eventData?.reason) overrideReasons.push(String(ev.eventData.reason));
      }
    } catch {}
    const base = total - sumOverrides;

    // Sección de importes y números
    pdfDoc.fontSize(12).text(`Número: ${reservation.id.slice(0, 10).toUpperCase()}`, { align: 'right' });
    pdfDoc.moveDown(1);
    pdfDoc.fontSize(12).text(`Base: €${base.toFixed(2)}`, { align: 'right' });
    if (sumOverrides !== 0) {
      pdfDoc.text(`Ajustes: €${sumOverrides.toFixed(2)}`, { align: 'right' });
      if (overrideReasons.length > 0) {
        pdfDoc.fontSize(9).text(`Motivos: ${overrideReasons.join(' | ')}`, { align: 'right' });
      }
    }
    // Impuestos dinámicos
    try {
      const taxes: any = centerSettings.taxes || {};
      const rate = Number(taxes.rate || 0);
      const included = !!taxes.included;
      if (rate > 0) {
        if (included) {
          const net = total / (1 + rate / 100);
          const taxAmount = total - net;
          pdfDoc.text(`Impuestos incluidos (${rate}%): €${taxAmount.toFixed(2)}`, { align: 'right' });
        } else {
          const taxAmount = total * (rate / 100);
          pdfDoc.text(`Impuestos (${rate}%): €${taxAmount.toFixed(2)}`, { align: 'right' });
          total += taxAmount;
        }
      }
    } catch {}
    pdfDoc.fontSize(12).text(`Total: €${total.toFixed(2)}`, { align: 'right' });

    // Referencias de pago (opcional)
    if (showStripeReferences) {
      const pi = (reservation as any).paymentIntentId as string | undefined;
      if (pi) pdfDoc.fontSize(9).text(`Stripe PaymentIntent: ${pi}`);
      try {
        const refundEvt = await db.outboxEvent.findFirst({
          where: { eventType: 'RESERVATION_REFUNDED', eventData: { path: ['reservationId'], equals: reservation.id } as any } as any,
          orderBy: { createdAt: 'desc' },
          select: { eventData: true },
        });
        const refundId = (refundEvt as any)?.eventData?.refundId as string | undefined;
        if (refundId) pdfDoc.fontSize(9).text(`Stripe Refund: ${refundId}`);
      } catch {}
    }

    // Contacto y notas
    if (contactEmail || contactPhone) {
      pdfDoc.moveDown(1);
      if (contactEmail) pdfDoc.fontSize(9).text(`Contacto: ${contactEmail}`);
      if (contactPhone) pdfDoc.fontSize(9).text(`Teléfono: ${contactPhone}`);
    }
    if (footerNotes) {
      pdfDoc.moveDown(1);
      pdfDoc.fontSize(9).text(String(footerNotes));
    }

    pdfDoc.end();
    const pdfBuffer = await pdfDone;

    // 2) Generar CSV de auditoría
    const csvRows: string[] = [];
    csvRows.push(['createdAt','type','summary'].join(','));
    for (const ev of (events as any[])) {
      const summary = summarize(ev.eventType, ev.eventData);
      csvRows.push([new Date(ev.createdAt).toISOString(), ev.eventType, escapeCsv(summary)].join(','));
    }
    const csvBuffer = Buffer.from(csvRows.join('\n'), 'utf-8');

    // 3) Responder como multipart/mixed con ambas partes
    const boundary = 'BOUNDARY-' + Math.random().toString(36).slice(2);
    const parts: string[] = [];
    // PDF part
    parts.push(`--${boundary}`);
    parts.push('Content-Type: application/pdf');
    parts.push(`Content-Disposition: attachment; filename="recibo-${reservation.id}.pdf"`);
    parts.push('');
    const pdfPart = Buffer.concat([Buffer.from(parts.join('\r\n') + '\r\n'), pdfBuffer, Buffer.from('\r\n')]);
    // CSV part
    const parts2: string[] = [];
    parts2.push(`--${boundary}`);
    parts2.push('Content-Type: text/csv; charset=utf-8');
    parts2.push(`Content-Disposition: attachment; filename="audit-${reservation.id}.csv"`);
    parts2.push('');
    const csvPart = Buffer.concat([Buffer.from(parts2.join('\r\n') + '\r\n'), csvBuffer, Buffer.from('\r\n')]);
    const end = Buffer.from(`--${boundary}--`);

    const body = Buffer.concat([pdfPart, csvPart, end]);
    const res = ApiResponse.success(body as any);
    res.headers.set('Content-Type', `multipart/mixed; boundary=${boundary}`);
    res.headers.set('Content-Disposition', `attachment; filename="reserva-${reservation.id}-documentos.mime"`);
    return res;
  })(request);
}

function summarize(type: string, data: any): string {
  try {
    switch (type) {
      case 'PRICE_OVERRIDE':
        return `Ajuste de precio €${Number(data?.delta || 0).toFixed(2)} – ${data?.reason || 'Sin motivo'}`;
      case 'PAYMENT_RECORDED':
        return `Pago ${data?.method || ''} – €${Number(data?.amount || 0).toFixed(2)}`;
      case 'PAYMENT_LINK_CREATED':
        return 'Enlace de pago generado';
      case 'RESERVATION_PAID':
        return `Pago conciliado (${data?.paymentIntentId || 'PI'})`;
      case 'RESERVATION_REFUNDED':
        return `Reembolso €${Number(data?.amount || 0).toFixed(2)}`;
      case 'RESERVATION_CHECKED_IN':
        return 'Check-in';
      case 'RESERVATION_CHECKED_OUT':
        return 'Check-out';
      case 'RESERVATION_CONFIRMATION_REQUESTED':
        return `Confirmación solicitada (${data?.channel || 'EMAIL'})`;
      default:
        return type;
    }
  } catch { return type; }
}

function escapeCsv(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return '"' + value.replace(/"/g, '""') + '"';
  }
  return value;
}


