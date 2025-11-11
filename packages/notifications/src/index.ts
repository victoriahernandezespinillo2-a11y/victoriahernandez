// Exportar servicios de email
export {
  EmailService,
  emailService,
  EmailUtils,
  EMAIL_TEMPLATES,
  type EmailData,
  type BulkEmailData,
  type EmailTemplate,
  type EmailTemplateName,
} from './email';

// Exportar servicios de SMS
export {
  SmsService,
  smsService,
  SmsUtils,
  SMS_TEMPLATES,
  SMS_STATUS,
  type SmsData,
  type BulkSmsData,
  type SmsTemplate,
  type SmsTemplateName,
  type SmsStatus,
} from './sms';

// Importar servicios y tipos para uso interno
import { EmailService, emailService } from './email';
import { SmsService, smsService } from './sms';
import type { EmailData, BulkEmailData } from './email';
import type { SmsData, BulkSmsData } from './sms';

// Servicio unificado de notificaciones
export class NotificationService {
  private email: EmailService;
  private sms: SmsService;

  constructor() {
    this.email = emailService;
    this.sms = smsService;
  }

  // Enviar notificación por email
  async sendEmail(data: EmailData) {
    return await this.email.sendEmail(data);
  }

  // Enviar notificación por SMS
  async sendSms(data: SmsData) {
    return await this.sms.sendSms(data);
  }

  // Enviar notificación usando plantilla de email
  async sendEmailTemplate(
    templateName: string,
    to: string,
    variables: Record<string, string>,
    options?: { from?: string; attachments?: EmailData['attachments']; text?: string }
  ) {
    return await this.email.sendTemplateEmail(templateName, to, variables, options);
  }

  // Enviar notificación usando plantilla de SMS
  async sendSmsTemplate(templateName: string, to: string, variables: Record<string, string>) {
    return await this.sms.sendTemplateSms(templateName, to, variables);
  }

  // Enviar notificación multicanal (email + SMS)
  async sendMultiChannelNotification({
    email,
    sms,
    emailTemplate,
    smsTemplate,
    variables,
  }: {
    email?: string;
    sms?: string;
    emailTemplate?: string;
    smsTemplate?: string;
    variables: Record<string, string>;
  }): Promise<{
    email?: { success: boolean; messageId?: string; error?: string };
    sms?: { success: boolean; messageId?: string; error?: string };
  }> {
    const results: {
      email?: { success: boolean; messageId?: string; error?: string };
      sms?: { success: boolean; messageId?: string; error?: string };
    } = {};

    // Enviar email si se proporciona
    if (email && emailTemplate) {
      results.email = await this.sendEmailTemplate(emailTemplate, email, variables);
    }

    // Enviar SMS si se proporciona
    if (sms && smsTemplate) {
      results.sms = await this.sendSmsTemplate(smsTemplate, sms, variables);
    }

    return results;
  }

  // Enviar emails masivos
  async sendBulkEmail(data: BulkEmailData) {
    return await this.email.sendBulkEmail(data);
  }

  // Enviar SMS masivos
  async sendBulkSms(data: BulkSmsData) {
    return await this.sms.sendBulkSms(data);
  }

  // Verificar configuración de servicios
  async verifyServices(): Promise<{
    email: boolean;
    sms: boolean;
  }> {
    const emailStatus = await this.email.verifyConnection();
    // Para SMS, podríamos hacer una verificación similar si Twilio lo permite
    const smsStatus = true; // Asumimos que está configurado correctamente

    return {
      email: emailStatus,
      sms: smsStatus,
    };
  }
}

// Instancia singleton del servicio unificado
export const notificationService = new NotificationService();

// Tipos útiles
export interface NotificationChannel {
  email: 'email';
  sms: 'sms';
  push: 'push';
}

export interface NotificationPreferences {
  email: boolean;
  sms: boolean;
  push: boolean;
  marketing: boolean;
  reservationReminders: boolean;
  membershipUpdates: boolean;
  tournamentNotifications: boolean;
}

export interface NotificationResult {
  success: boolean;
  channel: 'email' | 'sms' | 'push';
  messageId?: string;
  error?: string;
  timestamp: Date;
}

