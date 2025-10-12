/**
 * @file API endpoint para estadísticas de referidos
 * @description Obtiene estadísticas de referidos del usuario autenticado
 * @route GET /api/referrals/stats
 * @requires Authentication
 */

import { NextRequest } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { ApiResponse } from '@/lib/utils/api-response';
import { db } from '@repo/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/referrals/stats
 * Obtener estadísticas de referidos del usuario autenticado
 * 
 * @returns {Promise<NextResponse>} Estadísticas de referidos
 */
export async function GET(request: NextRequest) {
  try {
    console.log('📊 [REFERRAL-STATS] Obteniendo estadísticas de referidos');

    // Obtener usuario autenticado
    const user = await getAuthUser(request);
    if (!user) {
      return ApiResponse.unauthorized('Usuario no autenticado');
    }

    console.log('👤 [REFERRAL-STATS] Usuario:', user.email);

    // Obtener estadísticas de referidos
    const [referralStats, referralBonus] = await Promise.all([
      // Contar referidos directos
      db.user.count({
        where: { referredBy: user.id }
      }),

      // Obtener bonos de referido recibidos
      db.promotionApplication.findMany({
        where: {
          userId: user.id,
          metadata: {
            path: ['reason'],
            equals: 'REFERRAL'
          }
        },
        include: {
          promotion: {
            select: {
              id: true,
              name: true,
              type: true
            }
          }
        },
        orderBy: { appliedAt: 'desc' }
      })
    ]);

    // Calcular créditos totales ganados por referidos
    const totalCreditsEarned = referralBonus.reduce((sum, bonus) => sum + Number(bonus.creditsAwarded), 0);

    // Obtener lista de referidos recientes
    const recentReferrals = await db.user.findMany({
      where: { referredBy: user.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    const stats = {
      totalReferrals: referralStats,
      totalCreditsEarned,
      recentReferrals: recentReferrals.map(ref => ({
        id: ref.id,
        name: `${ref.firstName || ''} ${ref.lastName || ''}`.trim() || ref.email,
        email: ref.email,
        joinedAt: ref.createdAt
      })),
      referralBonuses: referralBonus.map(bonus => ({
        id: bonus.id,
        promotionName: bonus.promotion.name,
        creditsAwarded: bonus.creditsAwarded,
        appliedAt: bonus.appliedAt,
        referredUserId: (bonus.metadata as any)?.referredUserId
      }))
    };

    console.log('📊 [REFERRAL-STATS] Estadísticas obtenidas:', {
      totalReferrals: stats.totalReferrals,
      totalCreditsEarned: stats.totalCreditsEarned,
      recentCount: stats.recentReferrals.length
    });

    return ApiResponse.success(stats);

  } catch (error) {
    console.error('❌ [REFERRAL-STATS] Error:', error);
    return ApiResponse.internalError('Error obteniendo estadísticas de referidos');
  }
}
