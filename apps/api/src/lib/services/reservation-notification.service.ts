import { db, type Reservation } from '@repo/db';
import { NotificationService } from '@repo/notifications';
import { formatInTimeZone } from 'date-fns-tz';
import es from 'date-fns/locale/es/index.js';
import jwt from 'jsonwebtoken';
import QRCode from 'qrcode';

type PendingOptions = {
  paymentLinkUrl?: string;
  pendingReason?: string;
  expiresAt?: Date | null;
  ctaLabel?: string;
};

type CancelledOptions = {
  cancelReason: string;
  cancelledAt?: Date;
};

const DEFAULT_TIMEZONE = 'Europe/Madrid';
const DEFAULT_APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.polideportivovictoriahernandez.es';
const DEFAULT_SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'contacto@polideportivovictoriahernandez.es';
const DEFAULT_SUPPORT_WHATSAPP = process.env.SUPPORT_WHATSAPP || '+34 600 000 123';
const DEFAULT_SUPPORT_PHONE = process.env.SUPPORT_PHONE || '+34 910 000 123';
const DEFAULT_EMAIL_FROM = process.env.BRAND_EMAIL_FROM || 'info@polideportivovictoriahernandez.es';

const notificationService = new NotificationService();

export class ReservationNotificationService {
  private async loadReservationContext(reservationId: string) {
    const reservation = await db.reservation.findUnique({
      where: { id: reservationId },
      include: {
        user: { select: { email: true, name: true } },
        court: {
          select: {
            name: true,
            center: { select: { name: true, timezone: true } },
          },
        },
      },
    });

    if (!reservation || !reservation.user?.email) {
      return null;
    }

    const centerName = reservation.court?.center?.name || 'Polideportivo Victoria Hernández';
    const timezone = reservation.court?.center?.timezone || DEFAULT_TIMEZONE;

    const dateLabel = this.capitalize(
      formatInTimeZone(reservation.startTime, timezone, "EEEE d 'de' MMMM yyyy", { locale: es })
    );
    const startLabel = formatInTimeZone(reservation.startTime, timezone, 'HH:mm', { locale: es });
    const endLabel = formatInTimeZone(reservation.endTime, timezone, 'HH:mm', { locale: es });

    const amount = Number(reservation.totalPrice || 0);

    return {
      reservation,
      userEmail: reservation.user.email,
      userName: reservation.user.name || reservation.user.email.split('@')[0],
      courtName: reservation.court?.name || 'Cancha',
      centerName,
      timezone,
      dateLabel,
      startLabel,
      endLabel,
      amount,
    };
  }

