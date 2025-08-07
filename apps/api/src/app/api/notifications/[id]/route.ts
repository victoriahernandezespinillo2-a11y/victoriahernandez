/**
 * API Routes para notificación específica
 * GET /api/notifications/[id] - Obtener notificación por ID
 * PUT /api/notifications/[id] - Marcar notificación como leída
 * DELETE /api/notifications/[id] - Cancelar notificación
 */

import { NextRequest } from 'next/server';
import { NotificationService } from '@/lib/services/notification.service';
import { withAuthMiddleware, withStaffMiddleware, ApiResponse } from '@/lib/middleware';

const notificationService = new NotificationService();

/**
 * GET /api/notifications/[id]
 * Obtener notificación por ID
 * Acceso: Usuario autenticado (propietario de la notificación o STAFF+)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuthMiddleware(async (req, { user }) => {
    try {
      const { id } = params;
      
      if (!id) {
        return ApiResponse.badRequest('ID de notificación requerido');
      }
      
      // Obtener la notificación
      const notifications = await notificationService.getNotifications({ id });
      
      if (!notifications.data.length) {
        return ApiResponse.notFound('Notificación no encontrada');
      }
      
      const notification = notifications.data[0];
      
      // Verificar permisos: solo el destinatario o STAFF+ pueden ver la notificación
      if (user.role === 'USER' && notification.userId !== user.id) {
        return ApiResponse.forbidden('No tienes permisos para ver esta notificación');
      }
      
      return ApiResponse.success(notification);
    } catch (error) {
      console.error('Error obteniendo notificación:', error);
      return ApiResponse.internalError('Error interno del servidor');
    }
  })(request);
}

/**
 * PUT /api/notifications/[id]
 * Marcar notificación como leída
 * Acceso: Usuario autenticado (propietario de la notificación)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuthMiddleware(async (req, { user }) => {
    try {
      const { id } = params;
      
      if (!id) {
        return ApiResponse.badRequest('ID de notificación requerido');
      }
      
      // Verificar que la notificación existe y pertenece al usuario
      const notifications = await notificationService.getNotifications({ id });
      
      if (!notifications.data.length) {
        return ApiResponse.notFound('Notificación no encontrada');
      }
      
      const notification = notifications.data[0];
      
      if (user.role === 'USER' && notification.userId !== user.id) {
        return ApiResponse.forbidden('No tienes permisos para modificar esta notificación');
      }
      
      const result = await notificationService.markAsRead(id);
      
      return ApiResponse.success(result, 'Notificación marcada como leída');
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('no encontrada')) {
          return ApiResponse.notFound('Notificación no encontrada');
        }
        if (error.message.includes('ya leída')) {
          return ApiResponse.badRequest('La notificación ya está marcada como leída');
        }
      }
      
      console.error('Error marcando notificación como leída:', error);
      return ApiResponse.internalError('Error interno del servidor');
    }
  })(request);
}

/**
 * DELETE /api/notifications/[id]
 * Cancelar notificación
 * Acceso: STAFF o superior
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withStaffMiddleware(async (req) => {
    try {
      const { id } = params;
      
      if (!id) {
        return ApiResponse.badRequest('ID de notificación requerido');
      }
      
      const result = await notificationService.cancelNotification(id);
      
      return ApiResponse.success(result, 'Notificación cancelada exitosamente');
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('no encontrada')) {
          return ApiResponse.notFound('Notificación no encontrada');
        }
        if (error.message.includes('cancelada')) {
          return ApiResponse.badRequest('La notificación ya está cancelada');
        }
        if (error.message.includes('enviada')) {
          return ApiResponse.badRequest('No se puede cancelar una notificación ya enviada');
        }
      }
      
      console.error('Error cancelando notificación:', error);
      return ApiResponse.internalError('Error interno del servidor');
    }
  })(request);
}

/**
 * OPTIONS /api/notifications/[id]
 * Manejar preflight requests
 */
export async function OPTIONS() {
  return ApiResponse.success(null);
}