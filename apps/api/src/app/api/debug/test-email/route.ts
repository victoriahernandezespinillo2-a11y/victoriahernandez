import { NextRequest, NextResponse } from 'next/server';
import { NotificationService } from '@/lib/services/notification.service';
import { EmailService } from '@repo/notifications';

/**
 * POST /api/debug/test-email
 * Endpoint de prueba para verificar el envío de correos
 */
export async function POST(request: NextRequest) {
  try {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({
        success: false,
        error: 'Endpoint no disponible en producción'
      }, { status: 403 });
    }

    const body = await request.json();
    const { email, type = 'welcome' } = body;

    if (!email) {
      return NextResponse.json({
        success: false,
        error: 'Email es requerido'
      }, { status: 400 });
    }

    const notificationService = new NotificationService();
    const emailService = new EmailService();

    let result;

    switch (type) {
      case 'welcome':
        result = await notificationService.sendEmail({
          to: email,
          subject: 'Prueba de Email - Bienvenida',
          html: `
            <h1>¡Hola!</h1>
            <p>Este es un email de prueba del sistema de notificaciones.</p>
            <p>Si recibes este correo, el sistema de email está funcionando correctamente.</p>
            <p>Fecha: ${new Date().toLocaleString('es-ES')}</p>
          `
        });
        break;

      case 'payment':
        result = await emailService.sendOnSitePaymentConfirmation({
          reservationId: 'test-reservation-123',
          userEmail: email,
          userName: 'Usuario de Prueba',
          courtName: 'Cancha de Prueba',
          centerName: 'Centro Deportivo de Prueba',
          totalAmount: 25.00,
          startTime: new Date().toISOString(),
          endTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          reservationDate: new Date().toLocaleDateString('es-ES'),
          reservationTime: new Date().toLocaleTimeString('es-ES')
        });
        break;

      case 'verification':
        result = await notificationService.sendEmail({
          to: email,
          subject: 'Verificar tu cuenta - Polideportivo Victoria Hernández',
          template: 'email-verification',
          data: {
            firstName: 'Usuario de Prueba',
            verificationUrl: 'https://polideportivovictoriahernandez.es/auth/verify-email?token=test-token'
          }
        });
        break;

      case 'password-reset-template':
        result = await notificationService.sendEmail({
          to: email,
          subject: 'Restablecer contraseña - Polideportivo Victoria Hernández',
          template: 'password-reset',
          data: {
            firstName: 'Usuario de Prueba',
            resetUrl: 'https://polideportivovictoriahernandez.es/auth/reset-password?token=test-token'
          }
        });
        break;

      case 'password-changed-template':
        result = await notificationService.sendEmail({
          to: email,
          subject: 'Tu contraseña ha sido cambiada',
          template: 'password-changed',
          data: {
            firstName: 'Usuario de Prueba',
            changeTime: new Date().toLocaleString('es-ES')
          }
        });
        break;

      case 'reservation-confirmation-template':
        result = await notificationService.sendEmail({
          to: email,
          subject: '🎾 Reserva confirmada - TEST 1 NO UTILIZAR',
          template: 'reservationConfirmation',
          data: {
            userName: 'Usuario de Prueba',
            courtName: 'TEST 1 NO UTILIZAR',
            date: new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleDateString('es-ES'),
            startTime: '10:00',
            endTime: '11:00',
            duration: '60',
            price: '12.50',
            reservationCode: 'ABC1234567',
            qrCodeDataUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=Reserva+Demo',
            accessPassUrl: 'https://polideportivovictoriahernandez.es/dashboard/reservations/pass/demo',
            googleCalendarUrl: 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=Reserva+Polideportivo+Victoria+Hernández&dates=20251115T090000Z/20251115T100000Z&details=Reserva+de+prueba'
          }
        });
        break;

      case 'reservation-reminder-template':
        result = await notificationService.sendEmail({
          to: email,
          subject: 'Recordatorio: tu reserva es mañana',
          template: 'reservationReminder',
          data: {
            userName: 'Usuario de Prueba',
            courtName: 'TEST 1 NO UTILIZAR',
            date: new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleDateString('es-ES'),
            startTime: '10:00',
            endTime: '11:00',
            reservationCode: 'ABC1234567'
          }
        });
        break;

      case 'membership-expiring-template':
        result = await notificationService.sendEmail({
          to: email,
          subject: 'Tu membresía expira pronto',
          template: 'membershipExpiring',
          data: {
            userName: 'Usuario de Prueba',
            membershipType: 'Premium Anual',
            expirationDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('es-ES')
          }
        });
        break;

      default:
        return NextResponse.json({
          success: false,
          error: 'Tipo de email no válido. Usa: welcome, payment, verification, password-reset-template, password-changed-template, reservation-confirmation-template, reservation-reminder-template, membership-expiring-template'
        }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: `Email de tipo '${type}' enviado exitosamente`,
      result,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Error en test-email:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Error desconocido',
      details: error.toString(),
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

/**
 * GET /api/debug/test-email
 * Verificar configuración de email
 */
export async function GET(request: NextRequest) {
  try {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({
        success: false,
        error: 'Endpoint no disponible en producción'
      }, { status: 403 });
    }

    const emailConfig = {
      provider: process.env.EMAIL_PROVIDER || 'not-configured',
      smtpHost: process.env.SMTP_HOST || 'not-configured',
      smtpPort: process.env.SMTP_PORT || 'not-configured',
      smtpUser: process.env.SMTP_USER || 'not-configured',
      smtpPassword: process.env.SMTP_PASSWORD ? '***configured***' : 'not-configured',
      gmailUser: process.env.GMAIL_USER || 'not-configured',
      gmailPassword: process.env.GMAIL_APP_PASSWORD ? '***configured***' : 'not-configured',
      sendgridKey: process.env.SENDGRID_API_KEY ? '***configured***' : 'not-configured',
      mailgunLogin: process.env.MAILGUN_SMTP_LOGIN || 'not-configured',
      mailgunPassword: process.env.MAILGUN_SMTP_PASSWORD ? '***configured***' : 'not-configured',
    };

    return NextResponse.json({
      success: true,
      message: 'Configuración de email',
      config: emailConfig,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Error verificando configuración de email:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Error desconocido',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
























