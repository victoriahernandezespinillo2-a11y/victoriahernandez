/**
 * API Routes para estadísticas de notificaciones
 * GET /api/notifications/stats - Obtener estadísticas de notificaciones
 */

import { NextRequest } from 'next/server';
import { NotificationService } from '@/lib/services/notification.service';
import { withStaffMiddleware, ApiResponse } from '@/lib/middleware';
import { z } from 'zod';

const notificationService = new NotificationService();

/**
 * GET /api/notifications/stats
 * Obtener estadísticas de notificaciones
 * Acceso: STAFF o superior
 */
export async function GET(request: NextRequest) {
  return withStaffMiddleware(async (req) => {
    try {
      const { searchParams } = req.nextUrl;
      const params = Object.fromEntries(searchParams.entries());
      const stats = await notificationService.getNotificationStats(params as any);
      
      return ApiResponse.success(stats);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return ApiResponse.validation(
          error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          }))
        );
      }
      
      console.error('Error obteniendo estadísticas de notificaciones:', error);
      return ApiResponse.internalError('Error interno del servidor');
    }
  })(request);
}

/**
 * OPTIONS /api/notifications/stats
 * Manejar preflight requests
 */
export async function OPTIONS() {
  return ApiResponse.success(null);
}
