/**
 * API Routes para estadísticas de administración
 * GET /api/admin/stats - Obtener estadísticas detalladas del sistema
 */

import { NextRequest } from 'next/server';
import { withAdminMiddleware, ApiResponse } from '@/lib/middleware';
import { db } from '@repo/db';
import { z } from 'zod';

const prisma = db;

const StatsQuerySchema = z.object({
  type: z.enum(['overview', 'revenue', 'usage', 'users', 'performance']).optional().default('overview'),
  period: z.enum(['7d', '30d', '90d', '1y', 'all']).optional().default('30d'),
  centerId: z.string().optional(),
  groupBy: z.enum(['day', 'week', 'month']).optional().default('day')
});

/**
 * GET /api/admin/stats
 * Obtener estadísticas detalladas del sistema
 * Acceso: ADMIN únicamente
 */
export async function GET(request: NextRequest) {
  return withAdminMiddleware(async (req) => {
    try {
      const { searchParams } = req.nextUrl;
      const params = StatsQuerySchema.parse(Object.fromEntries(searchParams.entries()));
      
      // Calcular fechas según el período
      const now = new Date();
      let startDate = new Date();
      
      if (params.period !== 'all') {
        switch (params.period) {
          case '7d':
            startDate.setDate(now.getDate() - 7);
            break;
          case '30d':
            startDate.setDate(now.getDate() - 30);
            break;
          case '90d':
            startDate.setDate(now.getDate() - 90);
            break;
          case '1y':
            startDate.setFullYear(now.getFullYear() - 1);
            break;
        }
      } else {
        startDate = new Date('2020-01-01'); // Fecha muy antigua para obtener todos los datos
      }
      
      let stats = {};
      
      switch (params.type) {
        case 'overview':
          stats = await getOverviewStats(startDate, now, params.centerId);
          break;
        case 'revenue':
          stats = await getRevenueStats(startDate, now, params.centerId, params.groupBy);
          break;
        case 'usage':
          stats = await getUsageStats(startDate, now, params.centerId, params.groupBy);
          break;
        case 'users':
          stats = await getUserStats(startDate, now, params.groupBy);
          break;
        case 'performance':
          stats = await getPerformanceStats(startDate, now, params.centerId);
          break;
      }
      
      return ApiResponse.success({
        ...stats,
        metadata: {
          type: params.type,
          period: params.period,
          groupBy: params.groupBy,
          centerId: params.centerId,
          dateRange: {
            start: startDate.toISOString(),
            end: now.toISOString()
          },
          generatedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return ApiResponse.validation(
          error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          }))
        );
      }
      
      console.error('Error obteniendo estadísticas:', error);
      return ApiResponse.internalError('Error interno del servidor');
    }
  })(request);
}

// Funciones auxiliares para obtener diferentes tipos de estadísticas

async function getOverviewStats(startDate: Date, endDate: Date, centerId?: string) {
  const baseFilter = {
    createdAt: { gte: startDate, lte: endDate },
    ...(centerId && { centerId })
  };
  
  const [users, reservations, memberships, payments, centers, courts] = await Promise.all([
    prisma.user.count({ where: { createdAt: { gte: startDate, lte: endDate } } }),
    prisma.reservation.count({ where: baseFilter }),
    prisma.membership.count({ where: baseFilter }),
    prisma.reservation.aggregate({
      where: { ...baseFilter, status: 'PAID' },
      _sum: { totalPrice: true },
      _count: { id: true }
    }),
    prisma.center.count(),
    prisma.court.count({ where: centerId ? { centerId } : {} })
  ]);
  
  return {
    totals: {
      users,
      reservations,
      memberships,
      payments: payments._count.id,
      revenue: Number(payments._sum.totalPrice || 0),
      centers,
      courts
    }
  };
}

