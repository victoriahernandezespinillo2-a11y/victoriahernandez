import { NextRequest, NextResponse } from 'next/server';
import { withAdminMiddleware, ApiResponse } from '@/lib/middleware';
import { db } from '@repo/db';
import { z } from 'zod';

export const runtime = 'nodejs';

const GetAdminPaymentsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  method: z.string().optional(), // 'CARD' | 'CASH' | 'CREDITS' | 'TRANSFER' | 'COURTESY' | 'REDSYS' | 'OTHER'
  sourceType: z.string().optional(), // 'RESERVATION' | 'ORDER' | 'TOPUP' | 'MEMBERSHIP'
  status: z.enum(['PAID', 'REFUNDED', 'PENDING']).optional(),
  centerId: z.string().optional(),
  format: z.enum(['json','csv']).optional().default('json'),
});

export async function GET(request: NextRequest) {
  return withAdminMiddleware(async (req): Promise<NextResponse> => {
    try {
      const { searchParams } = req.nextUrl;
      const params = GetAdminPaymentsSchema.parse(Object.fromEntries(searchParams.entries()));

      const where: any = { direction: 'CREDIT' as any, paymentStatus: 'PAID' as any };
      if (params.status) where.paymentStatus = params.status;
      if (params.sourceType) where.sourceType = params.sourceType;
      if (params.method) where.method = params.method;
      if (params.dateFrom || params.dateTo) {
        where.paidAt = {} as any;
        if (params.dateFrom) (where.paidAt as any).gte = new Date(params.dateFrom);
        if (params.dateTo) (where.paidAt as any).lte = new Date(params.dateTo);
      }

      // Recuperar hasta 1000 y filtrar por centerId si aplica (solo RESERVATION)
      const raw = await (db as any).ledgerTransaction.findMany({
        where,
        orderBy: { paidAt: 'desc' },
        take: 1000,
        select: {
          id: true, sourceType: true, sourceId: true, amountEuro: true, currency: true,
          paymentStatus: true, paidAt: true, method: true, gatewayRef: true, metadata: true,
        },
      });

      // Enriquecer con origen para mostrar usuario/centro/cancha
      const resIds = raw.filter((r: any) => r.sourceType === 'RESERVATION').map((r: any) => r.sourceId);
      const ordIds = raw.filter((r: any) => r.sourceType === 'ORDER').map((r: any) => r.sourceId);

      const [reservations, orders] = await Promise.all([
        resIds.length > 0
          ? (db as any).reservation.findMany({
              where: { id: { in: resIds } },
              select: {
                id: true,
                totalPrice: true,
                paidAt: true,
                paymentMethod: true,
                user: { select: { id: true, name: true, email: true } },
                court: { select: { id: true, name: true, center: { select: { id: true, name: true } } } },
              },
            })
          : [],
        ordIds.length > 0
          ? (db as any).order.findMany({
              where: { id: { in: ordIds } },
              select: {
                id: true,
                totalEuro: true,
                user: { select: { id: true, firstName: true, lastName: true, email: true, name: true } },
              },
            })
          : [],
      ]);

      const resById = new Map<string, any>(reservations.map((r: any) => [r.id, r]));
      const ordById = new Map<string, any>(orders.map((o: any) => [o.id, o]));

      // Mapear a filas UI
      let items = raw.map((t: any) => {
        const base = {
          id: t.id,
          paymentType: String(t.sourceType || 'OTHER'),
          amount: Number(t.amountEuro || 0),
          currency: t.currency || 'EUR',
          method: String(t.method || 'UNKNOWN'),
          status: String(t.paymentStatus || 'PAID'),
          paidAt: t.paidAt,
          description: '',
          user: { id: '', name: '', email: '' },
          courtName: '',
          centerName: '',
          reservationId: '',
          orderId: '',
        } as any;

        if (t.sourceType === 'RESERVATION') {
          const r = resById.get(t.sourceId);
          base.reservationId = t.sourceId;
          base.user = { id: r?.user?.id || '', name: r?.user?.name || r?.user?.email || '', email: r?.user?.email || '' };
          base.courtName = r?.court?.name || '';
          base.centerName = r?.court?.center?.name || '';
          base.description = `Reserva ${r?.court?.name || ''}`.trim();
        } else if (t.sourceType === 'ORDER') {
          const o = ordById.get(t.sourceId);
          const fullName = (o?.user?.name || `${o?.user?.firstName || ''} ${o?.user?.lastName || ''}`).trim();
          base.orderId = t.sourceId;
          base.user = { id: o?.user?.id || '', name: fullName || o?.user?.email || '', email: o?.user?.email || '' };
          base.description = `Pedido ${t.sourceId}`;
        } else {
          base.description = (t.metadata as any)?.description || '';
        }
        return base;
      });

      // Filtrar por centerId si aplica (sólo impacta reservas)
      if (params.centerId) {
        items = items.filter((it: any) => {
          if (it.paymentType === 'RESERVATION') {
            const r = resById.get(it.reservationId);
            const cid = r?.court?.center?.id || r?.court?.centerId;
            return cid === params.centerId;
          }
          return false; // Excluir órdenes y otros si se filtra por centro
        });
      }

      // Ordenar por fecha (paidAt)
      items.sort((a: any, b: any) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime());

      const total = items.length;
      const start = (params.page - 1) * params.limit;
      const paged = items.slice(start, start + params.limit);

      if (params.format === 'csv') {
        const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
        const headers = ['id','paymentType','amount','currency','method','status','paidAt','userName','userEmail','reservationId','orderId','courtName','centerName','description'];
        const lines = [headers.join(',')];
        (params.page ? paged : items).forEach((it: any) => {
          lines.push([
            it.id, it.paymentType, it.amount, it.currency, it.method, it.status, new Date(it.paidAt).toISOString(),
            it.user?.name || '', it.user?.email || '', it.reservationId || '', it.orderId || '', it.courtName || '', it.centerName || '', it.description || ''
          ].map(esc).join(','));
        });
        const csv = lines.join('\n');
        return new NextResponse(csv, { status: 200, headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Cache-Control': 'no-store' } });
      }

      return ApiResponse.success({ items: paged, pagination: { page: params.page, limit: params.limit, total, pages: Math.max(1, Math.ceil(total / params.limit)) } });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return ApiResponse.validation(error.errors.map(err => ({ field: err.path.join('.'), message: err.message })));
      }
      console.error('Error en admin payments GET:', error);
      return ApiResponse.internalError('Error interno del servidor');
    }
  })(request);
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}


