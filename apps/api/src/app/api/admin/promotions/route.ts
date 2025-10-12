/**
 * @file Admin Promotions API Routes
 * @description Endpoints para gestión completa del sistema de promociones (admin only)
 * 
 * @route GET  /api/admin/promotions - Listar todas las promociones con filtros
 * @route POST /api/admin/promotions - Crear nueva promoción
 * 
 * @requires Authentication - Usuario debe tener rol ADMIN
 * @requires Authorization - Validado automáticamente por withAdminMiddleware
 * 
 * @module api/admin/promotions
 * @version 2.0.0
 * @since 2025-01-12 - Added REFERRAL_BONUS and DISCOUNT_CODE types
 * 
 * @see {@link https://github.com/colinhacks/zod} Zod Validation Library
 * @see {@link PromotionType} Enum de tipos de promoción en Prisma
 * @see {@link PromotionStatus} Enum de estados de promoción
 */

import { NextRequest } from 'next/server';
import { withAdminMiddleware } from '@/lib/middleware';
import { ApiResponse } from '@/lib/utils/api-response';
import { db } from '@repo/db';
import { z } from 'zod';

/**
 * Schema de validación para creación de promociones
 * 
 * @description Valida todos los campos requeridos y opcionales para crear una promoción.
 * Implementa validaciones robustas de tipos, formatos y restricciones de negocio.
 * 
 * @property {string} name - Nombre descriptivo de la promoción (min 3 caracteres)
 * @property {string} [code] - Código único para aplicar la promoción (opcional, se convierte a mayúsculas)
 * @property {PromotionType} type - Tipo de promoción que determina cuándo y cómo se aplica
 * @property {object} [conditions] - Condiciones de aplicabilidad (montos, horarios, días)
 * @property {object} rewards - Definición de la recompensa a otorgar
 * @property {string} validFrom - Fecha de inicio (ISO 8601 format)
 * @property {string} [validTo] - Fecha de fin (opcional, ISO 8601 format)
 * @property {number} [usageLimit] - Límite global de aplicaciones (opcional)
 * 
 * @example
 * {
 *   name: "Black Friday 2025",
 *   code: "BLACKFRIDAY",
 *   type: "RECHARGE_BONUS",
 *   conditions: { minTopupAmount: 50 },
 *   rewards: { type: "PERCENTAGE_BONUS", value: 50, maxRewardAmount: 50 },
 *   validFrom: "2025-11-24T00:00:00Z",
 *   validTo: "2025-11-27T23:59:59Z",
 *   usageLimit: 1000
 * }
 */
