/**
 * Exportaciones seguras para el cliente (browser)
 * Este archivo solo exporta constantes y tipos que no requieren módulos de Node.js
 */

// Exportar todas las plantillas de email disponibles (sin dependencias de Node.js)
export const EMAIL_TEMPLATES = {
  // Autenticación y verificación
  EMAIL_VERIFICATION: 'email-verification',
  PASSWORD_RESET: 'password-reset',
  PASSWORD_CHANGED: 'password-changed',
  WELCOME: 'welcome',
  
  // Reservas
  RESERVATION_CONFIRMATION: 'reservationConfirmation',
  RESERVATION_REMINDER: 'reservationReminder',
  RESERVATION_CANCELLED: 'reservationCancelled',
  
  // Membresías
  MEMBERSHIP_EXPIRING: 'membershipExpiring',
  MEMBERSHIP_EXPIRED: 'membershipExpired',
  MEMBERSHIP_RENEWED: 'membershipRenewed',
  
  // Pagos
  PAYMENT_CONFIRMATION: 'paymentConfirmation',
  PAYMENT_FAILED: 'paymentFailed',
  PAYMENT_REFUND: 'paymentRefund',
  
  // Promociones y marketing
  PROMOTION_ANNOUNCEMENT: 'promotionAnnouncement',
  NEWSLETTER: 'newsletter',
  
  // Administrativos
  CONTACT_FORM: 'contactForm',
  MAINTENANCE_NOTIFICATION: 'maintenanceNotification',
} as const;

// Metadatos de las plantillas para el admin
export const EMAIL_TEMPLATE_METADATA = {
  'email-verification': {
    name: 'Verificación de Email',
    description: 'Email para verificar la dirección de correo del usuario',
    variables: ['firstName', 'verificationUrl'],
    category: 'Autenticación'
  },
  'password-reset': {
    name: 'Restablecer Contraseña',
    description: 'Email para restablecer la contraseña del usuario',
    variables: ['firstName', 'resetUrl', 'expirationTime'],
    category: 'Autenticación'
  },
  'password-changed': {
    name: 'Contraseña Cambiada',
    description: 'Confirmación de cambio de contraseña',
    variables: ['firstName', 'changeTime'],
    category: 'Autenticación'
  },
  'welcome': {
    name: 'Bienvenida',
    description: 'Email de bienvenida para nuevos usuarios',
    variables: ['firstName', 'dashboardUrl'],
    category: 'Autenticación'
  },
  'reservationConfirmation': {
    name: 'Confirmación de Reserva',
    description: 'Confirmación de reserva de cancha',
    variables: ['userName', 'courtName', 'date', 'startTime', 'endTime', 'duration', 'price', 'reservationCode', 'qrCodeDataUrl', 'accessPassUrl', 'googleCalendarUrl'],
    category: 'Reservas'
  },
  'reservationReminder': {
    name: 'Recordatorio de Reserva',
    description: 'Recordatorio de reserva próxima',
    variables: ['userName', 'courtName', 'date', 'startTime', 'endTime', 'reservationCode'],
    category: 'Reservas'
  },
  'reservationCancelled': {
    name: 'Reserva Cancelada',
    description: 'Notificación de cancelación de reserva',
    variables: ['userName', 'courtName', 'date', 'startTime', 'endTime', 'refundAmount'],
    category: 'Reservas'
  },
  'membershipExpiring': {
    name: 'Membresía por Vencer',
    description: 'Aviso de membresía próxima a vencer',
    variables: ['firstName', 'membershipType', 'expirationDate', 'renewUrl'],
    category: 'Membresías'
  },
  'membershipExpired': {
    name: 'Membresía Vencida',
    description: 'Notificación de membresía vencida',
    variables: ['firstName', 'membershipType', 'renewUrl'],
    category: 'Membresías'
  },
  'membershipRenewed': {
    name: 'Membresía Renovada',
    description: 'Confirmación de renovación de membresía',
    variables: ['firstName', 'membershipType', 'newExpirationDate', 'amount'],
    category: 'Membresías'
  },
  'paymentConfirmation': {
    name: 'Confirmación de Pago',
    description: 'Confirmación de pago exitoso',
    variables: ['firstName', 'amount', 'paymentMethod', 'transactionId', 'description'],
    category: 'Pagos'
  },
  'paymentFailed': {
    name: 'Pago Fallido',
    description: 'Notificación de pago fallido',
    variables: ['firstName', 'amount', 'paymentMethod', 'errorReason', 'retryUrl'],
    category: 'Pagos'
  },
  'paymentRefund': {
    name: 'Reembolso Procesado',
    description: 'Confirmación de reembolso',
    variables: ['firstName', 'amount', 'refundReason', 'transactionId'],
    category: 'Pagos'
  },
  'promotionAnnouncement': {
    name: 'Anuncio de Promoción',
    description: 'Anuncio de nueva promoción o oferta',
    variables: ['firstName', 'promotionTitle', 'promotionDescription', 'discountAmount', 'expirationDate', 'promoCode'],
    category: 'Marketing'
  },
  'newsletter': {
    name: 'Newsletter',
    description: 'Newsletter periódico con noticias y actualizaciones',
    variables: ['firstName', 'newsletterContent', 'unsubscribeUrl'],
    category: 'Marketing'
  },
  'contactForm': {
    name: 'Formulario de Contacto',
    description: 'Confirmación de recepción de formulario de contacto',
    variables: ['firstName', 'subject', 'message', 'responseTime'],
    category: 'Administrativo'
  },
  'maintenanceNotification': {
    name: 'Notificación de Mantenimiento',
    description: 'Aviso de mantenimiento programado',
    variables: ['firstName', 'maintenanceDate', 'maintenanceTime', 'affectedAreas', 'duration'],
    category: 'Administrativo'
  }
} as const;

export type EmailTemplateName = typeof EMAIL_TEMPLATES[keyof typeof EMAIL_TEMPLATES];

