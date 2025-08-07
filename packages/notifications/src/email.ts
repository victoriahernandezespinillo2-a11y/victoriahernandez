import nodemailer from 'nodemailer';
import { z } from 'zod';
import { db } from '@repo/db';

// Esquemas de validación
const emailSchema = z.object({
  to: z.string().email('Email inválido'),
  subject: z.string().min(1, 'El asunto es requerido'),
  html: z.string().min(1, 'El contenido HTML es requerido'),
  text: z.string().optional(),
  from: z.string().email().optional(),
  cc: z.array(z.string().email()).optional(),
  bcc: z.array(z.string().email()).optional(),
  attachments: z.array(z.object({
    filename: z.string(),
    content: z.union([z.string(), z.instanceof(Buffer)]),
    encoding: z.string().optional(),
    contentType: z.string().optional(),
    cid: z.string().optional(),
  })).optional(),
});

const bulkEmailSchema = z.object({
  recipients: z.array(z.string().email()).min(1, 'Al menos un destinatario es requerido'),
  subject: z.string().min(1, 'El asunto es requerido'),
  html: z.string().min(1, 'El contenido HTML es requerido'),
  text: z.string().optional(),
  from: z.string().email().optional(),
});

// Tipos
export interface EmailData {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
  cc?: string[];
  bcc?: string[];
  attachments?: {
    filename: string;
    content: string | Buffer;
    encoding?: string;
    contentType?: string;
    cid?: string;
  }[];
}

export interface BulkEmailData {
  recipients: string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

export interface EmailTemplate {
  name: string;
  subject: string;
  html: string;
  variables: string[];
}

// Servicio de Email
export class EmailService {
  private transporter: nodemailer.Transporter;
  private defaultFrom: string;

  constructor() {
    this.defaultFrom = process.env.EMAIL_FROM || 'noreply@polideportivo.com';
    this.transporter = this.createTransporter();
  }

  private createTransporter(): nodemailer.Transporter {
    const emailProvider = process.env.EMAIL_PROVIDER || 'smtp';

    switch (emailProvider) {
      case 'gmail':
        return nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.GMAIL_USER!,
            pass: process.env.GMAIL_APP_PASSWORD!,
          },
        });

      case 'sendgrid':
        return nodemailer.createTransport({
          host: 'smtp.sendgrid.net',
          port: 587,
          secure: false,
          auth: {
            user: 'apikey',
            pass: process.env.SENDGRID_API_KEY!,
          },
        });

      case 'mailgun':
        return nodemailer.createTransport({
          host: 'smtp.mailgun.org',
          port: 587,
          secure: false,
          auth: {
            user: process.env.MAILGUN_SMTP_LOGIN!,
            pass: process.env.MAILGUN_SMTP_PASSWORD!,
          },
        });

