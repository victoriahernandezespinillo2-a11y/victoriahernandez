/**
 * API Routes para gestiÃ³n de notificaciones
 * GET /api/notifications - Obtener lista de notificaciones
 * POST /api/notifications - Crear nueva notificaciÃ³n
 */

// Forzar runtime Node.js para compatibilidad con Prisma
export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { z } from 'zod';
import {
  withAuthMiddleware,
  withStaffMiddleware,
  ApiResponse as API,
} from '@/lib/middleware';
import {
  NotificationService,
  CreateNotificationSchema,
  GetNotificationsSchema,
} from '@/lib/services/notification.service';

const notificationService = new NotificationService();

const QuerySchema = GetNotificationsSchema.pick({
  page: true,
  limit: true,
  userId: true,
  type: true,
  category: true,
  status: true,
  priority: true,
  read: true,
  startDate: true,
  endDate: true,
  sortBy: true,
  sortOrder: true,
});

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}

export async function GET(request: NextRequest) {
  return withAuthMiddleware(async (req: NextRequest) => {
    try {
      const user = (req as any).user;
      console.log('ðŸ” [NOTIFICATIONS] Usuario autenticado:', { 
        id: user?.id, 
        role: user?.role, 
        email: user?.email,
        isUuid: user?.id ? /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(user.id) : false
      });
      const params = Object.fromEntries(req.nextUrl.searchParams.entries());
      if (params.limit !== undefined) params.limit = Number(params.limit) as any;
      if (params.page !== undefined) params.page = Number(params.page) as any;
      if (params.read !== undefined) params.read = (params.read === 'true') as any;

      const parsed = QuerySchema.parse(params);
      
      // Validar que el user.id sea un UUID vÃ¡lido antes de usarlo
      let effectiveParams = { ...parsed } as any;
      if (user?.role === 'USER' && user?.id) {
        try {
          // Validar que el userId sea un UUID vÃ¡lido
          z.string().uuid().parse(user.id);
          effectiveParams.userId = user.id;
        } catch (uuidError) {
          console.warn('Usuario con ID invÃ¡lido:', user.id, uuidError);
          // No agregar userId si no es vÃ¡lido, fallback a bÃºsqueda general
        }
      }

      const result = await notificationService.getNotifications(effectiveParams);

      const res = API.success(result);
      return res;
    } catch (error) {
      console.warn('GET /api/notifications fallback por error:', error);
      // Nunca 500: devolvemos vacío correctamente tipado
      return API.success({ notifications: [], pagination: { page: 1, limit: 10, total: 0, pages: 0 } });
    }
  })(request);
}

/**
 * POST /api/notifications
 * Crear nueva notificaciÃ³n
 * Acceso: STAFF o superior
 */
export async function POST(request: NextRequest) {
  return withStaffMiddleware(async (req) => {
    try {
      const user = (req as any).user;
      const body = await req.json();
      
      // Agregar informaciÃ³n del creador
      const notificationData = {
        ...body,
        createdBy: user.id
      };
      
      const notification = await notificationService.createNotification(notificationData);
      
      return API.success(notification);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return API.validation(
          error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          }))
        );
      }
      
      if (error instanceof Error) {
        if (error.message.includes('no encontrado')) {
          return API.notFound(error.message);
        }
      }
      
      console.error('Error creando notificaciÃ³n:', error);
      return API.internalError('Error interno del servidor');
    }
  })(request);
}
