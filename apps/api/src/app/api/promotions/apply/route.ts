/**
 * @file Apply Promotion API Route
 * @description Endpoint para aplicar una promoción y otorgar créditos al usuario
 * 
 * @route POST /api/promotions/apply - Aplicar promoción manualmente
 * 
 * @requires Authentication - Usuario debe estar autenticado
 * 
 * @module api/promotions/apply
 * @version 1.0.0
 * @since 2025-01-12
 */

import { NextRequest } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { ApiResponse } from '@/lib/utils/api-response';
import { db } from '@repo/db';
import { z } from 'zod';

const ApplyPromotionSchema = z.object({
  promotionId: z.string().cuid('ID de promoción inválido'),
  amount: z.number().positive('El monto debe ser positivo').optional(), // Para calcular bonus porcentual
  metadata: z.record(z.any()).optional()
});

/**
 * POST - Aplicar una promoción y otorgar créditos
 * 
 * @description Aplica una promoción al usuario actual, validando todas las condiciones
 * y otorgando los créditos correspondientes en una transacción atómica.
 * 
 * @body {string} promotionId - ID de la promoción a aplicar
 * @body {number} [amount] - Monto de transacción (requerido para bonus porcentuales)
 * @body {object} [metadata] - Metadata adicional
 * 
 * @returns {Promise<NextResponse>} Créditos otorgados y nuevo balance
 * 
 * @example
 * POST /api/promotions/apply
 * {
 *   "promotionId": "clxxx...",
 *   "amount": 100
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "creditsAwarded": 50,
 *     "newBalance": 150,
 *     "promotion": { ... }
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🔄 [APPLY-PROMOTION] Endpoint llamado');
    
    // 1. Autenticación
    const user = await getAuthUser(request);
    if (!user) {
      console.log('❌ [APPLY-PROMOTION] Usuario no autenticado');
      return ApiResponse.unauthorized('Usuario no autenticado');
    }

    console.log('✅ [APPLY-PROMOTION] Usuario autenticado:', user.email);

    // 2. Validar input
    const body = await request.json();
    console.log('📥 [APPLY-PROMOTION] Body recibido:', body);
    
    const validatedData = ApplyPromotionSchema.parse(body);
    console.log('✅ [APPLY-PROMOTION] Datos validados:', validatedData);

    // 3. Buscar promoción
    const promotion = await db.promotion.findUnique({
      where: { id: validatedData.promotionId }
    });

    if (!promotion) {
      console.log('❌ [APPLY-PROMOTION] Promoción no encontrada');
      return ApiResponse.notFound('Promoción no encontrada');
    }

    console.log('✅ [APPLY-PROMOTION] Promoción encontrada:', {
      name: promotion.name,
      type: promotion.type,
      status: promotion.status
    });

    // 4. Verificar estado
    if (promotion.status !== 'ACTIVE') {
      console.log('❌ [APPLY-PROMOTION] Promoción no está activa');
      return ApiResponse.badRequest('La promoción no está activa');
    }

    // 5. Verificar fechas
    const now = new Date();
    if (promotion.validFrom > now) {
      console.log('❌ [APPLY-PROMOTION] Promoción aún no es válida');
      return ApiResponse.badRequest('La promoción aún no es válida');
    }

    if (promotion.validTo && promotion.validTo < now) {
      console.log('❌ [APPLY-PROMOTION] Promoción ha expirado');
      return ApiResponse.badRequest('La promoción ha expirado');
    }

    // 6. Verificar límite de uso global
    if (promotion.usageLimit && promotion.usageCount >= promotion.usageLimit) {
      console.log('❌ [APPLY-PROMOTION] Límite de uso alcanzado');
      return ApiResponse.badRequest('La promoción ha alcanzado su límite de uso');
    }

    // 7. Verificar si el usuario ya usó esta promoción (según tipo)
    const existingApplication = await db.promotionApplication.findFirst({
      where: {
        promotionId: promotion.id,
        userId: user.id
      }
    });

    // SIGNUP_BONUS y REFERRAL_BONUS solo se pueden usar una vez por usuario
    if (existingApplication && ['SIGNUP_BONUS', 'REFERRAL_BONUS'].includes(promotion.type)) {
      console.log('❌ [APPLY-PROMOTION] Usuario ya usó esta promoción');
      return ApiResponse.badRequest('Ya has usado esta promoción');
    }

    console.log('✅ [APPLY-PROMOTION] Validaciones pasadas, calculando créditos...');

    // 8. Calcular créditos a otorgar
    const rewards = promotion.rewards as any;
    let creditsAwarded = 0;

    switch (rewards.type) {
      case 'FIXED_CREDITS':
        creditsAwarded = rewards.value;
        console.log('💰 [APPLY-PROMOTION] Tipo: FIXED_CREDITS, Valor:', rewards.value);
        break;

      case 'PERCENTAGE_BONUS':
        if (!validatedData.amount) {
          console.log('❌ [APPLY-PROMOTION] Monto requerido para PERCENTAGE_BONUS');
          return ApiResponse.badRequest('Se requiere un monto para calcular el bonus porcentual');
        }
        creditsAwarded = validatedData.amount * (rewards.value / 100);
        console.log('💰 [APPLY-PROMOTION] Tipo: PERCENTAGE_BONUS, Monto:', validatedData.amount, 'Bonus:', rewards.value, '%');
        break;

      default:
        console.log('❌ [APPLY-PROMOTION] Tipo de recompensa no soportado:', rewards.type);
        return ApiResponse.badRequest('Tipo de recompensa no soportado para aplicación directa');
    }

    // Aplicar límite máximo de recompensa
    if (rewards.maxRewardAmount && creditsAwarded > rewards.maxRewardAmount) {
      console.log(`⚠️ [APPLY-PROMOTION] Aplicando límite máximo: ${creditsAwarded} → ${rewards.maxRewardAmount}`);
      creditsAwarded = rewards.maxRewardAmount;
    }

    // Redondear a 2 decimales
    creditsAwarded = Math.round(creditsAwarded * 100) / 100;

    console.log('💰 [APPLY-PROMOTION] Créditos a otorgar:', creditsAwarded);

    // 9. Transacción atómica: Aplicar promoción y otorgar créditos
    console.log('🔄 [APPLY-PROMOTION] Iniciando transacción...');
    
    const result = await db.$transaction(async (tx) => {
      // Registrar aplicación de promoción
      const application = await tx.promotionApplication.create({
        data: {
          promotionId: promotion.id,
          userId: user.id,
          creditsAwarded,
          metadata: validatedData.metadata || {}
        }
      });

      console.log('✅ [APPLY-PROMOTION] Aplicación registrada:', application.id);

      // Incrementar contador de uso de promoción
      await tx.promotion.update({
        where: { id: promotion.id },
        data: { usageCount: { increment: 1 } }
      });

      console.log('✅ [APPLY-PROMOTION] Contador de uso incrementado');

      // Actualizar balance de créditos del usuario
      const updatedUser = await tx.user.update({
        where: { id: user.id },
        data: { creditsBalance: { increment: creditsAwarded } }
      });

      console.log('✅ [APPLY-PROMOTION] Balance actualizado:', {
        previous: Number(updatedUser.creditsBalance) - creditsAwarded,
        awarded: creditsAwarded,
        new: Number(updatedUser.creditsBalance)
      });

      // Registrar en el wallet ledger
      await tx.walletLedger.create({
        data: {
          userId: user.id,
          type: 'CREDIT',
          reason: 'TOPUP', // Podríamos agregar PROMOTION como reason en el futuro
          credits: creditsAwarded,
          balanceAfter: updatedUser.creditsBalance,
          metadata: {
            promotionId: promotion.id,
            promotionName: promotion.name,
            promotionType: promotion.type,
            autoApplied: false,
            ...(validatedData.metadata || {})
          },
          idempotencyKey: `PROMOTION_APPLY:${promotion.id}:${user.id}:${Date.now()}`
        }
      });

      console.log('✅ [APPLY-PROMOTION] Registro en ledger creado');

      return { 
        application, 
        newBalance: Number(updatedUser.creditsBalance)
      };
    });

    console.log('🎉 [APPLY-PROMOTION] Transacción completada exitosamente');

    return ApiResponse.success({
      creditsAwarded,
      newBalance: result.newBalance,
      promotion: {
        id: promotion.id,
        name: promotion.name,
        type: promotion.type
      }
    }, 'Promoción aplicada exitosamente');

  } catch (error) {
    console.error('❌ Error en POST /api/promotions/apply:', error);
    
    if (error instanceof z.ZodError) {
      return ApiResponse.badRequest('Datos de entrada inválidos');
    }

    return ApiResponse.internalError('Error interno del servidor');
  }
}

/**
 * OPTIONS - CORS preflight
 */
export async function OPTIONS() {
  return ApiResponse.success(null);
}


