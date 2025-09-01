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
  request: NextRequest
) {
  return withAuthMiddleware(async (req) => {
    const user = (req as any).user as { id: string; role: 'USER'|'STAFF'|'ADMIN' };
    try {
      const pathname = req.nextUrl.pathname;
      const id = pathname.split('/').pop() as string;
      
      if (!id) {
        return ApiResponse.badRequest('ID de notificación requerido');
      }
      
      // Obtener la notificación (respetando schema: page/limit/sort)
      const list = await notificationService.getNotifications({ id, page: 1, limit: 1, sortBy: 'createdAt', sortOrder: 'desc' } as any);
      const items = Array.isArray((list as any).notifications) ? (list as any).notifications : [];
      if (!items.length) {
        return ApiResponse.notFound('Notificación no encontrada');
      }
      const notification = items[0];
      
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
  request: NextRequest
) {
  return withAuthMiddleware(async (req) => {
    const user = (req as any).user as { id: string; role: 'USER'|'STAFF'|'ADMIN' };
    try {
      const pathname = req.nextUrl.pathname;
      const id = pathname.split('/').pop() as string;
      
      if (!id) {
        return ApiResponse.badRequest('ID de notificación requerido');
      }
      
      // Si existe tabla de notificaciones, validar ownership cuando el rol sea USER
      try {
        const details = await notificationService.getNotifications({ id, page: 1, limit: 1, sortBy: 'createdAt', sortOrder: 'desc' } as any);
        const exists = Array.isArray((details as any)?.notifications) ? (details as any).notifications[0] : undefined;
        if (exists) {
          if (user.role === 'USER' && exists.userId && exists.userId !== user.id) {
            return ApiResponse.forbidden('No tienes permisos para modificar esta notificación');
          }
        }
      } catch {
        // Si falla la consulta de detalles, continuamos y delegamos al servicio markAsRead que es tolerante
      }
      
      const result = await notificationService.markAsRead(id, user.role === 'USER' ? user.id : undefined);
      return ApiResponse.success(result);
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
  request: NextRequest
) {
  return withStaffMiddleware(async (req) => {
    try {
      const pathname = req.nextUrl.pathname;
      const id = pathname.split('/').pop() as string;
      
      if (!id) {
        return ApiResponse.badRequest('ID de notificación requerido');
      }
      
      const result = await notificationService.cancelNotification(id);
      return ApiResponse.success(result);
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