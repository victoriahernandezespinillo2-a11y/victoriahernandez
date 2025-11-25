/**
 * API Admin: Estadísticas de emails
 * GET /api/admin/emails/stats - Obtener estadísticas de envíos de emails
 */

import { NextRequest } from 'next/server';
import { withAdminMiddleware, ApiResponse } from '@/lib/middleware';
import { db } from '@repo/db';
import { z } from 'zod';

const GetEmailStatsQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export async function GET(request: NextRequest) {
  return withAdminMiddleware(async (req) => {
    try {
      const { searchParams } = req.nextUrl;
      const params = GetEmailStatsQuerySchema.parse(Object.fromEntries(searchParams.entries()));
      
      // Construir filtro de fecha
      const dateFilter: any = {};
      if (params.startDate) {
        dateFilter.gte = new Date(params.startDate);
      }
      if (params.endDate) {
        dateFilter.lte = new Date(params.endDate);
      }
      
      const where = {
        eventType: { in: ['EMAIL_SENT', 'EMAIL_FAILED'] },
        ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
      };
      
      // Obtener totales
      const total = await db.outboxEvent.count({ where });
      const sent = await db.outboxEvent.count({
        where: { ...where, eventType: 'EMAIL_SENT' },
      });
      const failed = await db.outboxEvent.count({
        where: { ...where, eventType: 'EMAIL_FAILED' },
      });
      
      // Estadísticas por día (últimos 30 días)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const dailyStats = await db.outboxEvent.findMany({
        where: {
          eventType: { in: ['EMAIL_SENT', 'EMAIL_FAILED'] },
          createdAt: { gte: thirtyDaysAgo },
        },
        select: {
          eventType: true,
          createdAt: true,
        },
      });
      
      // Agrupar por día
      const dailyMap = new Map<string, { sent: number; failed: number }>();
      dailyStats.forEach((email: any) => {
        // Asegurar que tenemos una fecha válida
        if (!email.createdAt) return;
        
        const date = new Date(email.createdAt).toISOString().split('T')[0] as string;
        
        // Obtener estadísticas existentes o crear nuevas
        const existingStats = dailyMap.get(date);
        const stats = existingStats || { sent: 0, failed: 0 };
        
        if (email.eventType === 'EMAIL_SENT') {
          stats.sent++;
        } else {
          stats.failed++;
        }
        
        // Solo establecer si no existía antes
        if (!existingStats) {
          dailyMap.set(date, stats);
        }
      });
      
      const dailyChart = Array.from(dailyMap.entries())
        .map(([date, stats]) => ({
          date,
          sent: stats.sent,
          failed: stats.failed,
          total: stats.sent + stats.failed,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));
      
      // Estadísticas por proveedor
      const providerStats = await db.outboxEvent.findMany({
        where: {
          eventType: 'EMAIL_SENT',
          ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
        },
        select: {
          eventData: true,
        },
      });
      
      const providerMap = new Map<string, number>();
      providerStats.forEach((email: any) => {
        const provider: string = (email.eventData as any)?.provider || 'smtp';
        const currentCount = providerMap.get(provider) || 0;
        providerMap.set(provider, currentCount + 1);
      });
      
      const byProvider = Array.from(providerMap.entries()).map(([provider, count]) => ({
        provider,
        count,
      }));
      
      return ApiResponse.success({
        total,
        sent,
        failed,
        successRate: total > 0 ? ((sent / total) * 100).toFixed(2) : '0.00',
        dailyChart,
        byProvider,
      });
    } catch (error) {
      console.error('Admin GET email stats error:', error);
      return ApiResponse.internalError('Error al obtener estadísticas de emails');
    }
  })(request);
}

export async function OPTIONS() {
  return ApiResponse.success(null);
}

