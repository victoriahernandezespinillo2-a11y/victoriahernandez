import { Twilio } from 'twilio';
import { z } from 'zod';
import { db } from '@repo/db';

// Esquemas de validación
const smsSchema = z.object({
  to: z.string().regex(/^\+[1-9]\d{1,14}$/, 'Número de teléfono inválido (formato E.164)'),
  message: z.string().min(1, 'El mensaje es requerido').max(1600, 'El mensaje es demasiado largo'),
  from: z.string().optional(),
});

const bulkSmsSchema = z.object({
  recipients: z.array(z.string().regex(/^\+[1-9]\d{1,14}$/)).min(1, 'Al menos un destinatario es requerido'),
  message: z.string().min(1, 'El mensaje es requerido').max(1600, 'El mensaje es demasiado largo'),
  from: z.string().optional(),
});

// Tipos
export interface SmsData {
  to: string;
  message: string;
  from?: string;
}

export interface BulkSmsData {
  recipients: string[];
  message: string;
  from?: string;
}

export interface SmsTemplate {
  name: string;
  message: string;
  variables: string[];
}

// Servicio de SMS
export class SmsService {
  private client: Twilio | null = null;
  private defaultFrom: string | undefined;
  private disabled: boolean = true;

  constructor() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const phoneNumber = process.env.TWILIO_PHONE_NUMBER;