const CreatePromotionSchema = z.object({
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
  code: z.string().optional(),
  
  /**
   * Tipo de promoción:
   * 
   * @enum {string}
   * 
   * SIGNUP_BONUS - Bono otorgado automáticamente al registrarse
   *   • Se aplica una sola vez por usuario
   *   • Solo acepta FIXED_CREDITS como recompensa
   *   • No requiere código ni monto
   *   • Ejemplo: "Regístrate y recibe 10 créditos gratis"
   * 
   * RECHARGE_BONUS - Bono al recargar créditos
   *   • Se aplica al completar una recarga
   *   • Acepta FIXED_CREDITS o PERCENTAGE_BONUS
   *   • Puede tener minTopupAmount
   *   • Ejemplo: "Recarga 100€ y recibe 10€ extra"
   * 
   * USAGE_BONUS - Bonus/descuento al usar el servicio
   *   • Se aplica al pagar una reserva
   *   • Acepta todos los tipos de recompensa
   *   • Puede tener restricciones de horario/día
   *   • Ejemplo: "10% de descuento los miércoles"
   * 
   * REFERRAL_BONUS - Bono por referir amigos (NUEVO)
   *   • Se aplica cuando un referido completa una acción
   *   • Solo acepta FIXED_CREDITS
   *   • Requiere sistema de tracking de referidos
   *   • Ejemplo: "Refiere un amigo y ambos reciben 15 créditos"
   * 
   * DISCOUNT_CODE - Código promocional genérico (NUEVO)
   *   • Usuario ingresa el código manualmente
   *   • Acepta todos los tipos de recompensa
   *   • Requiere campo 'code'
   *   • Ejemplo: "Usa VERANO25 y obtén 25% de descuento"
   * 
   * SEASONAL - Promoción temporal/estacional
   *   • Vinculada a fechas específicas (Black Friday, Navidad, etc.)
   *   • Acepta todos los tipos de recompensa
   *   • Puede tener todas las condiciones
   *   • Ejemplo: "Black Friday: 50% de descuento en todo"
   */
  type: z.enum([
    'SIGNUP_BONUS',      // Bono de registro
    'RECHARGE_BONUS',    // Bono de recarga
    'USAGE_BONUS',       // Bono por uso
    'REFERRAL_BONUS',    // Bono de referido (NUEVO)
    'DISCOUNT_CODE',     // Código de descuento (NUEVO)
    'SEASONAL'           // Promoción temporal
  ]),
  
  /**
   * Condiciones de aplicabilidad
   * 
   * @property {number} [minAmount] - Monto mínimo de transacción (en EUR)
   * @property {number} [maxAmount] - Monto máximo de transacción (en EUR)
   * @property {number} [minTopupAmount] - Monto mínimo de recarga (solo para RECHARGE_BONUS)
   * @property {number[]} [dayOfWeek] - Días de semana válidos [0=Lun, 1=Mar, ..., 6=Dom]
   * @property {object} [timeOfDay] - Horario válido
   * @property {string} timeOfDay.start - Hora de inicio (formato HH:MM)
   * @property {string} timeOfDay.end - Hora de fin (formato HH:MM)
   * 
   * @example
   * {
   *   minAmount: 20,
   *   dayOfWeek: [1, 2, 3, 4, 5], // Lunes a viernes
   *   timeOfDay: { start: "14:00", end: "16:00" } // Happy hour
   * }
   */
  conditions: z.object({
    minAmount: z.number().optional(),
    maxAmount: z.number().optional(),
    minTopupAmount: z.number().optional(),
    dayOfWeek: z.array(z.number()).optional(),
    timeOfDay: z.object({
      start: z.string(),
      end: z.string()
    }).optional()
  }).optional().default({}),
  
  /**
   * Recompensa a otorgar
   * 
   * @property {RewardType} type - Tipo de recompensa
   * @property {number} value - Valor de la recompensa
   * @property {number} [maxRewardAmount] - Límite máximo de la recompensa (en EUR o créditos)
   * @property {boolean} [stackable] - Si se puede combinar con otras promociones
   * 
   * Tipos de recompensa:
   * 
   * FIXED_CREDITS - Cantidad fija de créditos
   *   • value: cantidad de créditos a otorgar
   *   • Ejemplo: value=10 → "Recibe 10 créditos"
   * 
   * PERCENTAGE_BONUS - Porcentaje adicional del monto
   *   • value: porcentaje (sin símbolo %)
   *   • Ejemplo: value=10 → "10% extra en tu recarga"
   * 
   * DISCOUNT_PERCENTAGE - Descuento porcentual
   *   • value: porcentaje de descuento
   *   • Ejemplo: value=15 → "15% de descuento"
   * 
   * DISCOUNT_FIXED - Descuento fijo en euros
   *   • value: cantidad de descuento en EUR
   *   • Ejemplo: value=5 → "5€ de descuento"
   * 
   * @example
   * {
   *   type: "PERCENTAGE_BONUS",
   *   value: 50,
   *   maxRewardAmount: 50,
   *   stackable: false
   * }
   */
  rewards: z.object({
    type: z.enum([
      'FIXED_CREDITS',        // Créditos fijos
      'PERCENTAGE_BONUS',     // Bonus porcentual
      'DISCOUNT_PERCENTAGE',  // Descuento porcentual
      'DISCOUNT_FIXED'        // Descuento fijo
    ]),
    value: z.number().positive('El valor debe ser positivo'),
    maxRewardAmount: z.number().optional(),
    stackable: z.boolean().optional()
  }),
  
  /** Fecha de inicio de validez (ISO 8601 format) */
  validFrom: z.string().datetime(),
  
  /** Fecha de fin de validez (opcional, ISO 8601 format) */
  validTo: z.string().datetime().optional(),
  
  /** Límite global de aplicaciones (null = ilimitado) */
  usageLimit: z.number().optional()
});

