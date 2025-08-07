/**
 * API Routes para dashboard de administración
 * GET /api/admin/dashboard - Obtener datos del dashboard
 */

import { NextRequest } from 'next/server';
import { withAdminMiddleware, ApiResponse } from '@/lib/middleware';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

const DashboardQuerySchema = z.object({
  period: z.enum(['7d', '30d', '90d', '1y']).optional().default('30d'),
  centerId: z.string().optional()
});

/**
 * OPTIONS /api/admin/dashboard
 * Manejar peticiones preflight CORS
 */
export async function OPTIONS(request: NextRequest) {
  // Las peticiones OPTIONS no requieren autenticación
  const response = new Response(null, { status: 200 });
  
  // Configurar headers CORS
  const origin = request.headers.get('origin');
  const allowedOrigins = process.env.NODE_ENV === 'production'
    ? ['https://polideportivo.com', 'https://admin.polideportivo.com']
    : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3003'];

  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
  }
  
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.headers.set('Access-Control-Allow-Credentials', 'true');

  return response;
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
      
      // Filtros base
      const baseFilter = {
        createdAt: {
          gte: startDate,
          lte: now
        },
        ...(params.centerId && { centerId: params.centerId })
      };
      
      // Calcular fechas del período anterior para comparación
      const previousStartDate = new Date(startDate);
      const previousEndDate = new Date(startDate);
      const periodDays = Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      previousStartDate.setDate(previousStartDate.getDate() - periodDays);
      
      const previousFilter = {
        createdAt: {
          gte: previousStartDate,
          lte: previousEndDate
        },
        ...(params.centerId && { centerId: params.centerId })
      };

      // Obtener métricas del período actual
      const [currentRevenue, currentReservations, currentUsers, currentMemberships] = await Promise.all([
        // Ingresos totales (desde reservas pagadas)
        prisma.reservation.aggregate({
          where: {
            ...baseFilter,
            status: 'paid'
          },
          _sum: {
            totalPrice: true
          }
        }),
        
        // Total de reservas
        prisma.reservation.count({
          where: baseFilter
        }),
        
        // Nuevos usuarios
        prisma.user.count({
          where: {
            createdAt: {
              gte: startDate,
              lte: now
            }
          }
        }),
        
        // Nuevas membresías
        prisma.membership.count({
          where: baseFilter
        })
      ]);

      // Obtener métricas del período anterior para comparación
      const [previousRevenue, previousReservations, previousUsers, previousMemberships] = await Promise.all([
        // Ingresos del período anterior
        prisma.reservation.aggregate({
          where: {
            ...previousFilter,
            status: 'paid'
          },
          _sum: {
            totalPrice: true
          }
        }),
        
        // Reservas del período anterior
        prisma.reservation.count({
          where: previousFilter
        }),
        
        // Usuarios del período anterior
        prisma.user.count({
          where: {
            createdAt: {
              gte: previousStartDate,
              lte: previousEndDate
            }
          }
        }),
        
        // Membresías del período anterior
        prisma.membership.count({
          where: previousFilter
        })
      ]);

      // Función para calcular porcentaje de crecimiento
      const calculateGrowth = (current: number, previous: number): { value: string; isPositive: boolean } => {
        if (previous === 0) {
          return { value: current > 0 ? '+100.00' : '0.00', isPositive: current > 0 };
        }
        const growth = ((current - previous) / previous) * 100;
        return {
          value: (growth >= 0 ? '+' : '') + growth.toFixed(2),
          isPositive: growth >= 0
        };
      };
      
      // Obtener datos para gráficos de tendencias (por día)
      const dailyStats = await prisma.$queryRaw`
        SELECT 
          DATE(created_at) as date,
          COUNT(CASE WHEN table_name = 'reservations' THEN 1 END) as reservations,
          COUNT(CASE WHEN table_name = 'users' THEN 1 END) as users,
          COUNT(CASE WHEN table_name = 'memberships' THEN 1 END) as memberships,
          COALESCE(SUM(CASE WHEN table_name = 'reservations' AND status = 'paid' THEN total_price ELSE 0 END), 0) as revenue
        FROM (
          SELECT created_at, 'reservations' as table_name, total_price, status FROM reservations WHERE created_at >= ${startDate}
          UNION ALL
          SELECT created_at, 'users' as table_name, NULL as total_price, NULL as status FROM users WHERE created_at >= ${startDate}
          UNION ALL
          SELECT created_at, 'memberships' as table_name, NULL as total_price, NULL as status FROM memberships WHERE created_at >= ${startDate}
        ) combined
        GROUP BY DATE(created_at)
        ORDER BY date
      `;
      
      // Obtener top canchas más reservadas
      const topCourts = await prisma.court.findMany({
        select: {
          id: true,
          name: true,
          sportType: true,
          center: {
            select: {
              name: true
            }
          },
          _count: {
            select: {
              reservations: {
                where: {
                  createdAt: {
                    gte: startDate,
                    lte: now
                  }
                }
              }
            }
          }
        },
        orderBy: {
          reservations: {
            _count: 'desc'
          }
        },
        take: 10
      });
      
      // Obtener distribución por deportes
      const sportDistribution = await prisma.reservation.groupBy({
        by: ['courtId'],
        where: baseFilter,
        _count: {
          id: true
        }
      });
      
      // Obtener información de los deportes
      const courtSports = await prisma.court.findMany({
        select: {
          id: true,
          sportType: true
        }
      });
      
      const sportStats = sportDistribution.reduce((acc, item) => {
        const court = courtSports.find(c => c.id === item.courtId);
        if (court) {
          acc[court.sportType] = (acc[court.sportType] || 0) + item._count.id;
        }
        return acc;
      }, {} as Record<string, number>);
      
      // Obtener estados de reservas
      const reservationStatus = await prisma.reservation.groupBy({
        by: ['status'],
        where: baseFilter,
        _count: {
          id: true
        }
      });
      
      // Obtener horarios más populares
      const popularTimes = await prisma.reservation.groupBy({
        by: ['startTime'],
        where: baseFilter,
        _count: {
          id: true
        },
        orderBy: {
          _count: {
            id: 'desc'
          }
        },
        take: 10
      });
      
      // Helper function to convert BigInt to Number
      const convertBigIntToNumber = (obj: any): any => {
        if (typeof obj === 'bigint') {
          return Number(obj);
        }
        if (Array.isArray(obj)) {
          return obj.map(convertBigIntToNumber);
        }
        if (obj !== null && typeof obj === 'object') {
          const converted: any = {};
          for (const [key, value] of Object.entries(obj)) {
            converted[key] = convertBigIntToNumber(value);
          }
          return converted;
        }
        return obj;
      };

      const dashboard = {
        metrics: {
          totalRevenue: currentRevenue._sum.totalPrice || 0,
          totalReservations: currentReservations,
          totalUsers: currentUsers,
          totalMemberships: currentMemberships,
          growth: {
            revenue: calculateGrowth(
              Number(currentRevenue._sum.totalPrice || 0),
              Number(previousRevenue._sum.totalPrice || 0)
            ),
            reservations: calculateGrowth(currentReservations, previousReservations),
            users: calculateGrowth(currentUsers, previousUsers),
            memberships: calculateGrowth(currentMemberships, previousMemberships)
          }
        },
        trends: {
          daily: convertBigIntToNumber(dailyStats),
          period: params.period
        },
        charts: {
          topCourts: topCourts.map(court => ({
            id: court.id,
            name: court.name,
            sport: court.sportType,
            center: court.center.name,
            reservations: court._count.reservations
          })),
          sportDistribution: Object.entries(sportStats).map(([sport, count]) => ({
            sport,
            count
          })),
          reservationStatus: reservationStatus.map(item => ({
            status: item.status,
            count: item._count.id
          })),
          popularTimes: popularTimes.map(item => ({
            time: item.startTime,
            count: item._count.id
          }))
        },
        filters: {
          period: params.period,
          centerId: params.centerId,
          dateRange: {
            start: startDate.toISOString(),
            end: now.toISOString()
          }
        }
      };
      
      return ApiResponse.success(dashboard);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return ApiResponse.validation(
          error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          }))
        );
      }
      
      console.error('Error obteniendo dashboard:', error);
      return ApiResponse.internalError('Error interno del servidor');
    }
  })(request);
}