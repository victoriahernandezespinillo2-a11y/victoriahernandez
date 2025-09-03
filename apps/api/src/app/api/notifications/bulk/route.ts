/**
 * API Routes para envío masivo de notificaciones
 * POST /api/notifications/bulk - Enviar notificaciones masivas por email o SMS
 */

import { NextRequest } from 'next/server';
import { NotificationService, SendEmailSchema, SendSMSSchema } from '@/lib/services/notification.service';
import { withStaffMiddleware, ApiResponse } from '@/lib/middleware';
import { z } from 'zod';

const notificationService = new NotificationService();

// Schema para envío masivo
const BulkNotificationSchema = z.object({
  type: z.enum(['email', 'sms']),
  recipients: z.array(z.string()).min(1, 'Al menos un destinatario es requerido'),
  subject: z.string().optional(),
  message: z.string().min(1, 'El mensaje es requerido'),
  template: z.string().optional(),
  data: z.record(z.any()).optional(),
});

/**
 * POST /api/notifications/bulk
 * Enviar notificaciones masivas por email o SMS
 * Acceso: STAFF o superior
 */
export async function POST(request: NextRequest) {
  return withStaffMiddleware(async (req) => {
    try {
      const user = (req as any).user;
      const body = await req.json();
      
      // Validar el cuerpo de la petición
      const validatedData = BulkNotificationSchema.parse(body);
      
      let result;
      
      if (validatedData.type === 'email') {
        // Validar que todos los destinatarios sean emails válidos
        const validEmails = validatedData.recipients.filter(email => {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          return emailRegex.test(email.trim());
        });
        
        if (validEmails.length !== validatedData.recipients.length) {
          return ApiResponse.badRequest('Algunos emails no son válidos');
        }
        
        const emailData = {
          to: validEmails,
          subject: validatedData.subject || 'Notificación del Sistema',
          message: validatedData.message,
          template: validatedData.template,
          data: validatedData.data,
        };
        
        result = await notificationService.sendBulkEmail(emailData);
      } else if (validatedData.type === 'sms') {
        // Validar que todos los destinatarios sean números de teléfono válidos
        const validPhones = validatedData.recipients.filter(phone => {
          const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
          return phoneRegex.test(phone.trim()) && phone.trim().length >= 8;
        });
        
        if (validPhones.length !== validatedData.recipients.length) {
          return ApiResponse.badRequest('Algunos números de teléfono no son válidos');
        }
        
        const smsData = {
          to: validPhones,
          message: validatedData.message,
          template: validatedData.template,
          data: validatedData.data,
        };
        
        result = await notificationService.sendBulkSms(smsData);
      }
      
      return ApiResponse.success({
        message: `Notificaciones ${validatedData.type} enviadas exitosamente`,
        type: validatedData.type,
        totalRecipients: validatedData.recipients.length,
        result
      });
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
      
      console.error('Error enviando notificaciones masivas:', error);
      return ApiResponse.internalError('Error interno del servidor');
    }
  })(request);
}

/**
 * OPTIONS /api/notifications/bulk
 * Manejar preflight requests
 */
export async function OPTIONS() {
  return ApiResponse.success(null);
}
