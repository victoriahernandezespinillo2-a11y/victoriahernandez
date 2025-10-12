/**
 * GET /api/admin/credits/users/[userId]
 * Obtener historial de créditos de un usuario específico (solo admin)
 */

import { NextRequest } from 'next/server';
import { withAdminMiddleware, ApiResponse } from '@/lib/middleware';
import { db } from '@repo/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  return withAdminMiddleware(async (req) => {
    try {
      const { searchParams } = request.nextUrl;
      const limit = parseInt(searchParams.get('limit') || '50');
      const offset = parseInt(searchParams.get('offset') || '0');

      const { userId } = await params;

      // 1. Verificar que el usuario existe
      const user = await db.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          creditsBalance: true,
          createdAt: true
        }
      });

      if (!user) {
        return ApiResponse.notFound('Usuario no encontrado');
      }

      // 2. Obtener historial de transacciones
      const transactions = await db.walletLedger.findMany({
        where: { userId: userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset
      });

      // 3. Obtener estadísticas del usuario
      const [stats, promotionsApplied] = await Promise.all([
        db.walletLedger.aggregate({
          where: { userId: userId },
          _count: { id: true },
          _sum: { credits: true }
        }),
        
        db.promotionApplication.findMany({
          where: { userId: userId },
          include: {
            promotion: {
              select: {
                id: true,
                name: true,
                type: true
              }
            }
          },
          orderBy: { appliedAt: 'desc' },
          take: 10
        })
      ]);

      // 4. Calcular estadísticas por tipo
      const creditTransactions = transactions.filter(t => t.type === 'CREDIT');
      const debitTransactions = transactions.filter(t => t.type === 'DEBIT');

      const totalCreditsReceived = creditTransactions.reduce(
        (sum, t) => sum + Number(t.credits), 
        0
      );
      const totalCreditsSpent = debitTransactions.reduce(
        (sum, t) => sum + Number(t.credits), 
        0
      );

      // 5. Respuesta completa
      return ApiResponse.success({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          currentBalance: Number(user.creditsBalance),
          memberSince: user.createdAt
        },
        statistics: {
          totalTransactions: stats._count.id,
          totalCreditsReceived,
          totalCreditsSpent,
          netCredits: totalCreditsReceived - totalCreditsSpent,
          creditTransactions: creditTransactions.length,
          debitTransactions: debitTransactions.length
        },
        transactions: transactions.map(t => ({
          id: t.id,
          type: t.type,
          reason: t.reason,
          credits: Number(t.credits),
          balanceAfter: Number(t.balanceAfter),
          metadata: t.metadata,
          idempotencyKey: t.idempotencyKey,
          createdAt: t.createdAt
        })),
        promotions: promotionsApplied.map(p => ({
          id: p.id,
          promotion: p.promotion,
          creditsAwarded: Number(p.creditsAwarded),
          appliedAt: p.appliedAt,
          metadata: p.metadata
        })),
        pagination: {
          limit,
          offset,
          total: stats._count.id,
          hasMore: offset + limit < stats._count.id
        }
      });

    } catch (error) {
      console.error('Error en GET /api/admin/credits/users/[userId]:', error);
      return ApiResponse.internalError('Error interno del servidor');
    }
  })(request);
}


