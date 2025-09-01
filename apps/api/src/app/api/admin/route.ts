/**
 * API Routes para administración general
 * GET /api/admin - Obtener información general del panel de administración
 */

import { NextRequest } from 'next/server';
import { withAdminMiddleware, ApiResponse } from '@/lib/middleware';
import { db } from '@repo/db';

/**
 * GET /api/admin
 * Obtener información general del panel de administración
 * Acceso: ADMIN únicamente
 */
export async function GET(request: NextRequest) {
  return withAdminMiddleware(async (req) => {
    try {
      // Obtener estadísticas generales del sistema
      const [userCount, centerCount, courtCount, reservationCount, membershipCount] = await Promise.all([
        (db as any).user.count(),
        (db as any).center.count(),
        (db as any).court.count(),
        (db as any).reservation.count(),
        (db as any).membership.count()
      ]);
      
      // Obtener estadísticas de los últimos 30 días
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const [newUsers, newReservations, newMemberships] = await Promise.all([
        (db as any).user.count({
          where: {
            createdAt: {
              gte: thirtyDaysAgo
            }
          }
        }),
        (db as any).reservation.count({
          where: {
            createdAt: {
              gte: thirtyDaysAgo
            }
          }
        }),
        (db as any).membership.count({
          where: {
            createdAt: {
              gte: thirtyDaysAgo
            }
          }
        })
      ]);
      
      // Obtener reservas por estado
      const reservationsByStatus = await (db as any).reservation.groupBy({
        by: ['status'],
        _count: {
          id: true
        }
      });
      
      // Obtener membresías por estado
      const membershipsByStatus = await (db as any).membership.groupBy({
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
  })(request);
}

/**
 * OPTIONS /api/admin
 * Manejar preflight requests
 */
export async function OPTIONS() {
  return ApiResponse.success(null);
}
