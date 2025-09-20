/**
 * API Routes para dashboard de administración
 * GET /api/admin/dashboard - Obtener datos del dashboard
 */

import { NextRequest } from 'next/server';

// Asegurar Node.js runtime para Prisma
export const runtime = 'nodejs';
import { withAdminMiddleware, ApiResponse } from '@/lib/middleware';
import { db } from '@repo/db';
// Evitar import de enums de Prisma en build; usar literales compatibles
import { z } from 'zod';

// Usar el cliente compartido para respetar DATABASE_URL/DIRECT_DATABASE_URL
const prisma = db;

const DashboardQuerySchema = z.object({
  period: z.enum(['7d', '30d', '90d', '1y']).optional().default('30d'),
  centerId: z.string().optional()
});

/**
 * OPTIONS /api/admin/dashboard
 * Manejar peticiones preflight CORS
 */
export async function OPTIONS(request: NextRequest) {
  return new Response(null, { status: 204 });
}

/**
 * GET /api/admin/dashboard
 * Obtener datos completos del dashboard de administración
 * Acceso: ADMIN únicamente
 */
export async function GET(request: NextRequest) {
  return withAdminMiddleware(async (req) => {
    try {
      const { searchParams } = req.nextUrl;
      const params = DashboardQuerySchema.parse(Object.fromEntries(searchParams.entries()));
      
      // Calcular fechas según el período
      const now = new Date();
      const startDate = new Date();
      
      switch (params.period) {
        case '7d': startDate.setDate(now.getDate() - 7); break;
        case '30d': startDate.setDate(now.getDate() - 30); break;
        case '90d': startDate.setDate(now.getDate() - 90); break;
        case '1y': startDate.setFullYear(now.getFullYear() - 1); break;
      }
      
      const baseFilter = { createdAt: { gte: startDate, lte: now }, ...(params.centerId && { centerId: params.centerId }) } as any;
      
      // Ejecutar consultas con tolerancia a fallos
      const [curRevRes, curResRes, curUsrRes, curMemRes, curTourRes] = await Promise.allSettled([
        prisma.reservation.aggregate({ where: { ...baseFilter, status: 'PAID' as any }, _sum: { totalPrice: true } }),
        prisma.reservation.count({ where: baseFilter }),
        prisma.user.count({ where: { createdAt: { gte: startDate, lte: now } } }),
        prisma.membership.count({ where: baseFilter }),
        prisma.tournament.count({ where: baseFilter }),
      ]);
      const currentRevenue = curRevRes.status === 'fulfilled' ? curRevRes.value : { _sum: { totalPrice: 0 } };
      const currentReservations = curResRes.status === 'fulfilled' ? curResRes.value : 0;
      const currentUsers = curUsrRes.status === 'fulfilled' ? curUsrRes.value : 0;
      const currentMemberships = curMemRes.status === 'fulfilled' ? curMemRes.value : 0;
      const currentTournaments = curTourRes.status === 'fulfilled' ? curTourRes.value : 0;

      // Período anterior
      const previousStartDate = new Date(startDate);
      const previousEndDate = new Date(startDate);
      const periodDays = Math.max(1, Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
      previousStartDate.setDate(previousStartDate.getDate() - periodDays);
      const previousFilter = { createdAt: { gte: previousStartDate, lte: previousEndDate }, ...(params.centerId && { centerId: params.centerId }) } as any;

      const [prevRevRes, prevResRes, prevUsrRes, prevMemRes, prevTourRes] = await Promise.allSettled([
        prisma.reservation.aggregate({ where: { ...previousFilter, status: 'PAID' as any }, _sum: { totalPrice: true } }),
        prisma.reservation.count({ where: previousFilter }),
        prisma.user.count({ where: { createdAt: { gte: previousStartDate, lte: previousEndDate } } }),
        prisma.membership.count({ where: previousFilter }),
        prisma.tournament.count({ where: previousFilter }),
      ]);
      const previousRevenue = prevRevRes.status === 'fulfilled' ? prevRevRes.value : { _sum: { totalPrice: 0 } };
      const previousReservations = prevResRes.status === 'fulfilled' ? prevResRes.value : 0;
      const previousUsers = prevUsrRes.status === 'fulfilled' ? prevUsrRes.value : 0;
      const previousMemberships = prevMemRes.status === 'fulfilled' ? prevMemRes.value : 0;
      const previousTournaments = prevTourRes.status === 'fulfilled' ? prevTourRes.value : 0;

      const calculateGrowth = (current: number, previous: number): { value: string; isPositive: boolean } => {
        if (!Number.isFinite(current)) current = 0; if (!Number.isFinite(previous)) previous = 0;
        if (previous === 0) return { value: current > 0 ? '+100.00' : '0.00', isPositive: current > 0 };
        const growth = ((current - previous) / previous) * 100;
        return { value: (growth >= 0 ? '+' : '') + growth.toFixed(2), isPositive: growth >= 0 };
      };

      // Series con fallback
      const toDay = (ts: Date) => new Date(ts).toISOString().slice(0, 10);
      const dayKey = (d: Date) => d.toISOString().slice(0, 10);
      const days: string[] = []; const cursor = new Date(startDate);
      while (cursor <= now) { days.push(dayKey(cursor)); cursor.setDate(cursor.getDate() + 1); }

      const safeGroupCount = async (fn: () => Promise<any[]>) => {
        try { return await fn(); } catch { return []; }
      };

      const [resByDate, paidRevenueByDate, usersByDate, membershipsByDate, tournamentsByDate] = await Promise.all([
        safeGroupCount(() => prisma.reservation.groupBy({ by: ['createdAt'], where: baseFilter, _count: { id: true } } as any)),
        safeGroupCount(() => prisma.reservation.groupBy({ by: ['createdAt'], where: { ...baseFilter, status: 'PAID' as any }, _sum: { totalPrice: true } } as any)),
        safeGroupCount(() => prisma.user.groupBy({ by: ['createdAt'], where: { createdAt: { gte: startDate, lte: now } }, _count: { id: true } } as any)),
        safeGroupCount(() => prisma.membership.groupBy({ by: ['createdAt'], where: baseFilter, _count: { id: true } } as any)),
        safeGroupCount(() => prisma.tournament.groupBy({ by: ['createdAt'], where: baseFilter, _count: { id: true } } as any)),
      ]);

      const mapCounts = (arr: any[], key: 'count' | 'sum'): Record<string, number> => {
        const m: Record<string, number> = {}; if (!Array.isArray(arr)) return m;
        for (const it of arr) {
          const k = toDay(it.createdAt as Date);
          const value = key === 'count' ? (it._count?.id || 0) : (Number(it._sum?.totalPrice || 0));
          m[k] = (m[k] || 0) + value;
        }
        return m;
      };
      const resMap = mapCounts(resByDate, 'count');
      const revMap = mapCounts(paidRevenueByDate, 'sum');
      const usersMap = mapCounts(usersByDate, 'count');
      const memMap = mapCounts(membershipsByDate, 'count');
      const tourMap = mapCounts(tournamentsByDate, 'count');

      const dailyStats = days.map((d) => ({
        date: d,
        reservations: resMap[d] || 0,
        users: usersMap[d] || 0,
        memberships: memMap[d] || 0,
        tournaments: tourMap[d] || 0,
        revenue: revMap[d] || 0,
      }));

      const dashboard = {
        metrics: {
          totalRevenue: currentRevenue._sum.totalPrice || 0,
          totalReservations: currentReservations,
          totalUsers: currentUsers,
          totalMemberships: currentMemberships,
          totalTournaments: currentTournaments,
          growth: {
            revenue: calculateGrowth(Number(currentRevenue._sum.totalPrice || 0), Number(previousRevenue._sum.totalPrice || 0)),
            reservations: calculateGrowth(currentReservations, previousReservations),
            users: calculateGrowth(currentUsers, previousUsers),
            memberships: calculateGrowth(currentMemberships, previousMemberships),
            tournaments: calculateGrowth(currentTournaments, previousTournaments),
          },
        },
        trends: { daily: dailyStats, period: params.period },
        charts: { topCourts: [], sportDistribution: [], reservationStatus: [], popularTimes: [] },
        filters: { period: params.period, centerId: params.centerId, dateRange: { start: startDate.toISOString(), end: now.toISOString() } },
      };

      const res = ApiResponse.success(dashboard);
      return res;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const res = ApiResponse.validation(error.errors.map(err => ({ field: err.path.join('.'), message: err.message })));
        return res;
      }
      console.error('Error obteniendo dashboard:', error);
      const res = ApiResponse.success({
        metrics: { totalRevenue: 0, totalReservations: 0, totalUsers: 0, totalMemberships: 0, totalTournaments: 0, growth: { revenue: { value: '0.00', isPositive: true }, reservations: { value: '0.00', isPositive: true }, users: { value: '0.00', isPositive: true }, memberships: { value: '0.00', isPositive: true }, tournaments: { value: '0.00', isPositive: true } } },
        trends: { daily: [], period: '30d' },
        charts: { topCourts: [], sportDistribution: [], reservationStatus: [], popularTimes: [] },
        filters: { period: '30d', centerId: undefined, dateRange: { start: new Date().toISOString(), end: new Date().toISOString() } },
      });
      return res;
    }
  })(request);
}
