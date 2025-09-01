/**
 * API Routes para configuración de administración
 * GET /api/admin/settings - Obtener configuración del sistema
 * PUT /api/admin/settings - Actualizar configuración del sistema
 */

import { NextRequest } from 'next/server';
import { withAdminMiddleware, ApiResponse } from '@/lib/middleware';
import { db } from '@repo/db';
import { z } from 'zod';

const prisma = db;

const UpdateSettingsSchema = z.object({
  general: z.object({
    siteName: z.string().min(1, 'El nombre del sitio es requerido').optional(),
    siteDescription: z.string().optional(),
    contactEmail: z.string().email('Email inválido').optional(),
    contactPhone: z.string().optional(),
    address: z.string().optional(),
    timezone: z.string().optional(),
    language: z.enum(['es', 'en']).optional(),
    currency: z.enum(['COP', 'USD', 'EUR']).optional()
  }).optional(),
  
  reservations: z.object({
    maxAdvanceDays: z.number().int().min(1).max(365).optional(),
    minAdvanceHours: z.number().int().min(0).max(72).optional(),
    maxDurationHours: z.number().int().min(1).max(24).optional(),
    cancellationHours: z.number().int().min(0).max(72).optional(),
    autoConfirm: z.boolean().optional(),
    requirePayment: z.boolean().optional(),
    allowRecurring: z.boolean().optional(),
    maxRecurringWeeks: z.number().int().min(1).max(52).optional()
  }).optional(),
  
  payments: z.object({
    stripePublicKey: z.string().optional(),
    stripeSecretKey: z.string().optional(),
    stripeWebhookSecret: z.string().optional(),
    paymentMethods: z.array(z.enum(['card', 'transfer', 'cash'])).optional(),
    refundPolicy: z.enum(['flexible', 'moderate', 'strict']).optional(),
    refundDeadlineHours: z.number().int().min(0).max(168).optional(),
    processingFeePercent: z.number().min(0).max(10).optional()
  }).optional(),
  
  notifications: z.object({
    emailEnabled: z.boolean().optional(),
    smsEnabled: z.boolean().optional(),
    pushEnabled: z.boolean().optional(),
    emailProvider: z.enum(['smtp', 'sendgrid', 'mailgun']).optional(),
    smsProvider: z.enum(['twilio', 'nexmo']).optional(),
    reminderHours: z.array(z.number().int().min(1).max(168)).optional(),
    marketingEnabled: z.boolean().optional()
  }).optional(),
  
  maintenance: z.object({
    autoSchedule: z.boolean().optional(),
    defaultDurationHours: z.number().int().min(1).max(24).optional(),
    advanceNoticeHours: z.number().int().min(1).max(168).optional(),
    allowEmergency: z.boolean().optional(),
    requireApproval: z.boolean().optional()
  }).optional(),
  
  security: z.object({
    sessionTimeoutMinutes: z.number().int().min(15).max(1440).optional(),
    maxLoginAttempts: z.number().int().min(3).max(10).optional(),
    lockoutDurationMinutes: z.number().int().min(5).max(60).optional(),
    requireEmailVerification: z.boolean().optional(),
    requirePhoneVerification: z.boolean().optional(),
    passwordMinLength: z.number().int().min(6).max(32).optional(),
    passwordRequireSpecial: z.boolean().optional(),
    twoFactorEnabled: z.boolean().optional()
  }).optional(),
  
  business: z.object({
    operatingHours: z.object({
      monday: z.object({ open: z.string(), close: z.string(), closed: z.boolean() }).optional(),
      tuesday: z.object({ open: z.string(), close: z.string(), closed: z.boolean() }).optional(),
      wednesday: z.object({ open: z.string(), close: z.string(), closed: z.boolean() }).optional(),
      thursday: z.object({ open: z.string(), close: z.string(), closed: z.boolean() }).optional(),
      friday: z.object({ open: z.string(), close: z.string(), closed: z.boolean() }).optional(),
      saturday: z.object({ open: z.string(), close: z.string(), closed: z.boolean() }).optional(),
      sunday: z.object({ open: z.string(), close: z.string(), closed: z.boolean() }).optional()
    }).optional(),
    holidays: z.array(z.object({
      date: z.string(),
      name: z.string(),
      closed: z.boolean()
    })).optional(),
    seasonalPricing: z.boolean().optional(),
    dynamicPricing: z.boolean().optional(),
    membershipDiscounts: z.boolean().optional()
  }).optional()
});

/**
 * GET /api/admin/settings
 * Obtener configuración del sistema
 * Acceso: ADMIN únicamente
 */
export async function GET(request: NextRequest) {
  return withAdminMiddleware(async (req) => {
    try {
      const { searchParams } = req.nextUrl;
      const centerId = searchParams.get('centerId') || undefined;

      // Preferir configuración asociada a un centro (settings JSON)
      let centerSettings: any = null;
      if (centerId) {
        const center = await prisma.center.findUnique({
          where: { id: centerId },
          select: { settings: true }
        });
        centerSettings = (center?.settings as any) || null;
      }

      // Fallback: derivar configuración básica desde variables de entorno
      const envSettings = {
        general: {
          siteName: process.env.NEXT_PUBLIC_SITE_NAME || 'Polideportivo',
          language: (process.env.NEXT_PUBLIC_DEFAULT_LANG as 'es' | 'en') || 'es',
          currency: (process.env.NEXT_PUBLIC_CURRENCY as 'EUR' | 'USD' | 'COP') || 'EUR',
          timezone: process.env.TZ || 'Europe/Madrid',
        },
        payments: {
          stripePublicKey: process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY || '',
          paymentMethods: ['card'] as Array<'card' | 'transfer' | 'cash'>,
        },
      };

      const result = centerSettings ? centerSettings : envSettings;
      return ApiResponse.success(result);
    } catch (error) {
      console.error('Error obteniendo configuración:', error);
      return ApiResponse.internalError('Error interno del servidor');
    }
  })(request);
}