// Utilidades para notificaciones
export const NotificationUtils = {
  // Validar preferencias de notificación
  validatePreferences: (preferences: Partial<NotificationPreferences>): NotificationPreferences => {
    return {
      email: preferences.email ?? true,
      sms: preferences.sms ?? false,
      push: preferences.push ?? true,
      marketing: preferences.marketing ?? false,
      reservationReminders: preferences.reservationReminders ?? true,
      membershipUpdates: preferences.membershipUpdates ?? true,
      tournamentNotifications: preferences.tournamentNotifications ?? true,
    };
  },

  // Determinar canales de notificación basados en preferencias
  getNotificationChannels: (
    preferences: NotificationPreferences,
    notificationType: 'reservation' | 'membership' | 'tournament' | 'marketing'
  ): ('email' | 'sms')[] => {
    const channels: ('email' | 'sms')[] = [];

    switch (notificationType) {
      case 'reservation':
        if (preferences.reservationReminders) {
          if (preferences.email) channels.push('email');
          if (preferences.sms) channels.push('sms');
        }
        break;
      case 'membership':
        if (preferences.membershipUpdates) {
          if (preferences.email) channels.push('email');
          if (preferences.sms) channels.push('sms');
        }
        break;
      case 'tournament':
        if (preferences.tournamentNotifications) {
          if (preferences.email) channels.push('email');
          if (preferences.sms) channels.push('sms');
        }
        break;
      case 'marketing':
        if (preferences.marketing) {
          if (preferences.email) channels.push('email');
          // No enviar SMS de marketing por defecto
        }
        break;
    }

    return channels;
  },

  // Formatear variables para plantillas
  formatTemplateVariables: (data: Record<string, any>): Record<string, string> => {
    const formatted: Record<string, string> = {};

    for (const [key, value] of Object.entries(data)) {
      if (value instanceof Date) {
        formatted[key] = value.toLocaleDateString('es-ES');
      } else if (typeof value === 'number') {
        formatted[key] = value.toString();
      } else if (typeof value === 'boolean') {
        formatted[key] = value ? 'Sí' : 'No';
      } else {
        formatted[key] = String(value || '');
      }
    }

    return formatted;
  },

  // Generar ID de notificación único
  generateNotificationId: (): string => {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `notif_${timestamp}_${random}`;
  },

  // Calcular mejor momento para enviar notificación
  calculateOptimalSendTime: (userTimezone = 'Europe/Madrid'): Date => {
    const now = new Date();
    const userTime = new Date(now.toLocaleString('en-US', { timeZone: userTimezone }));
    const hour = userTime.getHours();

    // Si es muy temprano (antes de las 8) o muy tarde (después de las 22)
    if (hour < 8) {
      userTime.setHours(8, 0, 0, 0);
    } else if (hour > 22) {
      userTime.setDate(userTime.getDate() + 1);
      userTime.setHours(8, 0, 0, 0);
    }
    // Si es horario laboral, enviar inmediatamente

    return userTime;
  },
};

// Constantes de configuración
export const NOTIFICATION_CONFIG = {
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 5000,
  BATCH_SIZE: 100,
  RATE_LIMIT_PER_MINUTE: 60,
  DEFAULT_TIMEZONE: 'Europe/Madrid',
} as const;

// Errores personalizados
export class NotificationError extends Error {
  constructor(
    message: string,
    public channel: 'email' | 'sms',
    public code?: string
  ) {
    super(message);
    this.name = 'NotificationError';
  }
}

// Middleware para rate limiting
export const rateLimitNotifications = () => {
  const requests = new Map<string, number[]>();

  return (identifier: string): boolean => {
    const now = Date.now();
    const windowStart = now - 60000; // 1 minuto

    if (!requests.has(identifier)) {
      requests.set(identifier, []);
    }

    const userRequests = requests.get(identifier)!;
    
    // Limpiar requests antiguos
    const validRequests = userRequests.filter(time => time > windowStart);
    
    if (validRequests.length >= NOTIFICATION_CONFIG.RATE_LIMIT_PER_MINUTE) {
      return false; // Rate limit excedido
    }

    validRequests.push(now);
    requests.set(identifier, validRequests);
    
    return true;
  };
};

// Función para procesar cola de notificaciones
export const processNotificationQueue = async (
  notifications: Array<{
    type: 'email' | 'sms';
    template: string;
    recipient: string;
    variables: Record<string, string>;
  }>
): Promise<NotificationResult[]> => {
  const results: NotificationResult[] = [];
  const service = notificationService;

  for (const notification of notifications) {
    try {
      let result;
      
      if (notification.type === 'email') {
        result = await service.sendEmailTemplate(
          notification.template,
          notification.recipient,
          notification.variables
        );
      } else {
        result = await service.sendSmsTemplate(
          notification.template,
          notification.recipient,
          notification.variables
        );
      }

      results.push({
        success: result.success,
        channel: notification.type,
        messageId: result.messageId,
        error: result.error,
        timestamp: new Date(),
      });
    } catch (error) {
      results.push({
        success: false,
        channel: notification.type,
        error: error instanceof Error ? error.message : 'Error desconocido',
        timestamp: new Date(),
      });
    }
  }

  return results;
};