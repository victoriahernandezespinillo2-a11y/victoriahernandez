/**
 * API Routes para administración general
 * GET /api/admin - Obtener información general del panel de administración
 */

import { NextRequest } from 'next/server';
import { withAdminMiddleware, ApiResponse } from '@/lib/middleware';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * GET /api/admin
 * Obtener información general del panel de administración
 * Acceso: ADMIN únicamente
 */
export async function GET(request: NextRequest) {
  return withAdminMiddleware(async (req, context) => {
    try {
      // Obtener estadísticas generales del sistema
      const [userCount, centerCount, courtCount, reservationCount, membershipCount] = await Promise.all([
        prisma.user.count(),
        prisma.center.count(),
        prisma.court.count(),
        prisma.reservation.count(),
        prisma.membership.count()
      ]);
      
      // Obtener estadísticas de los últimos 30 días
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const [newUsers, newReservations, newMemberships] = await Promise.all([
        prisma.user.count({
          where: {
            createdAt: {
              gte: thirtyDaysAgo
            }
          }
        }),
        prisma.reservation.count({
          where: {
            createdAt: {
              gte: thirtyDaysAgo
            }
          }
        }),
        prisma.membership.count({
          where: {
            createdAt: {
              gte: thirtyDaysAgo
            }
          }
        })
      ]);
      
      // Obtener reservas por estado
      const reservationsByStatus = await prisma.reservation.groupBy({
        by: ['status'],
        _count: {
          id: true
        }
      });
      
      // Obtener membresías por estado
      const membershipsByStatus = await prisma.membership.groupBy({
        by: ['status'],
        _count: {
          id: true
        }
      });
      
      const adminInfo = {
        overview: {
          totalUsers: userCount,
          totalCenters: centerCount,
          totalCourts: courtCount,
          totalReservations: reservationCount,
          totalMemberships: membershipCount
        },
        recentActivity: {
          newUsersLast30Days: newUsers,
          newReservationsLast30Days: newReservations,
          newMembershipsLast30Days: newMemberships
        },
        statusBreakdown: {
          reservations: reservationsByStatus.reduce((acc: Record<string, number>, item: any) => {
            acc[item.status] = item._count.id;
            return acc;
          }, {} as Record<string, number>),
          memberships: membershipsByStatus.reduce((acc: Record<string, number>, item: any) => {
            acc[item.status] = item._count.id;
            return acc;
          }, {} as Record<string, number>)
        },
        systemInfo: {
          version: process.env.APP_VERSION || '1.0.0',
          environment: process.env.NODE_ENV || 'development',
          lastUpdated: new Date().toISOString()
        }
      };
      
      return ApiResponse.success(adminInfo);
    } catch (error) {
      console.error('Error obteniendo información de administración:', error);
      return ApiResponse.internalError('Error interno del servidor');
    }
  })(request, {} as any);
}

/**
 * OPTIONS /api/admin
 * Manejar preflight requests
 */
export async function OPTIONS() {
  return ApiResponse.success(null);
}