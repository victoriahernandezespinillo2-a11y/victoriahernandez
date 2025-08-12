/**
 * API Routes para envío de notificaciones
 * POST /api/notifications/[id]/send - Enviar notificación específica
 */

import { NextRequest } from 'next/server';
import { NotificationService } from '@/lib/services/notification.service';
import { withStaffMiddleware, ApiResponse } from '@/lib/middleware';

const notificationService = new NotificationService();

/**
 * POST /api/notifications/[id]/send
 * Enviar notificación específica
 * Acceso: STAFF o superior
 */
export async function POST(
  request: NextRequest
) {
  return withStaffMiddleware(async (req) => {
    try {
      const pathname = req.nextUrl.pathname;
      const id = pathname.split('/').slice(-2, -1)[0] as string;
      
      if (!id) {
        return ApiResponse.badRequest('ID de notificación requerido');
      }
      
      // Verificar que la notificación existe
      const list = await notificationService.getNotifications({ id, page: 1, limit: 1, sortBy: 'createdAt', sortOrder: 'desc' } as any);
      const items = Array.isArray((list as any).notifications) ? (list as any).notifications : [];
      if (!items.length) {
        return ApiResponse.notFound('Notificación no encontrada');
      }
      
      const notification = items[0];
      
      if (notification.status === 'SENT') {
        return ApiResponse.badRequest('La notificación ya ha sido enviada');
      }
      
      if (notification.status === 'CANCELLED') {
        return ApiResponse.badRequest('No se puede enviar una notificación cancelada');
      }
      
      const result = await notificationService.sendNotification(id);
      
      return ApiResponse.success(result);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('no encontrada')) {
          return ApiResponse.notFound('Notificación no encontrada');
        }
        if (error.message.includes('enviada')) {
          return ApiResponse.badRequest('La notificación ya ha sido enviada');
        }
        if (error.message.includes('cancelada')) {
          return ApiResponse.badRequest('No se puede enviar una notificación cancelada');
        }
      }
      
      console.error('Error enviando notificación:', error);
      return ApiResponse.internalError('Error interno del servidor');
    }
  })(request);
}

/**
 * OPTIONS /api/notifications/[id]/send
 * Manejar preflight requests
 */
export async function OPTIONS() {
  return ApiResponse.success(null);
}