/**
 * Servicio de gestión de notificaciones
 * Maneja envío de notificaciones por email, SMS y push
 */

import { db, Notification } from '@repo/db';
import { z } from 'zod';

// Esquemas de validación
export const CreateNotificationSchema = z.object({
  userId: z.string().uuid('ID de usuario inválido'),
  type: z.enum(['EMAIL', 'SMS', 'PUSH', 'IN_APP'], {
    errorMap: () => ({ message: 'Tipo de notificación inválido' }),
  }),
  title: z.string().min(1, 'El título es requerido'),
  message: z.string().min(1, 'El mensaje es requerido'),
  category: z.enum([
    'RESERVATION',
    'PAYMENT',
    'TOURNAMENT',
    'MAINTENANCE',
    'MEMBERSHIP',
    'SYSTEM',
    'MARKETING',
    'REMINDER'
  ]).default('SYSTEM'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  scheduledFor: z.string().datetime().optional(),
  data: z.record(z.any()).optional(),
  actionUrl: z.string().url().optional(),
});

export const SendEmailSchema = z.object({
  to: z.union([z.string().email(), z.array(z.string().email())]),
  subject: z.string().min(1, 'El asunto es requerido'),
  template: z.string().optional(),
  html: z.string().optional(),
  text: z.string().optional(),
  data: z.record(z.any()).optional(),
  attachments: z.array(z.object({
    filename: z.string(),
    content: z.string(),
    contentType: z.string().optional(),
  })).optional(),
});

export const SendSMSSchema = z.object({
  to: z.union([z.string(), z.array(z.string())]),
  message: z.string().min(1, 'El mensaje es requerido').max(160, 'El mensaje no puede exceder 160 caracteres'),
  template: z.string().optional(),
  data: z.record(z.any()).optional(),
});

export const SendPushSchema = z.object({
  userId: z.union([z.string().uuid(), z.array(z.string().uuid())]),
  title: z.string().min(1, 'El título es requerido'),
  body: z.string().min(1, 'El cuerpo es requerido'),
  icon: z.string().optional(),
  badge: z.string().optional(),
  data: z.record(z.any()).optional(),
  actionUrl: z.string().url().optional(),
});

export const GetNotificationsSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  userId: z.string().uuid().optional(),
  type: z.enum(['EMAIL', 'SMS', 'PUSH', 'IN_APP']).optional(),
  category: z.enum([
    'RESERVATION',
    'PAYMENT',
    'TOURNAMENT',
    'MAINTENANCE',
    'MEMBERSHIP',
    'SYSTEM',
    'MARKETING',
    'REMINDER'
  ]).optional(),
  status: z.enum(['PENDING', 'SENT', 'DELIVERED', 'FAILED', 'CANCELLED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  read: z.coerce.boolean().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  sortBy: z.enum(['createdAt', 'scheduledFor', 'priority']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// Interfaces para proveedores externos
interface EmailProvider {
  sendEmail(data: z.infer<typeof SendEmailSchema>): Promise<{ id: string; status: string }>;
}

interface SMSProvider {
  sendSMS(data: z.infer<typeof SendSMSSchema>): Promise<{ id: string; status: string }>;
}

interface PushProvider {
  sendPush(data: z.infer<typeof SendPushSchema>): Promise<{ id: string; status: string }>;
}

// Implementaciones mock de proveedores (en producción usar servicios reales)
class MockEmailProvider implements EmailProvider {
  async sendEmail(data: z.infer<typeof SendEmailSchema>) {
    console.log('📧 Enviando email:', data);
    // Simular envío
    await new Promise(resolve => setTimeout(resolve, 100));
    return { id: `email_${Date.now()}`, status: 'sent' };
  }
}

class MockSMSProvider implements SMSProvider {
  async sendSMS(data: z.infer<typeof SendSMSSchema>) {
    console.log('📱 Enviando SMS:', data);
    // Simular envío
    await new Promise(resolve => setTimeout(resolve, 100));
    return { id: `sms_${Date.now()}`, status: 'sent' };
  }
}

class MockPushProvider implements PushProvider {
  async sendPush(data: z.infer<typeof SendPushSchema>) {
    console.log('🔔 Enviando push:', data);
    // Simular envío
    await new Promise(resolve => setTimeout(resolve, 100));
    return { id: `push_${Date.now()}`, status: 'sent' };
  }
}

export class NotificationService {
  private emailProvider: EmailProvider;
  private smsProvider: SMSProvider;
  private pushProvider: PushProvider;

  constructor() {
    // En producción, usar proveedores reales como SendGrid, Twilio, Firebase, etc.
    this.emailProvider = new MockEmailProvider();
    this.smsProvider = new MockSMSProvider();
    this.pushProvider = new MockPushProvider();
  }

  /**
   * Crear una notificación
   */
  async createNotification(data: z.infer<typeof CreateNotificationSchema>) {
    const validatedData = CreateNotificationSchema.parse(data);

    // Verificar que el usuario existe
    const user = await db.user.findUnique({
      where: { id: validatedData.userId },
      select: {
        id: true,
        email: true,
        phone: true,
        notificationPreferences: true,
      },
    });

    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    const notification = await db.notification.create({
      data: {
        userId: validatedData.userId,
        type: validatedData.type,
        title: validatedData.title,
        message: validatedData.message,
        category: validatedData.category,
        priority: validatedData.priority,
        scheduledFor: validatedData.scheduledFor ? new Date(validatedData.scheduledFor) : new Date(),
        data: validatedData.data || {},
        actionUrl: validatedData.actionUrl,
        status: validatedData.scheduledFor ? 'PENDING' : 'SENT',
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    // Si no está programada, enviar inmediatamente
    if (!validatedData.scheduledFor) {
      await this.sendNotification(notification.id);
    }

    return notification;
  }

  /**
   * Enviar notificación por ID
   */
  async sendNotification(notificationId: string) {
    const notification = await db.notification.findUnique({
      where: { id: notificationId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            notificationPreferences: true,
          },
        },
      },
    });

    if (!notification) {
      throw new Error('Notificación no encontrada');
    }

    if (notification.status !== 'PENDING') {
      throw new Error('La notificación ya fue enviada o cancelada');
    }

    try {
      let externalId: string | undefined;
      let status = 'SENT';

      switch (notification.type) {
        case 'EMAIL':
          if (notification.user.email) {
            const result = await this.emailProvider.sendEmail({
              to: notification.user.email,
              subject: notification.title,
              html: notification.message,
              data: notification.data,
            });
            externalId = result.id;
          }
          break;

        case 'SMS':
          if (notification.user.phone) {
            const result = await this.smsProvider.sendSMS({
              to: notification.user.phone,
              message: `${notification.title}: ${notification.message}`,
              data: notification.data,
            });
            externalId = result.id;
          }
          break;

        case 'PUSH':
          const result = await this.pushProvider.sendPush({
            userId: notification.userId,
            title: notification.title,
            body: notification.message,
            data: notification.data,
            actionUrl: notification.actionUrl,
          });
          externalId = result.id;
          break;

        case 'IN_APP':
          // Para notificaciones in-app, solo marcar como enviada
          status = 'DELIVERED';
          break;
      }

      // Actualizar estado de la notificación
      const updatedNotification = await db.notification.update({
        where: { id: notificationId },
        data: {
          status,
          sentAt: new Date(),
          externalId,
        },
      });

      return updatedNotification;
    } catch (error) {
      // Marcar como fallida
      await db.notification.update({
        where: { id: notificationId },
        data: {
          status: 'FAILED',
          error: error instanceof Error ? error.message : 'Error desconocido',
        },
      });

      throw error;
    }
  }

  /**
   * Enviar email directamente
   */
  async sendEmail(data: z.infer<typeof SendEmailSchema>) {
    const validatedData = SendEmailSchema.parse(data);
    
    try {
      const result = await this.emailProvider.sendEmail(validatedData);
      return result;
    } catch (error) {
      console.error('Error enviando email:', error);
      throw error;
    }
  }

  /**
   * Enviar SMS directamente
   */
  async sendSMS(data: z.infer<typeof SendSMSSchema>) {
    const validatedData = SendSMSSchema.parse(data);
    
    try {
      const result = await this.smsProvider.sendSMS(validatedData);
      return result;
    } catch (error) {
      console.error('Error enviando SMS:', error);
      throw error;
    }
  }

  /**
   * Enviar notificación push directamente
   */
  async sendPush(data: z.infer<typeof SendPushSchema>) {
    const validatedData = SendPushSchema.parse(data);
    
    try {
      const result = await this.pushProvider.sendPush(validatedData);
      return result;
    } catch (error) {
      console.error('Error enviando push:', error);
      throw error;
    }
  }

  /**
   * Obtener notificaciones con filtros
   */
  async getNotifications(params: z.infer<typeof GetNotificationsSchema>) {
    const {
      page,
      limit,
      userId,
      type,
      category,
      status,
      priority,
      read,
      startDate,
      endDate,
      sortBy,
      sortOrder,
    } = GetNotificationsSchema.parse(params);

    const skip = (page - 1) * limit;

    // Construir filtros
    const where: any = {};

    if (userId) {
      where.userId = userId;
    }

    if (type) {
      where.type = type;
    }

    if (category) {
      where.category = category;
    }

    if (status) {
      where.status = status;
    }

    if (priority) {
      where.priority = priority;
    }

    if (read !== undefined) {
      where.readAt = read ? { not: null } : null;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    // Obtener notificaciones y total
    const [notifications, total] = await Promise.all([
      db.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      }),
      db.notification.count({ where }),
    ]);

    return {
      notifications,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Marcar notificación como leída
   */
  async markAsRead(notificationId: string, userId?: string) {
    const where: any = { id: notificationId };
    if (userId) {
      where.userId = userId;
    }

    const notification = await db.notification.findUnique({ where });

    if (!notification) {
      throw new Error('Notificación no encontrada');
    }

    if (notification.readAt) {
      return notification; // Ya está leída
    }

    const updatedNotification = await db.notification.update({
      where: { id: notificationId },
      data: {
        readAt: new Date(),
      },
    });

    return updatedNotification;
  }

  /**
   * Marcar todas las notificaciones como leídas
   */
  async markAllAsRead(userId: string) {
    const result = await db.notification.updateMany({
      where: {
        userId,
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
    });

    return { count: result.count };
  }

  /**
   * Cancelar notificación programada
   */
  async cancelNotification(notificationId: string) {
    const notification = await db.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new Error('Notificación no encontrada');
    }

    if (notification.status !== 'PENDING') {
      throw new Error('Solo se pueden cancelar notificaciones pendientes');
    }

    const cancelledNotification = await db.notification.update({
      where: { id: notificationId },
      data: {
        status: 'CANCELLED',
      },
    });

    return cancelledNotification;
  }

  /**
   * Obtener estadísticas de notificaciones
   */
  async getNotificationStats(userId?: string) {
    const where = userId ? { userId } : {};
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [total, unread, sent, failed, monthlyCount] = await Promise.all([
      db.notification.count({ where }),
      db.notification.count({
        where: { ...where, readAt: null, type: 'IN_APP' },
      }),
      db.notification.count({
        where: { ...where, status: 'SENT' },
      }),
      db.notification.count({
        where: { ...where, status: 'FAILED' },
      }),
      db.notification.count({
        where: {
          ...where,
          createdAt: { gte: startOfMonth },
        },
      }),
    ]);

    // Estadísticas por tipo
    const byType = await db.notification.groupBy({
      by: ['type'],
      where,
      _count: { type: true },
    });

    // Estadísticas por categoría
    const byCategory = await db.notification.groupBy({
      by: ['category'],
      where,
      _count: { category: true },
    });

    return {
      total,
      unread,
      sent,
      failed,
      monthlyCount,
      byType: byType.map(item => ({
        type: item.type,
        count: item._count.type,
      })),
      byCategory: byCategory.map(item => ({
        category: item.category,
        count: item._count.category,
      })),
    };
  }

  /**
   * Procesar notificaciones programadas
   */
  async processScheduledNotifications() {
    const now = new Date();
    
    const pendingNotifications = await db.notification.findMany({
      where: {
        status: 'PENDING',
        scheduledFor: {
          lte: now,
        },
      },
      take: 100, // Procesar en lotes
    });

    const results = [];
    for (const notification of pendingNotifications) {
      try {
        const result = await this.sendNotification(notification.id);
        results.push({ id: notification.id, status: 'success', result });
      } catch (error) {
        results.push({ 
          id: notification.id, 
          status: 'error', 
          error: error instanceof Error ? error.message : 'Error desconocido' 
        });
      }
    }

    return {
      processed: results.length,
      successful: results.filter(r => r.status === 'success').length,
      failed: results.filter(r => r.status === 'error').length,
      results,
    };
  }
}