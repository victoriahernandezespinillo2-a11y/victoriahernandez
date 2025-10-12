/**
 * @file Active Promotions API Route
 * @description Endpoint público para listar promociones activas disponibles
 * 
 * @route GET /api/promotions/active - Listar promociones activas con códigos
 * 
 * @module api/promotions/active
 * @version 1.0.0
 * @since 2025-01-12
 */

import { NextRequest } from 'next/server';
import { ApiResponse } from '@/lib/utils/api-response';
import { db } from '@repo/db';

/**
 * GET - Listar promociones activas disponibles para usuarios
 * 
 * @description Devuelve todas las promociones que:
 * - Están en estado ACTIVE
 * - Están dentro del período de validez
 * - Tienen código asociado (son públicas)
 * - No han alcanzado su límite de uso
 * 
 * @query {string} [type] - Filtrar por tipo (SIGNUP_BONUS, RECHARGE_BONUS, etc.)
 * 
 * @returns {Promise<NextResponse>} Lista de promociones activas
 * 
 * @example
 * GET /api/promotions/active?type=RECHARGE_BONUS
 * 
 * Response:
 * {
 *   success: true,
 *   data: {
 *     promotions: [{
 *       id: "xxx",
 *       name: "Black Friday",
 *       code: "BLACKFRIDAY",
 *       type: "RECHARGE_BONUS",
 *       rewards: { type: "PERCENTAGE_BONUS", value: 50 },
 *       validFrom: "2025-11-24T00:00:00Z",
 *       validTo: "2025-11-27T23:59:59Z"
 *     }],
 *     count: 1
 *   }
 * }
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const type = searchParams.get('type'); // Filtro opcional por tipo

    console.log('🔍 [ACTIVE-PROMOTIONS] Buscando promociones activas:', { type });

    const now = new Date();

    const promotions = await db.promotion.findMany({
      where: {
        // Solo promociones activas
        status: 'ACTIVE',
        
        // Dentro del período de validez
        validFrom: { lte: now },
        OR: [
          { validTo: null },           // Sin fecha de fin
          { validTo: { gte: now } }    // O aún no expiró
        ],
        
        // Solo promociones con código (públicas)
        code: { not: null },
        
        // Filtro opcional por tipo
        ...(type && { type: type as any })
      },
      select: {
        id: true,
        name: true,
        code: true,
        type: true,
        rewards: true,
        conditions: true,
        validFrom: true,
        validTo: true,
        usageLimit: true,
        usageCount: true
      },
      orderBy: [
        { createdAt: 'desc' }
      ]
    });

    // Filtrar promociones que no han alcanzado su límite
    const availablePromotions = promotions.filter(promo => 
      !promo.usageLimit || promo.usageCount < promo.usageLimit
    );

    console.log('✅ [ACTIVE-PROMOTIONS] Encontradas:', {
      total: promotions.length,
      available: availablePromotions.length
    });

    return ApiResponse.success({
      promotions: availablePromotions,
      count: availablePromotions.length
    });

  } catch (error) {
    console.error('❌ Error en GET /api/promotions/active:', error);
    return ApiResponse.internalError('Error interno del servidor');
  }
}

/**
 * OPTIONS - CORS preflight
 */
export async function OPTIONS() {
  return ApiResponse.success(null);
}


