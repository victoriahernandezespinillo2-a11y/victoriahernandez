/**
 * POST /api/promotions/validate
 * Validar código promocional
 */

import { NextRequest } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db } from '@repo/db';
import { ApiResponse } from '@/lib/utils/api-response';
import { z } from 'zod';

const ValidatePromotionSchema = z.object({
  code: z.string().min(1, 'El código es requerido'),
  amount: z.number().positive('El monto debe ser positivo'),
  type: z.enum(['TOPUP', 'RESERVATION']).optional()
});

export async function POST(request: NextRequest) {
  try {
    // 1. Autenticación
    const user = await getAuthUser(request);
    if (!user) {
      return ApiResponse.unauthorized('Usuario no autenticado');
    }

    // 2. Validar input
    const body = await request.json();
    const validatedData = ValidatePromotionSchema.parse(body);

    // 3. Buscar promoción por código
    const promotion = await db.promotion.findUnique({
      where: { code: validatedData.code.toUpperCase() }
    });

    if (!promotion) {
      return ApiResponse.badRequest('Código promocional no válido');
    }

    // 4. Verificar estado
    if (promotion.status !== 'ACTIVE') {
      return ApiResponse.badRequest('La promoción no está activa');
    }

    // 5. Verificar fechas
    const now = new Date();
    if (promotion.validFrom > now) {
      return ApiResponse.badRequest('La promoción aún no es válida');
    }

    if (promotion.validTo && promotion.validTo < now) {
      return ApiResponse.badRequest('La promoción ha expirado');
    }

    // 6. Verificar límite de uso
    if (promotion.usageLimit && promotion.usageCount >= promotion.usageLimit) {
      return ApiResponse.badRequest('La promoción ha alcanzado su límite de uso');
    }

    // 7. Verificar condiciones de monto
    const conditions = promotion.conditions as any;
    if (conditions.minAmount && validatedData.amount < conditions.minAmount) {
      return ApiResponse.badRequest(`El monto mínimo para esta promoción es €${conditions.minAmount}`);
    }

    if (conditions.maxAmount && validatedData.amount > conditions.maxAmount) {
      return ApiResponse.badRequest(`El monto máximo para esta promoción es €${conditions.maxAmount}`);
    }

    // 8. Calcular recompensa
    const rewards = promotion.rewards as any;
    let rewardAmount = 0;

    switch (rewards.type) {
      case 'FIXED_CREDITS':
        rewardAmount = rewards.value;
        break;

      case 'PERCENTAGE_BONUS':
        rewardAmount = validatedData.amount * (rewards.value / 100);
        break;

      case 'DISCOUNT_PERCENTAGE':
        rewardAmount = validatedData.amount * (rewards.value / 100);
        break;

      case 'DISCOUNT_FIXED':
        rewardAmount = rewards.value;
        break;
    }

    // Aplicar límite máximo
    if (rewards.maxRewardAmount && rewardAmount > rewards.maxRewardAmount) {
      rewardAmount = rewards.maxRewardAmount;
    }

    // 9. Respuesta exitosa
    const isDiscount = rewards.type.includes('DISCOUNT');
    const finalAmount = isDiscount 
      ? Math.max(0, validatedData.amount - rewardAmount) // Nunca negativo
      : validatedData.amount + rewardAmount;

    return ApiResponse.success({
      valid: true,
      code: promotion.code, // Agregar el código de la promoción
      promotion: {
        id: promotion.id,
        name: promotion.name,
        type: rewards.type
      },
      reward: {
        amount: rewardAmount,
        isDiscount,
        description: isDiscount 
          ? `${rewards.value}${rewards.type === 'DISCOUNT_PERCENTAGE' ? '%' : '€'} de descuento`
          : `${rewards.value}${rewards.type === 'PERCENTAGE_BONUS' ? '%' : '€'} de bonus`
      },
      originalAmount: validatedData.amount,
      finalAmount: finalAmount,
      savings: isDiscount ? rewardAmount : 0,
      bonus: !isDiscount ? rewardAmount : 0
    });

  } catch (error) {
    console.error('Error en POST /api/promotions/validate:', error);
    
    if (error instanceof z.ZodError) {
      return ApiResponse.badRequest('Datos de entrada inválidos');
    }

    return ApiResponse.internalError('Error interno del servidor');
  }
}
