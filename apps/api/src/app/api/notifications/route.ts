/**
 * API Routes para gestión de notificaciones
 * GET /api/notifications - Obtener lista de notificaciones
 * POST /api/notifications - Crear nueva notificación
 */

import { NextRequest } from 'next/server';
import { NotificationService, CreateNotificationSchema, GetNotificationsSchema } from '@/lib/services/notification.service';
import { withAuthMiddleware, withStaffMiddleware, ApiResponse } from '@/lib/middleware';
import { z } from 'zod';

const notificationService = new NotificationService();

/**
 * GET /api/notifications
 * Obtener lista de notificaciones
 * Acceso: Usuario autenticado (usuarios ven solo sus notificaciones, STAFF+ ven todas)
 */
export async function GET(request: NextRequest) {
  return withAuthMiddleware(async (req, { user }) => {
    try {
      const { searchParams } = req.nextUrl;
      const params = Object.fromEntries(searchParams.entries());
      
      // Si no es STAFF o ADMIN, solo puede ver sus propias notificaciones
      if (user.role === 'USER') {
        params.userId = user.id;
      }
      
      const result = await notificationService.getNotifications(params);
      
      return ApiResponse.success(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return ApiResponse.validation(
          error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          }))
        );
      }
      
      console.error('Error obteniendo notificaciones:', error);
      return ApiResponse.internalError('Error interno del servidor');
    }
  })(request);
}

/**
 * POST /api/notifications
 * Crear nueva notificación
 * Acceso: STAFF o superior
 */
export async function POST(request: NextRequest) {
  return withStaffMiddleware(async (req, { user }) => {
    try {
      const body = await req.json();
      
      // Agregar información del creador
      const notificationData = {
        ...body,
        createdBy: user.id
      };
      
      const notification = await notificationService.createNotification(notificationData);
      
      return ApiResponse.success(notification);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return ApiResponse.validation(
          error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          }))
        );
      }
      
      if (error instanceof Error) {
        if (error.message.includes('no encontrado')) {
          return ApiResponse.notFound(error.message);
        }
      }
      
      console.error('Error creando notificación:', error);
      return ApiResponse.internalError('Error interno del servidor');
    }
  })(request);
}

/**
 * OPTIONS /api/notifications
 * Manejar preflight requests
 */
export async function OPTIONS() {
  return ApiResponse.success(null);
}