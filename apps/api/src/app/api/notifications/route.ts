/**
 * API Routes para gestión de notificaciones
 * GET /api/notifications - Obtener lista de notificaciones
 * POST /api/notifications - Crear nueva notificación
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

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');
  const allowedOrigins = process.env.NODE_ENV === 'production'
    ? ['https://polideportivo.com', 'https://admin.polideportivo.com']
    : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3003'];

  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
  };
  if (origin && allowedOrigins.includes(origin)) headers['Access-Control-Allow-Origin'] = origin;
  return new Response(null, { status: 200, headers });
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin');
  const allowedOrigins = process.env.NODE_ENV === 'production'
    ? ['https://polideportivo.com', 'https://admin.polideportivo.com']
    : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3003'];
  const corsHeaders: Record<string, string> = { 'Vary': 'Origin' };
  if (origin && allowedOrigins.includes(origin)) {
    corsHeaders['Access-Control-Allow-Origin'] = origin;
    corsHeaders['Access-Control-Allow-Credentials'] = 'true';
  }

  return withAuthMiddleware(async (req: NextRequest, context: any) => {
    try {
      const user = (context as any)?.user;
      const params = Object.fromEntries(req.nextUrl.searchParams.entries());
      if (params.limit !== undefined) params.limit = Number(params.limit) as any;
      if (params.page !== undefined) params.page = Number(params.page) as any;
      if (params.read !== undefined) params.read = (params.read === 'true') as any;

      const parsed = QuerySchema.parse(params);
      const effectiveParams = {
        ...parsed,
        ...(user?.role === 'USER' ? { userId: user.id } : {}),
      } as any;

      let result;
      try {
        result = await notificationService.getNotifications(effectiveParams);
      } catch (innerErr) {
        console.warn('Fallo getNotifications, devolviendo lista vacía:', innerErr);
        result = { notifications: [], pagination: { page: Number(parsed.page || 1), limit: Number(parsed.limit || 20), total: 0, pages: 0 } };
      }

      const res = API.success(result);
      Object.entries(corsHeaders).forEach(([k, v]) => res.headers.set(k, v));
      return res;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const res = API.validation(
          error.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
        );
        Object.entries(corsHeaders).forEach(([k, v]) => res.headers.set(k, v));
        return res;
      }
      console.error('Error GET /api/notifications:', error);
      const res = API.success({ notifications: [], pagination: { page: 1, limit: 10, total: 0, pages: 0 } });
      Object.entries(corsHeaders).forEach(([k, v]) => res.headers.set(k, v));
      return res;
    }
  })(request);
}

/**
 * POST /api/notifications
 * Crear nueva notificación
 * Acceso: STAFF o superior
 */
export async function POST(request: NextRequest) {
  return withStaffMiddleware(async (req, context: any) => {
    try {
      const user = (context as any)?.user;
      const body = await req.json();
      
      // Agregar información del creador
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
      
      console.error('Error creando notificación:', error);
      return API.internalError('Error interno del servidor');
    }
  })(request);
}