/**
 * GET - Listar promociones
 */
export async function GET(request: NextRequest) {
  return withAdminMiddleware(async (req) => {
    try {
      const { searchParams } = req.nextUrl;
      const status = searchParams.get('status');
      const type = searchParams.get('type');
      const limit = parseInt(searchParams.get('limit') || '100');
      const offset = parseInt(searchParams.get('offset') || '0');

      console.log('🔄 [GET-PROMOTIONS] Parámetros recibidos:', { status, type, limit, offset });

      const promotions = await db.promotion.findMany({
        where: {
          ...(status && status !== 'ALL' && { status: status as any }),
          ...(type && { type: type as any })
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          _count: {
            select: {
              applications: true
            }
          }
        }
      });

      console.log('🔄 [GET-PROMOTIONS] Promociones encontradas:', promotions.length);

      return ApiResponse.success({
        promotions,
        pagination: {
          limit,
          offset,
          total: promotions.length
        }
      });

    } catch (error) {
      console.error('Error en GET /api/admin/promotions:', error);
      return ApiResponse.internalError('Error interno del servidor');
    }
  })(request);
}

/**
 * POST - Crear promoción
 */
export async function POST(request: NextRequest) {
  console.log('🔄 [CREATE-PROMOTION] Endpoint POST llamado');
  try {
    return await withAdminMiddleware(async (req) => {
      try {
        console.log('🔄 [CREATE-PROMOTION] Dentro del middleware, obteniendo body...');
        const body = await req.json();
        console.log('🔄 [CREATE-PROMOTION] Datos recibidos:', body);
        
        const validatedData = CreatePromotionSchema.parse(body);
        console.log('✅ [CREATE-PROMOTION] Datos validados:', validatedData);

        // Validar código único si se proporciona
        if (validatedData.code) {
          const existing = await db.promotion.findUnique({
            where: { code: validatedData.code.toUpperCase() }
          });

          if (existing) {
            return ApiResponse.badRequest('Ya existe una promoción con ese código');
          }
        }

        // Crear promoción
        const promotion = await db.promotion.create({
          data: {
            name: validatedData.name,
            code: validatedData.code?.toUpperCase(),
            type: validatedData.type,
            status: 'ACTIVE',
            conditions: validatedData.conditions || {},
            rewards: validatedData.rewards,
            validFrom: new Date(validatedData.validFrom),
            validTo: validatedData.validTo ? new Date(validatedData.validTo) : null,
            usageLimit: validatedData.usageLimit,
            usageCount: 0
          }
        });

        return ApiResponse.success(promotion, 'Promoción creada exitosamente');

      } catch (error) {
        console.error('❌ [CREATE-PROMOTION] Error capturado:', error);
        console.error('❌ [CREATE-PROMOTION] Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
        
        if (error instanceof z.ZodError) {
          console.error('❌ [CREATE-PROMOTION] Errores de validación:', error.errors);
          return ApiResponse.badRequest('Datos de entrada inválidos');
        }

        return ApiResponse.internalError('Error interno del servidor');
      }
    })(request);
  } catch (middlewareError) {
    console.error('❌ [CREATE-PROMOTION] Error en middleware:', middlewareError);
    return ApiResponse.internalError('Error en middleware de autenticación');
  }
}
