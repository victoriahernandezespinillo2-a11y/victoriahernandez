/**
 * API Route para obtener estadísticas de usuarios
 * GET /api/admin/users/stats - Obtener estadísticas agregadas de usuarios
 * Acceso: ADMIN únicamente
 */

import { NextRequest } from 'next/server';
import { withAdminMiddleware, ApiResponse } from '@/lib/middleware';
import { db } from '@repo/db';

/**
 * GET /api/admin/users/stats
 * Obtener estadísticas agregadas de usuarios
 * Acceso: ADMIN únicamente
 */
export async function GET(request: NextRequest) {
  return withAdminMiddleware(async (req) => {
    try {
      // Obtener todas las estadísticas en paralelo
      const [
        totalUsers,
        activeUsers,
        inactiveUsers,
        usersByRole,
        usersWithReservations,
        usersWithActiveMemberships
      ] = await Promise.all([
        // Total de usuarios
        db.user.count(),
        // Usuarios activos
        db.user.count({ where: { isActive: true } }),
        // Usuarios inactivos
        db.user.count({ where: { isActive: false } }),
        // Usuarios por rol
        db.user.groupBy({
          by: ['role'],
          _count: { id: true }
        }),
        // Usuarios con reservas
        db.user.count({
          where: {
            reservations: {
              some: {}
            }
          }
        }),
        // Usuarios con membresías activas
        db.user.count({
          where: {
            memberships: {
              some: {
                status: 'active'
              }
            }
          }
        })
      ]);

      // Formatear usuarios por rol
      const roleStats = usersByRole.reduce((acc, item) => {
        acc[item.role] = item._count.id;
        return acc;
      }, {} as Record<string, number>);

      const stats = {
        total: totalUsers,
        active: activeUsers,
        inactive: inactiveUsers,
        byRole: roleStats,
        withReservations: usersWithReservations,
        withActiveMemberships: usersWithActiveMemberships
      };

      return ApiResponse.success(stats);
    } catch (error) {
      console.error('Error obteniendo estadísticas de usuarios:', error);
      return ApiResponse.internalError('Error interno del servidor');
    }
  })(request);
}

/**
 * OPTIONS /api/admin/users/stats
 * Manejar preflight requests
 */
export async function OPTIONS() {
  return ApiResponse.success(null);
}



