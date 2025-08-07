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
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withStaffMiddleware(async (req, { user }) => {
    try {
      const { id } = params;
      
      if (!id) {
        return ApiResponse.badRequest('ID de notificación requerido');
      }
      
      // Verificar que la notificación existe
      const notifications = await notificationService.getNotifications({ id });
      
      if (!notifications.data.length) {
        return ApiResponse.notFound('Notificación no encontrada');
      }
      
      const notification = notifications.data[0];
      
      if (notification.status === 'SENT') {
        return ApiResponse.badRequest('La notificación ya ha sido enviada');
      }
      
      if (notification.status === 'CANCELLED') {
        return ApiResponse.badRequest('No se puede enviar una notificación cancelada');
      }
      
      const result = await notificationService.sendNotification(id);
      
      return ApiResponse.success(result, 
        result.success ? 'Notificación enviada exitosamente' : 'Error enviando la notificación'
      );
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