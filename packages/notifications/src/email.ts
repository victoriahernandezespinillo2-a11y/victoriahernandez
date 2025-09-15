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
      'email-verification': {
        name: 'email-verification',
        subject: 'Verifica tu email - Polideportivo',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #2563eb;">Verifica tu cuenta</h1>
            <p>Hola {{firstName}},</p>
            <p>Gracias por registrarte. Por favor verifica tu correo haciendo clic en el siguiente botón:</p>
            <p style="margin: 24px 0;">
              <a href="{{verificationUrl}}" style="background-color:#2563eb;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;display:inline-block;">Verificar correo</a>
            </p>
            <p>Si el botón no funciona, copia y pega este enlace en tu navegador:</p>
            <p><a href="{{verificationUrl}}" style="word-break: break-all; color:#2563eb;">{{verificationUrl}}</a></p>
            <p style="color: #6b7280; font-size: 14px;">Si no solicitaste esta verificación, puedes ignorar este mensaje.</p>
          </div>
        `,
        variables: ['firstName', 'verificationUrl'],
      },

      'password-reset': {
        name: 'password-reset',
        subject: 'Restablecer contraseña - Polideportivo',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #2563eb;">Restablecer contraseña</h1>
            <p>Hola {{firstName}},</p>
            <p>Hemos recibido una solicitud para restablecer tu contraseña.</p>
            <p>Haz clic en el botón para continuar. Este enlace expirará en 60 minutos.</p>
            <p style="margin: 24px 0;">
              <a href="{{resetUrl}}" style="background-color:#2563eb;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;display:inline-block;">Restablecer contraseña</a>
            </p>
            <p>Si no solicitaste este cambio, ignora este mensaje.</p>
          </div>
        `,
        variables: ['firstName', 'resetUrl'],
      },

      'password-changed': {
        name: 'password-changed',
        subject: 'Tu contraseña ha sido cambiada',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #16a34a;">Contraseña actualizada</h1>
            <p>Hola {{firstName}},</p>
            <p>Confirmamos que tu contraseña fue cambiada el {{changeTime}}.</p>
            <p>Si no reconoces este cambio, por favor restablece tu contraseña de inmediato y contacta con soporte.</p>
          </div>
        `,
        variables: ['firstName', 'changeTime'],
      },
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
        subject: '✅ Reserva confirmada - {{courtName}}',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif; background: linear-gradient(135deg, #10b981 0%, #3b82f6 100%); min-height: 100vh;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
              <tr>
                <td style="padding: 40px 20px;">
                  
                  <!-- Container principal -->
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 25px 50px rgba(0,0,0,0.15);">
                    
                    <!-- Header con gradiente -->
                    <tr>
                      <td style="background: linear-gradient(135deg, #10b981, #3b82f6); padding: 40px 30px; text-align: center;">
                        <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
                          🎾 Reserva Confirmada
                        </h1>
                        <p style="margin: 8px 0 0 0; color: #e2e8f0; font-size: 16px; font-weight: 500;">
                          ¡Todo listo para tu sesión!
                        </p>
                      </td>
                    </tr>
                    
                    <!-- Contenido principal -->
                    <tr>
                      <td style="padding: 40px 30px;">
                        <p style="margin: 0 0 24px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                          Hola <strong>{{userName}}</strong>,
                        </p>
                        <p style="margin: 0 0 32px 0; color: #6b7280; font-size: 15px; line-height: 1.6;">
                          Tu reserva ha sido confirmada exitosamente. Aquí tienes todos los detalles:
                        </p>
                        
                        <!-- Card de detalles -->
                        <div style="background: linear-gradient(135deg, #f0fdf4, #ecfdf5); border: 2px solid #10b981; border-radius: 12px; padding: 24px; margin: 24px 0;">
                          <h3 style="margin: 0 0 20px 0; color: #065f46; font-size: 18px; font-weight: 600;">
                            📋 Detalles de la reserva
                          </h3>
                          
                          <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                              <td style="padding: 8px 0; color: #374151; font-weight: 600; width: 120px;">🏟️ Pista:</td>
                              <td style="padding: 8px 0; color: #6b7280;">{{courtName}}</td>
                            </tr>
                            <tr>
                              <td style="padding: 8px 0; color: #374151; font-weight: 600;">📅 Fecha:</td>
                              <td style="padding: 8px 0; color: #6b7280;">{{date}}</td>
                            </tr>
                            <tr>
                              <td style="padding: 8px 0; color: #374151; font-weight: 600;">⏰ Horario:</td>
                              <td style="padding: 8px 0; color: #6b7280;">{{startTime}} - {{endTime}}</td>
                            </tr>
                            <tr>
                              <td style="padding: 8px 0; color: #374151; font-weight: 600;">⏱️ Duración:</td>
                              <td style="padding: 8px 0; color: #6b7280;">{{duration}} minutos</td>
                            </tr>
                            <tr>
                              <td style="padding: 8px 0; color: #374151; font-weight: 600;">💰 Precio:</td>
                              <td style="padding: 8px 0; color: #10b981; font-weight: 600;">{{price}}€</td>
                            </tr>
                            <tr>
                              <td style="padding: 8px 0; color: #374151; font-weight: 600;">🔢 Código:</td>
                              <td style="padding: 8px 0; color: #3b82f6; font-weight: 600; font-family: monospace;">{{reservationCode}}</td>
                            </tr>
                          </table>
                        </div>
                        
                        <!-- QR Code Section -->
                        <div style="background: linear-gradient(135deg, #eff6ff, #dbeafe); border: 2px solid #3b82f6; border-radius: 12px; padding: 24px; margin: 24px 0; text-align: center;">
                          <h3 style="margin: 0 0 16px 0; color: #1e40af; font-size: 18px; font-weight: 600;">
                            📱 Tu pase de acceso
                          </h3>
                          <p style="margin: 0 0 20px 0; color: #6b7280; font-size: 14px;">
                            Presenta este código QR al personal de acceso
                          </p>
                          <img src="{{qrCodeDataUrl}}" alt="Código QR de acceso" style="width: 160px; height: 160px; border-radius: 8px; border: 3px solid #ffffff; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);">
                          <p style="margin: 16px 0 0 0; color: #9ca3af; font-size: 12px;">
                            Válido el día de tu reserva
                          </p>
                        </div>
                        
                        <!-- Instrucciones importantes -->
                        <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 24px 0; border-radius: 0 8px 8px 0;">
                          <h4 style="margin: 0 0 12px 0; color: #92400e; font-size: 16px; font-weight: 600;">
                            ⚠️ Instrucciones importantes
                          </h4>
                          <ul style="margin: 0; padding-left: 20px; color: #78350f;">
                            <li style="margin-bottom: 8px;">Llega 10 minutos antes de tu hora de reserva</li>
                            <li style="margin-bottom: 8px;">Presenta tu código QR o ID de reserva al acceder</li>
                            <li style="margin-bottom: 8px;">Puedes cancelar hasta 2 horas antes del inicio</li>
                          </ul>
                        </div>
                        
                        <p style="margin: 32px 0 0 0; color: #6b7280; font-size: 15px; line-height: 1.6; text-align: center;">
                          ¡Disfruta tu tiempo en nuestras instalaciones! 🏆
                        </p>
                      </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                      <td style="background: #f8fafc; padding: 24px 30px; border-top: 1px solid #e5e7eb; text-align: center;">
                        <p style="margin: 0; color: #9ca3af; font-size: 13px;">
                          ¿Necesitas ayuda? Responde a este email o contacta con nosotros
                        </p>
                      </td>
                    </tr>
                    
                  </table>
                </td>
              </tr>
            </table>
          </body>
          </html>
        `,
        variables: ['userName', 'courtName', 'date', 'startTime', 'endTime', 'duration', 'price', 'reservationCode', 'qrCodeDataUrl'],
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

  // Enviar confirmación de pago en sede
  async sendOnSitePaymentConfirmation(data: {
    reservationId: string;
    userEmail: string;
    userName: string;
    courtName: string;
    centerName: string;
    totalAmount: number;
    startTime: string;
    endTime: string;
    reservationDate: string;
    reservationTime: string;
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const { userEmail, userName, courtName, centerName, totalAmount, reservationDate, reservationTime } = data;
    
    const subject = `Reserva confirmada - Pago pendiente en ${centerName}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reserva Confirmada - Pago Pendiente</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: Arial, sans-serif;">
        <table role="presentation" style="width: 100%; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <tr>
            <td style="padding: 40px 30px;">
              
              <!-- Header -->
              <div style="text-align: center; margin-bottom: 30px;">
                <div style="display: inline-block; background-color: #f59e0b; color: white; padding: 12px 24px; border-radius: 50px; font-size: 18px; font-weight: bold;">
                  🏢 Reserva Creada
                </div>
              </div>

              <!-- Main Content -->
              <div style="margin-bottom: 30px;">
                <h1 style="color: #1f2937; font-size: 24px; margin: 0 0 20px 0; text-align: center;">
                  ¡Hola ${userName}!
                </h1>
                
                <p style="color: #6b7280; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                  Tu reserva ha sido creada exitosamente. <strong>Debes pagar en el centro deportivo antes de usar la cancha.</strong>
                </p>

                <!-- Important Notice -->
                <div style="background-color: #fef3c7; border: 2px solid #f59e0b; border-radius: 12px; padding: 20px; margin: 25px 0;">
                  <div style="display: flex; align-items: center; margin-bottom: 10px;">
                    <span style="font-size: 24px; margin-right: 10px;">⚠️</span>
                    <h3 style="color: #92400e; margin: 0; font-size: 18px;">Importante</h3>
                  </div>
                  <p style="color: #92400e; margin: 0; font-weight: 500;">
                    Presenta este comprobante en el centro deportivo para completar tu pago y acceder a la cancha.
                  </p>
                </div>

                <!-- Reservation Details -->
                <div style="background-color: #f8fafc; border-radius: 12px; padding: 25px; margin: 25px 0;">
                  <h3 style="color: #1f2937; margin: 0 0 20px 0; font-size: 18px;">Detalles de tu Reserva</h3>
                  
                  <div style="display: grid; gap: 15px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
                      <span style="color: #6b7280; font-weight: 500;">Cancha:</span>
                      <span style="color: #1f2937; font-weight: 600;">${courtName}</span>
                    </div>
                    
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
                      <span style="color: #6b7280; font-weight: 500;">Centro:</span>
                      <span style="color: #1f2937; font-weight: 600;">${centerName}</span>
                    </div>
                    
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
                      <span style="color: #6b7280; font-weight: 500;">Fecha:</span>
                      <span style="color: #1f2937; font-weight: 600;">${reservationDate}</span>
                    </div>
                    
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
                      <span style="color: #6b7280; font-weight: 500;">Horario:</span>
                      <span style="color: #1f2937; font-weight: 600;">${reservationTime}</span>
                    </div>
                    
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
                      <span style="color: #6b7280; font-weight: 500;">Método de Pago:</span>
                      <span style="color: #f59e0b; font-weight: 600;">🏢 Pagar en Sede</span>
                    </div>
                    
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0;">
                      <span style="color: #6b7280; font-weight: 500;">Total a Pagar:</span>
                      <span style="color: #1f2937; font-weight: 700; font-size: 18px;">€${totalAmount.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <!-- Payment Status -->
                <div style="text-align: center; margin: 25px 0;">
                  <div style="display: inline-block; background-color: #fef3c7; color: #92400e; padding: 12px 24px; border-radius: 25px; font-weight: 600;">
                    ⏳ Pendiente de Pago
                  </div>
                </div>

                <!-- Instructions -->
                <div style="background-color: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 12px; padding: 20px; margin: 25px 0;">
                  <h4 style="color: #0c4a6e; margin: 0 0 15px 0; font-size: 16px;">📋 Instrucciones para el Pago</h4>
                  <ol style="color: #0c4a6e; margin: 0; padding-left: 20px;">
                    <li style="margin-bottom: 8px;">Llega al centro deportivo 10 minutos antes de tu reserva</li>
                    <li style="margin-bottom: 8px;">Presenta este comprobante en recepción</li>
                    <li style="margin-bottom: 8px;">Realiza el pago de €${totalAmount.toFixed(2)}</li>
                    <li style="margin-bottom: 8px;">Recibe tu confirmación de pago</li>
                    <li style="margin-bottom: 0;">¡Disfruta de tu cancha!</li>
                  </ol>
                </div>

                <!-- Contact Info -->
                <div style="text-align: center; margin: 30px 0;">
                  <p style="color: #6b7280; font-size: 14px; margin: 0;">
                    ¿Necesitas ayuda? Contacta con nosotros en recepción o responde a este email.
                  </p>
                </div>
              </div>

              <!-- Footer -->
              <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                  © 2024 ${centerName} - Polideportivo Victoria Hernandez
                </p>
              </div>

            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    return await this.sendEmail({
      to: userEmail,
      subject,
      html,
      text: `Reserva confirmada - Pago pendiente en ${centerName}\n\nHola ${userName},\n\nTu reserva ha sido creada exitosamente. Debes pagar en el centro deportivo antes de usar la cancha.\n\nDetalles:\n- Cancha: ${courtName}\n- Centro: ${centerName}\n- Fecha: ${reservationDate}\n- Horario: ${reservationTime}\n- Total: €${totalAmount.toFixed(2)}\n- Estado: Pendiente de Pago\n\nPresenta este comprobante en recepción para completar tu pago.\n\n¡Gracias por elegirnos!`,
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