    // Activar solo si hay credenciales válidas
    if (accountSid && authToken && phoneNumber && accountSid.startsWith('AC')) {
      this.client = new Twilio(accountSid, authToken);
      this.defaultFrom = phoneNumber;
      this.disabled = false;
    } else {
      // Modo no-op: no lanzar error si faltan credenciales
      this.client = null;
      this.defaultFrom = phoneNumber;
      this.disabled = true;
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[Notifications][SMS] Twilio deshabilitado: variables de entorno no válidas o ausentes.');
      }
    }
  }

  // Enviar SMS individual
  async sendSms(data: SmsData): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const validatedData = smsSchema.parse(data);

      if (this.disabled || !this.client || !this.defaultFrom) {
        // Registrar evento omitido en desarrollo/entornos sin Twilio
        try {
          await db.outboxEvent.create({
            data: {
              eventType: 'SMS_SKIPPED',
              eventData: {
                to: validatedData.to,
                message: validatedData.message,
                provider: 'twilio',
                reason: 'Twilio deshabilitado',
              },
            },
          });
        } catch {}

        return { success: true };
      }

      const message = await this.client.messages.create({
        body: validatedData.message,
        from: validatedData.from || this.defaultFrom,
        to: validatedData.to,
      });

      // Registrar en la base de datos
      await db.outboxEvent.create({
        data: {
          eventType: 'SMS_SENT',
          eventData: {
            to: validatedData.to,
            message: validatedData.message,
            messageId: message.sid,
            provider: 'twilio',
          },
        },
      });

      return {
        success: true,
        messageId: message.sid,
      };
    } catch (error) {
      console.error('Error enviando SMS:', error);
      
      // Registrar error
      try {
        await db.outboxEvent.create({
          data: {
            eventType: 'SMS_FAILED',
            eventData: {
              to: data.to,
              message: data.message,
              error: error instanceof Error ? error.message : 'Error desconocido',
            },
          },
        });
      } catch {}

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
      };
    }
  }

  // Enviar SMS masivos
  async sendBulkSms(data: BulkSmsData): Promise<{
    success: boolean;
    sent: number;
    failed: number;
    errors: string[];
  }> {
    const validatedData = bulkSmsSchema.parse(data);
    const results = {
      success: true,
      sent: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const recipient of validatedData.recipients) {
      try {
        const result = await this.sendSms({
          to: recipient,
          message: validatedData.message,
          from: validatedData.from,
        });

        if (result.success) {
          results.sent++;
        } else {
          results.failed++;
          results.errors.push(`${recipient}: ${result.error}`);
        }
      } catch (error) {
        results.failed++;
        results.errors.push(`${recipient}: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      }
    }

    results.success = results.failed === 0;
    return results;
  }

  // Plantillas de SMS predefinidas
  getTemplate(templateName: string, variables: Record<string, string>): SmsTemplate | null {
    const templates: Record<string, SmsTemplate> = {
      welcome: {
        name: 'welcome',
        message: '¡Bienvenido {{name}} al Polideportivo! Tu cuenta ha sido creada exitosamente. Ya puedes reservar pistas desde nuestra app.',
        variables: ['name'],
      },
      
      reservationConfirmation: {
        name: 'reservationConfirmation',
        message: 'Reserva confirmada: {{courtName}} el {{date}} de {{startTime}} a {{endTime}}. Código: {{reservationCode}}. ¡Te esperamos!',
        variables: ['courtName', 'date', 'startTime', 'endTime', 'reservationCode'],
      },
      
      reservationReminder: {
        name: 'reservationReminder',
        message: 'Recordatorio: Tienes una reserva mañana en {{courtName}} a las {{startTime}}. Código: {{reservationCode}}',
        variables: ['courtName', 'startTime', 'reservationCode'],
      },
      
      reservationCancelled: {
        name: 'reservationCancelled',
        message: 'Tu reserva del {{date}} a las {{startTime}} en {{courtName}} ha sido cancelada. Si pagaste, el reembolso se procesará en 3-5 días.',
        variables: ['date', 'startTime', 'courtName'],
      },
      
      membershipExpiring: {
        name: 'membershipExpiring',
        message: 'Tu membresía {{membershipType}} expira el {{expirationDate}}. Renuévala para seguir disfrutando de los beneficios.',
        variables: ['membershipType', 'expirationDate'],
      },
      
      tournamentInvitation: {
        name: 'tournamentInvitation',
        message: '¡Nuevo torneo disponible! {{tournamentName}} comienza el {{startDate}}. Inscríbete desde la app antes del {{registrationDeadline}}.',
        variables: ['tournamentName', 'startDate', 'registrationDeadline'],
      },
      
      maintenanceNotification: {
        name: 'maintenanceNotification',
        message: 'Mantenimiento programado: {{courtName}} no estará disponible el {{date}} de {{startTime}} a {{endTime}}. Disculpa las molestias.',
        variables: ['courtName', 'date', 'startTime', 'endTime'],
      },
      
      waitingListNotification: {
        name: 'waitingListNotification',
        message: '¡Buenas noticias! Se ha liberado una plaza para {{courtName}} el {{date}} a las {{startTime}}. Tienes 15 min para confirmar.',
        variables: ['courtName', 'date', 'startTime'],
      },
      
      paymentConfirmation: {
        name: 'paymentConfirmation',
        message: 'Pago confirmado: {{amount}}€ por {{description}}. Referencia: {{transactionId}}. Gracias por tu confianza.',
        variables: ['amount', 'description', 'transactionId'],
      },
      
      creditsLow: {
        name: 'creditsLow',
        message: 'Tienes pocos créditos restantes ({{credits}}). Recarga tu cuenta para seguir reservando sin interrupciones.',
        variables: ['credits'],
      },
    };

    const template = templates[templateName];
    if (!template) return null;

    // Reemplazar variables en el template
    let processedMessage = template.message;

    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      processedMessage = processedMessage.replace(new RegExp(placeholder, 'g'), value);
    }

    return {
      ...template,
      message: processedMessage,
    };
  }

  // Enviar SMS usando plantilla
  async sendTemplateSms(
    templateName: string,
    to: string,
    variables: Record<string, string>
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const template = this.getTemplate(templateName, variables);
    
    if (!template) {
      return {
        success: false,
        error: `Plantilla '${templateName}' no encontrada`,
      };
    }

    return await this.sendSms({
      to,
      message: template.message,
    });
  }

  // Obtener estado de un mensaje
  async getMessageStatus(messageId: string): Promise<{
    status: string;
    errorCode?: string;
    errorMessage?: string;
  } | null> {
    try {
      if (this.disabled || !this.client) return null;
      const message = await this.client.messages(messageId).fetch();
      
      return {
        status: message.status,
        errorCode: message.errorCode?.toString(),
        errorMessage: message.errorMessage || undefined,
      };
    } catch (error) {
      console.error('Error obteniendo estado del mensaje:', error);
      return null;
    }
  }

  // Obtener historial de mensajes
  async getMessageHistory(limit = 50): Promise<any[]> {
    try {
      if (this.disabled || !this.client) return [];
      const messages = await this.client.messages.list({ limit });
      return messages.map(msg => ({
        sid: msg.sid,
        to: msg.to,
        from: msg.from,
        body: msg.body,
        status: msg.status,
        dateCreated: msg.dateCreated,
        dateSent: msg.dateSent,
        errorCode: msg.errorCode,
        errorMessage: msg.errorMessage,
      }));
    } catch (error) {
      console.error('Error obteniendo historial de mensajes:', error);
      return [];
    }
  }

  // Validar número de teléfono
  async validatePhoneNumber(phoneNumber: string): Promise<{
    isValid: boolean;
    countryCode?: string;
    nationalFormat?: string;
    carrier?: string;
  }> {
    try {
      if (this.disabled || !this.client) return { isValid: false };
      const lookup = await this.client.lookups.v1.phoneNumbers(phoneNumber).fetch();
      
      return {
        isValid: true,
        countryCode: lookup.countryCode,
        nationalFormat: lookup.nationalFormat,
        carrier: typeof lookup.carrier?.name === 'string' ? lookup.carrier.name : undefined,
      };
    } catch (error) {
      return {
        isValid: false,
      };
    }
  }
}

// Instancia singleton
export const smsService = new SmsService();

// Funciones de utilidad
export const SmsUtils = {
  // Formatear número de teléfono a E.164
  formatPhoneNumber: (phone: string, countryCode = '+34'): string => {
    // Limpiar el número
    const cleaned = phone.replace(/\D/g, '');
    
    // Si ya tiene código de país, devolverlo
    if (phone.startsWith('+')) {
      return phone;
    }
    
    // Si es un número español (9 dígitos)
    if (cleaned.length === 9 && countryCode === '+34') {
      return `+34${cleaned}`;
    }
    
    // Para otros casos, agregar el código de país por defecto
    return `${countryCode}${cleaned}`;
  },
  
  // Validar formato E.164
  isValidE164: (phone: string): boolean => {
    const e164Regex = /^\+[1-9]\d{1,14}$/;
    return e164Regex.test(phone);
  },
  
  // Extraer código de país
  getCountryCode: (phone: string): string => {
    if (!phone.startsWith('+')) return '';
    
    // Códigos de país comunes
    const countryCodes = ['+34', '+1', '+44', '+33', '+49', '+39', '+351'];
    
    for (const code of countryCodes) {
      if (phone.startsWith(code)) {
        return code;
      }
    }
    
    // Para otros códigos, tomar los primeros 2-4 dígitos
    const match = phone.match(/^\+(\d{1,4})/);
    return match ? `+${match[1]}` : '';
  },
  
  // Calcular número de segmentos SMS
  calculateSegments: (message: string): number => {
    const length = message.length;
    
    // SMS estándar (GSM 7-bit)
    if (length <= 160) return 1;
    if (length <= 306) return 2;
    if (length <= 459) return 3;
    if (length <= 612) return 4;
    
    // Para mensajes más largos
    return Math.ceil(length / 153);
  },
  
  // Truncar mensaje si es demasiado largo
  truncateMessage: (message: string, maxLength = 1600): string => {
    if (message.length <= maxLength) return message;
    
    return message.substring(0, maxLength - 3) + '...';
  },
  
  // Generar número de teléfono de prueba
  generateTestPhoneNumber: (): string => {
    const random = Math.floor(Math.random() * 900000000) + 100000000;
    return `+34${random}`;
  },
};

// Constantes
export const SMS_TEMPLATES = {
  WELCOME: 'welcome',
  RESERVATION_CONFIRMATION: 'reservationConfirmation',
  RESERVATION_REMINDER: 'reservationReminder',
  RESERVATION_CANCELLED: 'reservationCancelled',
  MEMBERSHIP_EXPIRING: 'membershipExpiring',
  TOURNAMENT_INVITATION: 'tournamentInvitation',
  MAINTENANCE_NOTIFICATION: 'maintenanceNotification',
  WAITING_LIST_NOTIFICATION: 'waitingListNotification',
  PAYMENT_CONFIRMATION: 'paymentConfirmation',
  CREDITS_LOW: 'creditsLow',
} as const;

export type SmsTemplateName = typeof SMS_TEMPLATES[keyof typeof SMS_TEMPLATES];

// Estados de mensaje de Twilio
export const SMS_STATUS = {
  QUEUED: 'queued',
  SENDING: 'sending',
  SENT: 'sent',
  DELIVERED: 'delivered',
  UNDELIVERED: 'undelivered',
  FAILED: 'failed',
} as const;

export type SmsStatus = typeof SMS_STATUS[keyof typeof SMS_STATUS];