/**
 * PUT /api/admin/settings
 * Actualizar configuración del sistema
 * Acceso: ADMIN únicamente
 */
export async function PUT(request: NextRequest) {
  return withAdminMiddleware(async (req) => {
    try {
      const body = await req.json();
      const settingsData = UpdateSettingsSchema.parse(body);
      const { searchParams } = req.nextUrl;
      const centerId = searchParams.get('centerId');

      if (!centerId) {
        return ApiResponse.badRequest('centerId es requerido para guardar configuración');
      }

      // Merge settings previos con los nuevos datos a nivel de Center.settings
      const current = await prisma.center.findUnique({ where: { id: centerId }, select: { settings: true } });
      const currentSettings = (current?.settings as any) || {};
      const merged: Record<string, any> = { ...currentSettings, ...settingsData };

      const updatedCenter = await prisma.center.update({
        where: { id: centerId },
        data: { settings: merged },
        select: { id: true, settings: true }
      });

      return ApiResponse.success({ id: updatedCenter.id, settings: updatedCenter.settings });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return ApiResponse.validation(
          error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          }))
        );
      }
      
      console.error('Error actualizando configuración:', error);
      return ApiResponse.internalError('Error interno del servidor');
    }
  })(request);
}

/**
 * Obtener descripción de una configuración específica
 */
function getSettingDescription(category: string, key: string): string {
  const descriptions: Record<string, Record<string, string>> = {
    general: {
      siteName: 'Nombre del sitio web',
      siteDescription: 'Descripción del sitio web',
      contactEmail: 'Email de contacto principal',
      contactPhone: 'Teléfono de contacto principal',
      address: 'Dirección física del negocio',
      timezone: 'Zona horaria del sistema',
      language: 'Idioma predeterminado del sistema',
      currency: 'Moneda predeterminada para pagos'
    },
    reservations: {
      maxAdvanceDays: 'Días máximos de anticipación para reservas',
      minAdvanceHours: 'Horas mínimas de anticipación para reservas',
      maxDurationHours: 'Duración máxima de una reserva en horas',
      cancellationHours: 'Horas límite para cancelar sin penalización',
      autoConfirm: 'Confirmar automáticamente las reservas',
      requirePayment: 'Requerir pago para confirmar reserva',
      allowRecurring: 'Permitir reservas recurrentes',
      maxRecurringWeeks: 'Semanas máximas para reservas recurrentes'
    },
    payments: {
      stripePublicKey: 'Clave pública de Stripe',
      stripeSecretKey: 'Clave secreta de Stripe',
      stripeWebhookSecret: 'Secreto del webhook de Stripe',
      paymentMethods: 'Métodos de pago habilitados',
      refundPolicy: 'Política de reembolsos',
      refundDeadlineHours: 'Horas límite para solicitar reembolso',
      processingFeePercent: 'Porcentaje de comisión por procesamiento'
    },
    notifications: {
      emailEnabled: 'Habilitar notificaciones por email',
      smsEnabled: 'Habilitar notificaciones por SMS',
      pushEnabled: 'Habilitar notificaciones push',
      emailProvider: 'Proveedor de servicios de email',
      smsProvider: 'Proveedor de servicios de SMS',
      reminderHours: 'Horas para enviar recordatorios',
      marketingEnabled: 'Habilitar emails de marketing'
    },
    maintenance: {
      autoSchedule: 'Programar mantenimientos automáticamente',
      defaultDurationHours: 'Duración predeterminada del mantenimiento',
      advanceNoticeHours: 'Horas de aviso previo para mantenimiento',
      allowEmergency: 'Permitir mantenimientos de emergencia',
      requireApproval: 'Requerir aprobación para mantenimientos'
    },
    security: {
      sessionTimeoutMinutes: 'Tiempo de expiración de sesión en minutos',
      maxLoginAttempts: 'Intentos máximos de inicio de sesión',
      lockoutDurationMinutes: 'Duración del bloqueo en minutos',
      requireEmailVerification: 'Requerir verificación de email',
      requirePhoneVerification: 'Requerir verificación de teléfono',
      passwordMinLength: 'Longitud mínima de contraseña',
      passwordRequireSpecial: 'Requerir caracteres especiales en contraseña',
      twoFactorEnabled: 'Habilitar autenticación de dos factores'
    },
    business: {
      operatingHours: 'Horarios de operación',
      holidays: 'Días festivos y cierres especiales',
      seasonalPricing: 'Habilitar precios estacionales',
      dynamicPricing: 'Habilitar precios dinámicos',
      membershipDiscounts: 'Habilitar descuentos por membresía'
    }
  };
  
  return descriptions[category]?.[key] || `Configuración ${key} de ${category}`;
}

/**
 * OPTIONS /api/admin/settings
 * Manejar preflight requests
 */
export async function OPTIONS() {
  return ApiResponse.success(null);
}
