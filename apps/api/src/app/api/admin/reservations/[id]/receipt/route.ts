// Forzar runtime Node.js para evitar errores de bundling con pdfkit/fontkit
export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { withAdminMiddleware, ApiResponse } from '@/lib/middleware';
import { db } from '@repo/db';

export async function GET(request: NextRequest) {
  return withAdminMiddleware(async (req) => {
    const segments = req.nextUrl.pathname.split('/');
    const ridx = segments.findIndex((s) => s === 'reservations');
    const id = ridx !== -1 && segments[ridx + 1] ? segments[ridx + 1] : '';
    if (!id) return ApiResponse.badRequest('ID requerido');
    const reservation = await db.reservation.findUnique({
      where: { id },
      include: { user: true, court: { include: { center: true } } },
    });
    if (!reservation) return ApiResponse.notFound('Reserva no encontrada');

    // Cargar la variante CommonJS de pdfkit para evitar la ruta ESM que depende de fontkit/module.mjs
    const { createRequire } = await import('module');
    const require = createRequire(import.meta.url);
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    const done: Promise<Buffer> = new Promise((resolve) => doc.on('end', () => resolve(Buffer.concat(chunks))));

    // Encabezado
    // Configuración dinámica desde el centro
    const centerSettings: any = (reservation.court.center as any).settings || {};
    const receiptCfg: any = centerSettings.receipt || {};
    const legalName: string | undefined = receiptCfg.legalName || centerSettings.legalName;
    const taxId: string | undefined = receiptCfg.taxId || centerSettings.taxId;
    const fiscalAddress: string | undefined = receiptCfg.fiscalAddress || centerSettings.fiscalAddress;
    const contactEmail: string | undefined = receiptCfg.contactEmail || reservation.court.center.email || centerSettings.contactEmail;
    const contactPhone: string | undefined = receiptCfg.contactPhone || reservation.court.center.phone || centerSettings.contactPhone;
    const footerNotes: string | undefined = receiptCfg.footerNotes;
    const showStripeReferences: boolean = !!receiptCfg.showStripeReferences;

    doc.fontSize(16).text(legalName || 'Recibo de Reserva', { align: 'center' });
    if (taxId) doc.fontSize(9).text(`CIF/NIF: ${taxId}`, { align: 'center' });
    if (fiscalAddress) doc.fontSize(9).text(fiscalAddress, { align: 'center' });
    doc.moveDown(1);
    doc.fontSize(10).text(`Centro: ${reservation.court.center.name}`);
    doc.text(`Cancha: ${reservation.court.name}`);
    doc.text(`Cliente: ${reservation.user?.name || ''} - ${reservation.user?.email || ''}`);
    doc.text(`Fecha: ${reservation.startTime.toLocaleDateString('es-ES')} ${reservation.startTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`);
    doc.text(`Duración: ${Math.round((reservation.endTime.getTime() - reservation.startTime.getTime()) / 60000)} min`);

    // Método de pago
    const paymentMethod = (reservation as any).paymentMethod || 'N/D';
    doc.text(`Método de pago: ${paymentMethod}`);
    doc.moveDown(1);
    
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
      for (const ev of overrideEvents as any[]) {
        const delta = Number(ev?.eventData?.delta || 0);
        sumOverrides += delta;
        if (ev?.eventData?.reason) overrideReasons.push(String(ev.eventData.reason));
      }
    } catch {}
    const base = total - sumOverrides;

    // Sección de importes
    doc.fontSize(12).text(`Número: ${reservation.id.slice(0, 10).toUpperCase()}`, { align: 'right' });
    doc.moveDown(1);
    doc.fontSize(12).text(`Base: €${base.toFixed(2)}`, { align: 'right' });
    if (sumOverrides !== 0) {
      doc.text(`Ajustes: €${sumOverrides.toFixed(2)}`, { align: 'right' });
      if (overrideReasons.length > 0) {
        doc.fontSize(9).text(`Motivos: ${overrideReasons.join(' | ')}`, { align: 'right' });
      }
    }
    // Impuestos dinámicos
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
          const taxAmount = (Number(reservation.totalPrice || 0) - base) - sumOverrides; // aproximado si total ya sumado
          doc.text(`Impuestos (${rate}%): €${Math.max(0, taxAmount).toFixed(2)}`, { align: 'right' });
        }
      }
    } catch {}
    doc.fontSize(12).text(`Total: €${total.toFixed(2)}`, { align: 'right' });

    // Referencias de pago (opcional)
    if (showStripeReferences) {
      const pi = (reservation as any).paymentIntentId as string | undefined;
      if (pi) doc.fontSize(9).text(`Stripe PaymentIntent: ${pi}`);
      try {
        const refundEvt = await db.outboxEvent.findFirst({
          where: { eventType: 'RESERVATION_REFUNDED', eventData: { path: ['reservationId'], equals: reservation.id } as any } as any,
          orderBy: { createdAt: 'desc' },
          select: { eventData: true },
        });
        const refundId = (refundEvt as any)?.eventData?.refundId as string | undefined;
        if (refundId) doc.fontSize(9).text(`Stripe Refund: ${refundId}`);
      } catch {}
    }

    // Contacto y notas
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
    const res = ApiResponse.success(buffer as any);
    res.headers.set('Content-Type', 'application/pdf');
    res.headers.set('Content-Disposition', `inline; filename=recibo-${reservation.id}.pdf`);
    return res;
  })(request);
}


