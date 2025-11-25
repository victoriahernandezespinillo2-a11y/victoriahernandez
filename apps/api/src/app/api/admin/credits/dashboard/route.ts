/**
 * GET /api/admin/credits/dashboard
 * Obtener métricas y estadísticas del sistema de créditos (solo admin)
 */

import { NextRequest } from 'next/server';
import { withAdminMiddleware, ApiResponse } from '@/lib/middleware';
import { db } from '@repo/db';

export async function GET(request: NextRequest) {
  console.log('🎯 [API] GET /admin/credits/dashboard - Iniciando...');
  return withAdminMiddleware(async (req) => {
    try {
      console.log('🔐 [API] Middleware admin pasado, procesando request...');
      const { searchParams } = req.nextUrl;
      const period = searchParams.get('period') || '30d'; // 7d, 30d, 90d, all
      console.log('📅 [API] Periodo solicitado:', period);
      
      // Calcular fecha de inicio según período
      const now = new Date();
      let startDate: Date;
      
      switch (period) {
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(0); // Desde el inicio
          break;
      }

      // 1. MÉTRICAS GENERALES
      const [
        totalUsers,
        usersWithCredits,
        totalCreditsInCirculation,
        totalTransactions,
        recentTransactions
      ] = await Promise.all([
        // Total de usuarios
        db.user.count(),
        
        // Usuarios con créditos
        db.user.count({
          where: {
            creditsBalance: { gt: 0 }
          }
        }),
        
        // Total de créditos en circulación
        db.user.aggregate({
          _sum: { creditsBalance: true }
        }),
        
        // Total de transacciones
        db.walletLedger.count({
          where: {
            createdAt: { gte: startDate }
          }
        }),
        
        // Transacciones recientes
        db.walletLedger.findMany({
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        })
      ]);

      // 2. TRANSACCIONES POR TIPO
      const transactionsByType = await db.walletLedger.groupBy({
        by: ['type'],
        where: {
          createdAt: { gte: startDate }
        },
        _count: { type: true },
        _sum: { credits: true }
      });

      // 3. TRANSACCIONES POR RAZÓN
      const transactionsByReason = await db.walletLedger.groupBy({
        by: ['reason'],
        where: {
          createdAt: { gte: startDate }
        },
        _count: { reason: true },
        _sum: { credits: true }
      });

      // 4. TENDENCIA DIARIA (últimos 30 días)
      const dailyStats = await db.$queryRaw`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as transactions,
          SUM(CASE WHEN type = 'CREDIT' THEN credits ELSE 0 END) as credits_added,
          SUM(CASE WHEN type = 'DEBIT' THEN credits ELSE 0 END) as credits_spent
        FROM wallet_ledger
        WHERE created_at >= ${startDate}
        GROUP BY DATE(created_at)
        ORDER BY date DESC
        LIMIT 30
      `;

      // 5. TOP USUARIOS POR BALANCE
      const topUsersByBalance = await db.user.findMany({
        take: 10,
        orderBy: { creditsBalance: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          creditsBalance: true
        }
      });

      // 6. ACTIVIDAD POR USUARIO (más activos)
      const topUsersByActivity = await db.walletLedger.groupBy({
        by: ['userId'],
        where: {
          createdAt: { gte: startDate }
        },
        _count: { userId: true },
        orderBy: {
          _count: {
            userId: 'desc'
          }
        },
        take: 10
      });

      // Obtener datos de usuarios para actividad
      const userIds = topUsersByActivity.map((u: any) => u.userId);
      const usersData = await db.user.findMany({
        where: { id: { in: userIds } },
        select: {
          id: true,
          name: true,
          email: true
        }
      });

      const topUsersWithData = topUsersByActivity.map((stat: any) => {
        const userData = usersData.find((u: any) => u.id === stat.userId);
        return {
          ...userData,
          transactionCount: stat._count.userId
        };
      });

      // 7. PROMOCIONES ACTIVAS Y SU USO (manejar caso donde las tablas no existen)
      let activePromotions = 0;
      let promotionApplications: { _count: { id: number }, _sum: { creditsAwarded: any } } = { 
        _count: { id: 0 }, 
        _sum: { creditsAwarded: 0 } 
      };
      
      try {
        const [activePromotionsResult, promotionApplicationsResult] = await Promise.all([
          db.promotion.count({
            where: { status: 'ACTIVE' }
          }),
          
          db.promotionApplication.aggregate({
            where: {
              appliedAt: { gte: startDate }
            },
            _count: { id: true },
            _sum: { creditsAwarded: true }
          })
        ]);
        
        activePromotions = activePromotionsResult;
        promotionApplications = promotionApplicationsResult;
      } catch (error) {
        console.log('Tablas de promociones no disponibles:', error);
        // Usar valores por defecto si las tablas no existen
      }

      // 8. RESPUESTA CON TODAS LAS MÉTRICAS
      console.log('📊 [API] Datos calculados:', {
        totalUsers,
        usersWithCredits,
        totalCreditsInCirculation: Number(totalCreditsInCirculation._sum.creditsBalance || 0),
        totalTransactions,
        activePromotions
      });
      
      const responseData = {
        period,
        summary: {
          totalUsers,
          usersWithCredits,
          totalCreditsInCirculation: Number(totalCreditsInCirculation._sum.creditsBalance || 0),
          totalTransactions,
          activePromotions,
          averageBalancePerUser: totalUsers > 0 
            ? Number(totalCreditsInCirculation._sum.creditsBalance || 0) / totalUsers 
            : 0
        },
        transactions: {
          byType: transactionsByType.map((t: any) => ({
            type: t.type,
            count: t._count.type,
            totalCredits: Number(t._sum.credits || 0)
          })),
          byReason: transactionsByReason.map((t: any) => ({
            reason: t.reason,
            count: t._count.reason,
            totalCredits: Number(t._sum.credits || 0)
          })),
          recent: recentTransactions.map((t: any) => ({
            id: t.id,
            type: t.type,
            reason: t.reason,
            credits: Number(t.credits),
            balanceAfter: Number(t.balanceAfter),
            user: t.user,
            createdAt: t.createdAt
          }))
        },
        trends: {
          daily: dailyStats
        },
        topUsers: {
          byBalance: topUsersByBalance.map((u: any) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            balance: Number(u.creditsBalance)
          })),
          byActivity: topUsersWithData
        },
        promotions: {
          active: activePromotions,
          applicationsInPeriod: promotionApplications._count.id,
          creditsAwardedInPeriod: Number(promotionApplications._sum?.creditsAwarded || 0)
        }
      };
      
      console.log('✅ [API] Enviando respuesta exitosa');
      return ApiResponse.success(responseData);

    } catch (error) {
      console.error('💥 [API] Error en GET /api/admin/credits/dashboard:', error);
      console.error('💥 [API] Error details:', {
        message: (error as Error)?.message,
        stack: (error as Error)?.stack,
        name: (error as Error)?.name
      });
      return ApiResponse.internalError('Error interno del servidor: ' + ((error as Error)?.message || 'Desconocido'));
    }
  })(request);
}