async function getRevenueStats(startDate: Date, endDate: Date, centerId?: string, groupBy: string = 'day') {
  const baseFilter = {
    createdAt: { gte: startDate, lte: endDate },
    ...(centerId && { centerId })
  } as const;
  
  // Obtener ingresos por período
  const revenueByPeriod = await prisma.reservation.groupBy({
    by: ['createdAt'],
    where: { ...baseFilter, status: 'PAID' },
    _sum: { totalPrice: true },
    _count: { id: true }
  });
  
  // Obtener ingresos por tipo de servicio
  const revenueByType = [] as Array<{ type: string; _sum: { totalPrice: number }; _count: { id: number } }>;
  
  return {
    revenue: {
      byPeriod: revenueByPeriod.map((r: any) => ({ ...r, _sum: { totalPrice: Number(r._sum.totalPrice || 0) } })),
      byType: revenueByType,
      total: revenueByPeriod.reduce((sum: number, item: any) => sum + Number(item._sum.totalPrice || 0), 0)
    }
  };
}

async function getUsageStats(startDate: Date, endDate: Date, centerId?: string, groupBy: string = 'day') {
  const baseFilter = {
    createdAt: { gte: startDate, lte: endDate },
    ...(centerId && { centerId })
  };
  
  // Reservas por deporte
  const reservationsBySport = await prisma.reservation.groupBy({
    by: ['courtId'],
    where: baseFilter,
    _count: { id: true }
  });
  
  // Obtener información de deportes
  const courts = await prisma.court.findMany({
    select: { id: true, sportType: true }
  });
  
  const sportStats = reservationsBySport.reduce((acc: Record<string, number>, item: any) => {
    const court = courts.find((c: any) => c.id === (item as any).courtId);
    if (court) {
      const sportKey = (court as any).sportType || 'UNKNOWN';
      acc[sportKey] = (acc[sportKey] || 0) + item._count.id;
    }
    return acc;
  }, {} as Record<string, number>);
  
  // Horarios más populares
  const popularTimes = await prisma.reservation.groupBy({
    by: ['startTime'],
    where: baseFilter,
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: 10
  });
  
  return {
    usage: {
      bySport: (Object.entries(sportStats) as Array<[string, number]>).map(([sport, count]) => ({ sport, count })),
      popularTimes: popularTimes.map((item: any) => ({ time: item.startTime, count: item._count.id })),
      totalReservations: reservationsBySport.reduce((sum: number, item: any) => sum + item._count.id, 0)
    }
  };
}

async function getUserStats(startDate: Date, endDate: Date, groupBy: string) {
  const baseFilter = {
    createdAt: { gte: startDate, lte: endDate }
  };
  
  // Usuarios por rol
  const usersByRole = await prisma.user.groupBy({
    by: ['role'],
    where: baseFilter,
    _count: { id: true }
  });
  
  // Usuarios activos (con reservas en el período)
  const activeUsers = await prisma.user.count({
    where: {
      reservations: {
        some: {
          createdAt: { gte: startDate, lte: endDate }
        }
      }
    }
  });
  
  return {
    users: {
      byRole: usersByRole.map((item: any) => ({ role: item.role, count: item._count.id })),
      active: activeUsers,
      total: usersByRole.reduce((sum: number, item: any) => sum + item._count.id, 0)
    }
  };
}

async function getPerformanceStats(startDate: Date, endDate: Date, centerId?: string) {
  const baseFilter = {
    createdAt: { gte: startDate, lte: endDate },
    ...(centerId && { centerId })
  };
  
  // Tasa de ocupación por cancha
  const courtOccupancy = await prisma.court.findMany({
    where: centerId ? { centerId } : {},
    select: {
      id: true,
      name: true,
      _count: {
        select: {
          reservations: {
            where: {
              createdAt: { gte: startDate, lte: endDate },
              status: { in: ['PAID', 'IN_PROGRESS', 'COMPLETED'] }
            }
          }
        }
      }
    }
  });
  
  // Cancelaciones
  const cancellations = await prisma.reservation.count({
    where: {
      ...baseFilter,
      status: 'CANCELLED'
    }
  });
  
  const totalReservations = await prisma.reservation.count({ where: baseFilter });
  
  return {
    performance: {
      courtOccupancy: courtOccupancy.map((court: any) => ({
        courtId: court.id,
        courtName: court.name,
        reservations: court._count.reservations
      })),
      cancellationRate: totalReservations > 0 ? (cancellations / totalReservations) * 100 : 0,
      totalCancellations: cancellations,
      totalReservations
    }
  };
}

/**
 * OPTIONS /api/admin/stats
 * Manejar preflight requests
 */
export async function OPTIONS() {
  return ApiResponse.success(null);
}