      default: // SMTP genérico
        return nodemailer.createTransport({
          host: process.env.SMTP_HOST!,
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER!,
            pass: process.env.SMTP_PASSWORD!,
          },
        });
    }
  }

  // Enviar email individual
  async sendEmail(data: EmailData): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const validatedData = emailSchema.parse(data);

      const mailOptions = {
        from: validatedData.from || this.defaultFrom,
        to: validatedData.to,
        subject: validatedData.subject,
        html: validatedData.html,
        text: validatedData.text,
        cc: validatedData.cc,
        bcc: validatedData.bcc,
        attachments: validatedData.attachments,
      };

      const result = await this.transporter.sendMail(mailOptions);

      // Registrar en la base de datos
      await db.outboxEvent.create({
        data: {
          eventType: 'EMAIL_SENT',
          eventData: {
            to: validatedData.to,
            subject: validatedData.subject,
            messageId: result.messageId,
            provider: process.env.EMAIL_PROVIDER || 'smtp',
          },
        },
      });

      return {
        success: true,
        messageId: result.messageId,
      };
    } catch (error) {
      console.error('Error enviando email:', error);
      
      // Registrar error
      await db.outboxEvent.create({
        data: {
          eventType: 'EMAIL_FAILED',
          eventData: {
            to: data.to,
            subject: data.subject,
            error: error instanceof Error ? error.message : 'Error desconocido',
          },
        },
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
      };
    }
  }

  // Enviar emails masivos
  async sendBulkEmail(data: BulkEmailData): Promise<{
    success: boolean;
    sent: number;
    failed: number;
    errors: string[];
  }> {
    const validatedData = bulkEmailSchema.parse(data);
    const results = {
      success: true,
      sent: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const recipient of validatedData.recipients) {
      try {
        const result = await this.sendEmail({
          to: recipient,
          subject: validatedData.subject,
          html: validatedData.html,
          text: validatedData.text,
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

  // Plantillas de email predefinidas
  getTemplate(templateName: string, variables: Record<string, string>): EmailTemplate | null {
    const templates: Record<string, EmailTemplate> = {
      welcome: {
        name: 'welcome',
        subject: '¡Bienvenido a nuestro polideportivo!',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #2563eb;">¡Bienvenido {{name}}!</h1>
            <p>Gracias por registrarte en nuestro polideportivo. Estamos emocionados de tenerte como parte de nuestra comunidad deportiva.</p>
            <p>Tu cuenta ha sido creada exitosamente. Ya puedes comenzar a reservar pistas y disfrutar de nuestras instalaciones.</p>
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>¿Qué puedes hacer ahora?</h3>
              <ul>
                <li>Reservar pistas de tenis, pádel y fútbol</li>
                <li>Unirte a torneos y competiciones</li>
                <li>Acceder a descuentos exclusivos para miembros</li>
                <li>Gestionar tu perfil y preferencias</li>
              </ul>
            </div>
            <p>Si tienes alguna pregunta, no dudes en contactarnos.</p>
            <p>¡Nos vemos en las pistas!</p>
            <p style="color: #6b7280; font-size: 14px;">Equipo del Polideportivo</p>
          </div>
        `,
        variables: ['name'],
      },
      
      reservationConfirmation: {
        name: 'reservationConfirmation',
        subject: 'Confirmación de reserva - {{courtName}}',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #16a34a;">Reserva confirmada</h1>
            <p>Hola {{userName}},</p>
            <p>Tu reserva ha sido confirmada exitosamente. Aquí tienes los detalles:</p>
            <div style="background-color: #f0fdf4; border: 1px solid #16a34a; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #16a34a;">Detalles de la reserva</h3>
              <p><strong>Pista:</strong> {{courtName}}</p>
              <p><strong>Fecha:</strong> {{date}}</p>
              <p><strong>Hora:</strong> {{startTime}} - {{endTime}}</p>
              <p><strong>Duración:</strong> {{duration}} minutos</p>
              <p><strong>Precio:</strong> {{price}}€</p>
              <p><strong>Código de reserva:</strong> {{reservationCode}}</p>
            </div>
            <p><strong>Importante:</strong> Por favor, llega 10 minutos antes de tu hora de reserva.</p>
            <p>Si necesitas cancelar o modificar tu reserva, puedes hacerlo desde tu panel de usuario hasta 2 horas antes del inicio.</p>
            <p>¡Disfruta tu tiempo en nuestras instalaciones!</p>
          </div>
        `,
        variables: ['userName', 'courtName', 'date', 'startTime', 'endTime', 'duration', 'price', 'reservationCode'],
      },
      
      reservationReminder: {
        name: 'reservationReminder',
        subject: 'Recordatorio: Tu reserva es mañana',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #f59e0b;">Recordatorio de reserva</h1>
            <p>Hola {{userName}},</p>
            <p>Te recordamos que tienes una reserva programada para mañana:</p>
            <div style="background-color: #fffbeb; border: 1px solid #f59e0b; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Pista:</strong> {{courtName}}</p>
              <p><strong>Fecha:</strong> {{date}}</p>
              <p><strong>Hora:</strong> {{startTime}} - {{endTime}}</p>
              <p><strong>Código:</strong> {{reservationCode}}</p>
            </div>
            <p>Recuerda llegar 10 minutos antes de tu hora de reserva.</p>
            <p>¡Te esperamos!</p>
          </div>
        `,
        variables: ['userName', 'courtName', 'date', 'startTime', 'endTime', 'reservationCode'],
      },
      
      membershipExpiring: {
        name: 'membershipExpiring',
        subject: 'Tu membresía expira pronto',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #dc2626;">Tu membresía expira pronto</h1>
            <p>Hola {{userName}},</p>
            <p>Te informamos que tu membresía {{membershipType}} expirará el {{expirationDate}}.</p>
            <div style="background-color: #fef2f2; border: 1px solid #dc2626; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #dc2626;">¿Qué significa esto?</h3>
              <ul>
                <li>Perderás acceso a los beneficios de tu membresía</li>
                <li>Los precios de las reservas volverán a la tarifa estándar</li>
                <li>No podrás acceder a eventos exclusivos para miembros</li>
              </ul>
            </div>
            <p>Para renovar tu membresía y seguir disfrutando de todos los beneficios, visita tu panel de usuario.</p>
            <p>¡No dejes que expire tu membresía!</p>
          </div>
        `,
        variables: ['userName', 'membershipType', 'expirationDate'],
      },
    };

    const template = templates[templateName];
    if (!template) return null;

    // Reemplazar variables en el template
    let processedHtml = template.html;
    let processedSubject = template.subject;

    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      processedHtml = processedHtml.replace(new RegExp(placeholder, 'g'), value);
      processedSubject = processedSubject.replace(new RegExp(placeholder, 'g'), value);
    }

    return {
      ...template,
      html: processedHtml,
      subject: processedSubject,
    };
  }

  // Enviar email usando plantilla
  async sendTemplateEmail(
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

    return await this.sendEmail({
      to,
      subject: template.subject,
      html: template.html,
    });
  }

  // Verificar configuración del transporter
  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      console.error('Error verificando conexión de email:', error);
      return false;
    }
  }
}

// Instancia singleton
export const emailService = new EmailService();

// Funciones de utilidad
export const EmailUtils = {
  // Validar email
  isValidEmail: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },
  
  // Extraer dominio del email
  getDomain: (email: string): string => {
    return email.split('@')[1] || '';
  },
  
  // Generar email de prueba
  generateTestEmail: (): string => {
    const timestamp = Date.now();
    return `test+${timestamp}@example.com`;
  },
  
  // Sanitizar contenido HTML
  sanitizeHtml: (html: string): string => {
    // Implementación básica - en producción usar una librería como DOMPurify
    return html
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '');
  },
};

// Constantes
export const EMAIL_TEMPLATES = {
  WELCOME: 'welcome',
  RESERVATION_CONFIRMATION: 'reservationConfirmation',
  RESERVATION_REMINDER: 'reservationReminder',
  MEMBERSHIP_EXPIRING: 'membershipExpiring',
} as const;

export type EmailTemplateName = typeof EMAIL_TEMPLATES[keyof typeof EMAIL_TEMPLATES];