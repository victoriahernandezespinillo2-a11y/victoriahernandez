// Forzar runtime Node.js para evitar errores de bundling con pdfkit/fontkit
export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { withAdminMiddleware, ApiResponse } from '@/lib/middleware';
import { db } from '@repo/db';
import ReceiptPDF from '@/components/ReceiptPDF';

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

    try {
      // Calcular overrides (igual que antes) para pasar al PDF
      let sumOverrides = 0;
      const reasons: string[] = [];
      try {
        const overrideEvents = await db.outboxEvent.findMany({
          where: { eventType: 'PRICE_OVERRIDE', eventData: { path: ['reservationId'], equals: reservation.id } as any } as any,
          orderBy: { createdAt: 'asc' },
          select: { eventData: true },
        });
        for (const ev of overrideEvents as any[]) {
          const delta = Number(ev?.eventData?.delta || 0);
          sumOverrides += delta;
          if (ev?.eventData?.reason) reasons.push(String(ev.eventData.reason));
        }
      } catch {}

      const centerSettings: any = (reservation.court.center as any).settings || {};
      const receiptCfg: any = centerSettings.receipt || {};

      // Usar el generador de la web con @react-pdf/renderer
      const { renderToBuffer } = await import('@react-pdf/renderer');
      const element = ReceiptPDF({
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
        sumOverrides,
        reasons,
      } as any);

      const buffer = await renderToBuffer(element as any);

      // Devolver PDF binario como NextResponse
      return ApiResponse.raw(buffer, {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename=recibo-${reservation.id}.pdf`,
      }, 200);
    } catch (error) {
      console.error('Error generando PDF:', error);
      return ApiResponse.internalError(`Error generando PDF: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  })(request);
}


