/**
 * API Routes para estadísticas de pagos
 * GET /api/payments/stats - Obtener estadísticas de pagos
 */

import { NextRequest } from 'next/server';
import { withStaffMiddleware, ApiResponse } from '@/lib/middleware';
import { db } from '@repo/db';
import { z } from 'zod';

const prisma = db as any;

const StatsSchema = z.object({
  centerId: z.string().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  groupBy: z.enum(['day','week','month']).optional().default('day'),
});

/**
 * GET /api/payments/stats
 * Obtener estadísticas de pagos
 * Acceso: STAFF o superior
 */
export async function GET(request: NextRequest) {
  return withStaffMiddleware(async (req) => {
    try {
      const { searchParams } = req.nextUrl;
      const parsed = StatsSchema.parse(Object.fromEntries(searchParams.entries()));

      // Rango de fechas: por defecto últimos 30 días
      const end = parsed.dateTo ? new Date(parsed.dateTo) : new Date();
      const start = parsed.dateFrom ? new Date(parsed.dateFrom) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Sin centerId: todo desde ledger
      if (!parsed.centerId) {
        const credits = await prisma.ledgerTransaction.findMany({
          where: { direction: 'CREDIT', paymentStatus: 'PAID', paidAt: { gte: start, lte: end } },
          select: { amountEuro: true, method: true, sourceType: true, paidAt: true },
          take: 10000,
        });

        const totalRevenue = credits.reduce((s: number, r: any) => s + Number(r.amountEuro || 0), 0);
        const byMethod = aggregateBy(credits, (r: any) => (r.method || 'UNKNOWN'));
        const bySourceType = aggregateBy(credits, (r: any) => (r.sourceType || 'OTHER'));
        const byPeriod = aggregateByPeriod(credits, parsed.groupBy);

        return ApiResponse.success({ totalRevenue, byMethod, bySourceType, byPeriod, dateRange: { start, end } });
      }

      // Con centerId: combinar ledger (no RESERVATION) + reservas del centro por paidAt
      const [nonResCredits, centerReservations] = await Promise.all([
        prisma.ledgerTransaction.findMany({
          where: { direction: 'CREDIT', paymentStatus: 'PAID', paidAt: { gte: start, lte: end }, sourceType: { not: 'RESERVATION' } },
          select: { amountEuro: true, method: true, sourceType: true, paidAt: true },
          take: 10000,
        }),
        prisma.reservation.findMany({
          where: { paymentStatus: 'PAID', paidAt: { gte: start, lte: end }, court: { centerId: parsed.centerId } },
          select: { totalPrice: true, paymentMethod: true, paidAt: true },
          take: 10000,
        }),
      ]);

      const rows = [
        ...nonResCredits.map((r: any) => ({ amountEuro: Number(r.amountEuro || 0), method: r.method || 'UNKNOWN', sourceType: r.sourceType || 'OTHER', paidAt: r.paidAt })),
        ...centerReservations.map((r: any) => ({ amountEuro: Number(r.totalPrice || 0), method: r.paymentMethod || 'UNKNOWN', sourceType: 'RESERVATION', paidAt: r.paidAt })),
      ];

      const totalRevenue = rows.reduce((s: number, r: any) => s + Number(r.amountEuro || 0), 0);
      const byMethod = aggregateBy(rows, (r: any) => (r.method || 'UNKNOWN'));
      const bySourceType = aggregateBy(rows, (r: any) => (r.sourceType || 'OTHER'));
      const byPeriod = aggregateByPeriod(rows, parsed.groupBy);

      return ApiResponse.success({ totalRevenue, byMethod, bySourceType, byPeriod, dateRange: { start, end }, centerId: parsed.centerId });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return ApiResponse.validation(
          error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          }))
        );
      }
      
      console.error('Error obteniendo estadísticas de pagos:', error);
      return ApiResponse.internalError('Error interno del servidor');
    }
  })(request);
}

/**
 * OPTIONS /api/payments/stats
 * Manejar preflight requests
 */
export async function OPTIONS() {
  return ApiResponse.success(null);
}

function aggregateBy(rows: any[], keyFn: (r: any) => string) {
  const map = new Map<string, { key: string; totalAmount: number; count: number }>();
  for (const r of rows) {
    const k = keyFn(r) || 'UNKNOWN';
    const it = map.get(k) || { key: k, totalAmount: 0, count: 0 };
    it.totalAmount += Number(r.amountEuro || 0);
    it.count += 1;
    map.set(k, it);
  }
  return Array.from(map.values());
}

function aggregateByPeriod(rows: any[], groupBy: 'day'|'week'|'month') {
  const map = new Map<string, { date: string; totalAmount: number; count: number }>();
  for (const r of rows) {
    const d = new Date(r.paidAt);
    let key = '';
    switch (groupBy) {
      case 'week': {
        const weekStart = new Date(d);
        weekStart.setDate(d.getDate() - d.getDay());
        key = weekStart.toISOString().slice(0,10);
        break;
      }
      case 'month':
        key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
        break;
      case 'day':
      default:
        key = d.toISOString().slice(0,10);
    }
    const it = map.get(key) || { date: key, totalAmount: 0, count: 0 };
    it.totalAmount += Number(r.amountEuro || 0);
    it.count += 1;
    map.set(key, it);
  }
  return Array.from(map.values()).sort((a,b) => a.date.localeCompare(b.date));
}
