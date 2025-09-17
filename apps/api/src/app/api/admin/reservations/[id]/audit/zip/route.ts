import { NextRequest } from 'next/server';
import { withAdminMiddleware, ApiResponse } from '@/lib/middleware';
import { db } from '@repo/db';
import ReceiptPDF from '@/components/ReceiptPDF';
import JSZip from 'jszip';

export const runtime = 'nodejs';

// Nota: Sin dependencia externa de zip; usamos multipart/mixed como contenedor ligero.
// Para producción con zip real, integrar archiver/JSZip y servir application/zip.

export async function GET(request: NextRequest) {
  return withAdminMiddleware(async (req) => {
    // Identificar el ID de manera robusta
    const segments = req.nextUrl.pathname.split('/');
    const ridx = segments.findIndex((s) => s === 'reservations');
    const id = ridx !== -1 && segments[ridx + 1] ? segments[ridx + 1] : '';
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

    // 1) Generar recibo PDF con el mismo componente que usa el usuario (react-pdf)
    const centerSettings: any = (reservation.court.center as any)?.settings || {};
    const receiptCfg: any = centerSettings.receipt || {};
    const { renderToBuffer } = await import('@react-pdf/renderer');
    const pdfElement = ReceiptPDF({
      reservation: {
        id: reservation.id,
        court: {
          name: reservation.court.name,
          center: {
            name: reservation.court.center.name,
            email: reservation.court.center.email,
            phone: reservation.court.center.phone,
          },
        },
        startTime: reservation.startTime,
        endTime: reservation.endTime,
        totalPrice: Number(reservation.totalPrice || 0),
        paymentMethod: (reservation as any).paymentMethod || null,
      },
      centerSettings: {
        legalName: receiptCfg.legalName || centerSettings.legalName,
        taxId: receiptCfg.taxId || centerSettings.taxId,
        fiscalAddress: receiptCfg.fiscalAddress || centerSettings.fiscalAddress,
        contactEmail: receiptCfg.contactEmail || reservation.court.center.email || centerSettings.contactEmail,
        contactPhone: receiptCfg.contactPhone || reservation.court.center.phone || centerSettings.contactPhone,
        footerNotes: receiptCfg.footerNotes,
      },
      total: Number(reservation.totalPrice || 0),
      sumOverrides: 0,
      reasons: [],
    } as any);
    const pdfBuffer = await renderToBuffer(pdfElement as any);

    // nota: los overrides y referencias ya están incluidos en el PDF de react-pdf

    // 2) Generar CSV de auditoría
    const csvRows: string[] = [];
    csvRows.push(['createdAt','type','summary'].join(','));
    for (const ev of (events as any[])) {
      const summary = summarize(ev.eventType, ev.eventData);
      csvRows.push([new Date(ev.createdAt).toISOString(), ev.eventType, escapeCsv(summary)].join(','));
    }
    const csvBuffer = Buffer.from(csvRows.join('\n'), 'utf-8');

    // 3) Empaquetar en ZIP real (application/zip)
    const zip = new JSZip();
    zip.file(`recibo-${reservation.id}.pdf`, pdfBuffer);
    zip.file(`audit-${reservation.id}.csv`, csvBuffer);
    const zipBuffer: Buffer = await zip.generateAsync({ type: 'nodebuffer' });

    return ApiResponse.raw(zipBuffer, {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="reserva-${reservation.id}-paquete.zip"`,
    }, 200);
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