  private capitalize(text: string): string {
    if (!text) return text;
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  async sendPendingPaymentReminder(reservationId: string, options: PendingOptions = {}) {
    const context = await this.loadReservationContext(reservationId);
    if (!context) return { success: false, reason: 'missing-context' };

    const { reservation, userEmail, userName, courtName, centerName, dateLabel, startLabel, endLabel, amount } = context;

    const paymentLinkUrl = options.paymentLinkUrl || this.buildPaymentLink(context.reservation) || `${DEFAULT_APP_URL}/dashboard/reservations`;
    const expiresAtLabel = options.expiresAt
      ? this.capitalize(
          formatInTimeZone(options.expiresAt, context.timezone, "HH:mm 'del' EEEE d 'de' MMMM", { locale: es })
        )
      : undefined;
    const expiresAtMessage = expiresAtLabel
      ? `El enlace de pago estará disponible hasta las ${expiresAtLabel}.`
      : '';
    const reasonMessage = options.pendingReason ? `Nota: ${options.pendingReason}` : '';

    const variables: Record<string, string> = {
      userName: userName || '',
      courtName: courtName || '',
      centerName: centerName || '',
      date: dateLabel || '',
      startTime: startLabel || '',
      endTime: endLabel || '',
      amount: (amount ?? 0).toFixed(2),
      ctaUrl: paymentLinkUrl || DEFAULT_APP_URL,
      ctaLabel: options.ctaLabel || 'Pagar ahora',
      supportEmail: DEFAULT_SUPPORT_EMAIL,
      supportWhatsapp: DEFAULT_SUPPORT_WHATSAPP,
      supportPhone: DEFAULT_SUPPORT_PHONE,
      pendingReason: reasonMessage,
      expiresAt: expiresAtMessage,
    };

    const templateName = options.paymentLinkUrl ? 'reservation-pending-payment-link' : 'reservation-pending-payment-offline';

    try {
      return await notificationService.sendEmailTemplate(templateName, userEmail, variables, {
        from: DEFAULT_EMAIL_FROM,
      });
    } catch (error) {
      console.error('[ReservationNotificationService] Error enviando recordatorio de pago pendiente:', error);
      return { success: false, reason: 'send-failed' };
    }
  }

  async sendAutoCancelledNotification(reservationId: string, options: CancelledOptions) {
    const context = await this.loadReservationContext(reservationId);
    if (!context) return { success: false, reason: 'missing-context' };

    const { userEmail, userName, courtName, centerName, dateLabel, startLabel, endLabel, amount } = context;
    const cancelledAt = options.cancelledAt || new Date();

    const cancelledLabel = formatInTimeZone(cancelledAt, context.timezone, "EEEE d 'de' MMMM 'a las' HH:mm", { locale: es });

    const variables: Record<string, string> = {
      userName: userName || '',
      courtName: courtName || '',
      centerName: centerName || '',
      date: dateLabel || '',
      startTime: startLabel || '',
      endTime: endLabel || '',
      amount: (amount ?? 0).toFixed(2),
      cancelReason: options.cancelReason || 'No recibimos el pago dentro del tiempo establecido.',
      cancelledAt: this.capitalize(cancelledLabel || ''),
      supportEmail: DEFAULT_SUPPORT_EMAIL,
      supportWhatsapp: DEFAULT_SUPPORT_WHATSAPP,
      supportPhone: DEFAULT_SUPPORT_PHONE,
    };

    try {
      return await notificationService.sendEmailTemplate('reservation-cancelled-timeout', userEmail, variables, {
        from: DEFAULT_EMAIL_FROM,
      });
    } catch (error) {
      console.error('[ReservationNotificationService] Error enviando notificación de cancelación:', error);
      return { success: false, reason: 'send-failed' };
    }
  }

  async sendReservationConfirmation(reservationId: string, options: { amount?: number } = {}) {
    const context = await this.loadReservationContext(reservationId);
    if (!context) return { success: false, reason: 'missing-context' };

    const { reservation, userEmail, userName, courtName, centerName, dateLabel, startLabel, endLabel } = context;

    try {
      const amount = options.amount ?? context.amount;

      const jwtSecret = process.env.JWT_SECRET || 'fallback-secret';
      const expSeconds = Math.floor(Date.now() / 1000) + 24 * 60 * 60;
      const passToken = jwt.sign({ type: 'pass-access', userId: reservation.userId, exp: expSeconds }, jwtSecret);

      const apiUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002').replace(/\/$/, '');
      const passUrl = `${apiUrl}/api/reservations/${reservation.id}/pass?token=${encodeURIComponent(passToken)}`;

      let qrCodeDataUrl: string;
      try {
        qrCodeDataUrl = await QRCode.toDataURL(passUrl, { width: 200, margin: 1 });
      } catch (error) {
        console.error('[ReservationNotificationService] Error generando QR principal:', error);
        qrCodeDataUrl = await QRCode.toDataURL(`${apiUrl}/api/reservations/${reservation.id}/pass`, { width: 200, margin: 1 });
      }

      const base64 = qrCodeDataUrl.split(',')[1] || '';
      const qrBuffer = Buffer.from(base64, 'base64');
      const qrCid = `reservation-${reservation.id}-qr@polideportivovictoriahernandez`;

      const durationMinutes = Math.max(
        1,
        Math.round((reservation.endTime.getTime() - reservation.startTime.getTime()) / 60000)
      );

      const variables: Record<string, string> = {
        userName: userName || '',
        courtName: courtName || '',
        centerName: centerName || '',
        date: dateLabel || '',
        startTime: startLabel || '',
        endTime: endLabel || '',
        duration: String(durationMinutes),
        price: (amount ?? 0).toFixed(2),
        reservationCode: reservation.id.slice(0, 10).toUpperCase(),
        qrCodeCid: qrCid,
        accessPassUrl: passUrl,
        googleCalendarUrl: this.buildGoogleCalendarUrl(reservation, courtName) || passUrl,
      };

      return await notificationService.sendEmailTemplate('reservationConfirmation', userEmail, variables, {
        from: DEFAULT_EMAIL_FROM,
        attachments: [
          {
            filename: 'qr-acceso.png',
            content: qrBuffer,
            contentType: 'image/png',
            cid: qrCid,
          },
        ],
      });
    } catch (error) {
      console.error('[ReservationNotificationService] Error enviando confirmación de reserva:', error);
      return { success: false, reason: 'send-failed' };
    }
  }

  private buildPaymentLink(reservation: Reservation | null): string | undefined {
    if (!reservation) return undefined;

    const method = (reservation.paymentMethod || '').toLowerCase();
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || DEFAULT_APP_URL;

    if (method === 'link' || method === 'redsys') {
      return `${apiUrl}/api/payments/redsys/redirect?rid=${encodeURIComponent(reservation.id)}`;
    }

    if (method === 'stripe') {
      return `${appUrl}/dashboard/reservations/${reservation.id}`;
    }

    return undefined;
  }

  private buildGoogleCalendarUrl(reservation: Reservation, courtName: string): string {
    const start = reservation.startTime.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const end = reservation.endTime.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const title = `Reserva ${courtName || 'Cancha'}`;
    const details = `Reserva deportiva en ${courtName || 'cancha'}`;
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${start}/${end}&details=${encodeURIComponent(details)}`;
  }
}

export const reservationNotificationService = new ReservationNotificationService();
