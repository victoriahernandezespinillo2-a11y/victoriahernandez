/**
 * API Routes para envío directo de notificaciones
 * POST /api/notifications/send - Enviar notificación directamente (sin guardar)
 */

import { NextRequest } from 'next/server';
import { NotificationService, SendEmailSchema, SendSMSSchema, SendPushSchema } from '@/lib/services/notification.service';
import { withStaffMiddleware, ApiResponse } from '@/lib/middleware';
import { z } from 'zod';

const notificationService = new NotificationService();

// Schema para determinar el tipo de envío
const SendDirectSchema = z.object({
  type: z.enum(['email', 'sms', 'push']),
  data: z.union([SendEmailSchema, SendSMSSchema, SendPushSchema])
});

/**
 * POST /api/notifications/send
 * Enviar notificación directamente (sin guardar en base de datos)
 * Acceso: STAFF o superior
 */
export async function POST(request: NextRequest) {
  return withStaffMiddleware(async (req, context: any) => {
    try {
      const user = (context as any)?.user;
      const body = await req.json();
      const { type, data } = SendDirectSchema.parse(body);
      
      let result;
      
      switch (type) {
        case 'email':
          result = await notificationService.sendEmail(data as z.infer<typeof SendEmailSchema>);
          break;
        case 'sms':
          result = await notificationService.sendSMS(data as z.infer<typeof SendSMSSchema>);
          break;
        case 'push':
          result = await notificationService.sendPush(data as z.infer<typeof SendPushSchema>);
          break;
        default:
          return ApiResponse.badRequest('Tipo de notificación no válido');
      }
      
      return ApiResponse.success(result, 
        result.success ? `${type.toUpperCase()} enviado exitosamente` : `Error enviando ${type.toUpperCase()}`
      );
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
        if (error.message.includes('inválido')) {
          return ApiResponse.badRequest(error.message);
        }
      }
      
      console.error('Error enviando notificación directa:', error);
      return ApiResponse.internalError('Error interno del servidor');
    }
  })(request);
}

/**
 * OPTIONS /api/notifications/send
 * Manejar preflight requests
 */
export async function OPTIONS() {
  return ApiResponse.success(null);
}