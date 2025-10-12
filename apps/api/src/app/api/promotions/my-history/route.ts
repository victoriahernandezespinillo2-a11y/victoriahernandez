/**
 * @file My Promotion History API Route
 * @description Endpoint para obtener el historial de promociones usadas por el usuario
 * 
 * @route GET /api/promotions/my-history - Historial de promociones del usuario
 * 
 * @requires Authentication - Usuario debe estar autenticado
 * 
 * @module api/promotions/my-history
 * @version 1.0.0
 * @since 2025-01-12
 */

import { NextRequest } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { ApiResponse } from '@/lib/utils/api-response';
import { db } from '@repo/db';

/**
 * GET - Obtener historial de promociones usadas por el usuario
 * 
 * @description Devuelve todas las aplicaciones de promociones del usuario actual,
 * ordenadas por fecha de aplicación (más recientes primero), junto con estadísticas.
 * 
 * @query {number} [limit=50] - Número máximo de resultados
 * 
 * @returns {Promise<NextResponse>} Lista de aplicaciones y estadísticas
 * 
 * @example
 * GET /api/promotions/my-history?limit=20
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "applications": [{
 *       "id": "xxx",
 *       "creditsAwarded": 10,
 *       "appliedAt": "2025-01-12T...",
 *       "promotion": {
 *         "id": "yyy",
 *         "name": "Bono de Bienvenida",
 *         "type": "SIGNUP_BONUS",
 *         "code": null
 *       }
 *     }],
 *     "stats": {
 *       "totalApplications": 5,
 *       "totalCreditsEarned": 75
 *     }
 *   }
 * }
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [MY-HISTORY] Endpoint llamado');
    
    // 1. Autenticación
    const user = await getAuthUser(request);
    if (!user) {
      console.log('❌ [MY-HISTORY] Usuario no autenticado');
      return ApiResponse.unauthorized('Usuario no autenticado');
    }

    console.log('✅ [MY-HISTORY] Usuario autenticado:', user.email);

    // 2. Parámetros de consulta
    const { searchParams } = request.nextUrl;
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') || '50')));

    console.log('📋 [MY-HISTORY] Parámetros:', { userId: user.id, limit });

    // 3. Obtener historial de aplicaciones
    const applications = await db.promotionApplication.findMany({
      where: { userId: user.id },
      include: {
        promotion: {
          select: {
            id: true,
            name: true,
            type: true,
            code: true
          }
        }
      },
      orderBy: { appliedAt: 'desc' },
      take: limit
    });

    console.log('✅ [MY-HISTORY] Aplicaciones encontradas:', applications.length);

    // 4. Calcular estadísticas
    const totalCreditsEarned = applications.reduce(
      (sum, app) => sum + Number(app.creditsAwarded),
      0
    );

    const stats = {
      totalApplications: applications.length,
      totalCreditsEarned: Math.round(totalCreditsEarned * 100) / 100, // 2 decimales
      byType: {
        SIGNUP_BONUS: applications.filter(a => a.promotion.type === 'SIGNUP_BONUS').length,
        RECHARGE_BONUS: applications.filter(a => a.promotion.type === 'RECHARGE_BONUS').length,
        USAGE_BONUS: applications.filter(a => a.promotion.type === 'USAGE_BONUS').length,
        REFERRAL_BONUS: applications.filter(a => a.promotion.type === 'REFERRAL_BONUS').length,
        DISCOUNT_CODE: applications.filter(a => a.promotion.type === 'DISCOUNT_CODE').length,
        SEASONAL: applications.filter(a => a.promotion.type === 'SEASONAL').length
      }
    };

    console.log('📊 [MY-HISTORY] Estadísticas calculadas:', stats);

    return ApiResponse.success({
      applications,
      stats
    });

  } catch (error) {
    console.error('❌ Error en GET /api/promotions/my-history:', error);
    return ApiResponse.internalError('Error interno del servidor');
  }
}

/**
 * OPTIONS - CORS preflight
 */
export async function OPTIONS() {
  return ApiResponse.success(null);
}


