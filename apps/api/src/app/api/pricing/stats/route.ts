import { NextRequest } from 'next/server';
import { withAdminMiddleware, withStaffMiddleware, ApiResponse as API } from '@/lib/middleware';
import { pricingService } from '../../../../lib/services/pricing.service';
import { z } from 'zod';

// Esquema para filtros de estadísticas
const PricingStatsSchema = z.object({
  centerId: z.string().cuid().optional(),
  courtId: z.string().cuid().optional(),
  sport: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  period: z.enum(['day', 'week', 'month', 'quarter', 'year']).optional().default('month'),
  groupBy: z.enum(['court', 'sport', 'center', 'time', 'day']).optional().default('court'),
});

/**
 * GET /api/pricing/stats
 * Obtener estadísticas de precios (solo para administradores y staff)
 */
export async function GET(request: NextRequest) {
  return withStaffMiddleware(async (req) => {
    try {
      const { searchParams } = new URL(req.url);
      const params = Object.fromEntries(searchParams.entries());

      const validatedParams = PricingStatsSchema.parse(params);

      // Calcular fechas por defecto si no se proporcionan
      const now = new Date();
      let startDate: Date;
      let endDate = validatedParams.endDate ? new Date(validatedParams.endDate) : now;

      if (validatedParams.startDate) {
        startDate = new Date(validatedParams.startDate);
      } else {
        // Calcular fecha de inicio basada en el período
        startDate = new Date(now);
        switch (validatedParams.period) {
          case 'day':
            startDate.setDate(now.getDate() - 1);
            break;
          case 'week':
            startDate.setDate(now.getDate() - 7);
            break;
          case 'month':
            startDate.setMonth(now.getMonth() - 1);
            break;
          case 'quarter':
            startDate.setMonth(now.getMonth() - 3);
            break;
          case 'year':
            startDate.setFullYear(now.getFullYear() - 1);
            break;
        }
      }

      const filters = {
        centerId: validatedParams.centerId,
        courtId: validatedParams.courtId,
        sport: validatedParams.sport,
        startDate,
        endDate,
        period: validatedParams.period,
        groupBy: validatedParams.groupBy,
      };

      let stats;
      if (filters.courtId) {
        stats = await pricingService.getPricingStats(filters.courtId, startDate, endDate);
      } else {
        stats = {
          averagePrice: 0,
          minPrice: 0,
          maxPrice: 0,
          totalRevenue: 0,
          reservationCount: 0,
          priceDistribution: [] as Array<{ range: string; count: number }>,
        };
      }

      return API.success({
        stats,
        filters: {
          ...validatedParams,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
        generatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error obteniendo estadísticas de precios:', error);
      if (error instanceof z.ZodError) {
        return API.validation(error.errors.map(e => ({ field: e.path.join('.'), message: e.message })));
      }
      return API.internalError();
    }
  })(request);
}

/**
 * POST /api/pricing/stats/revenue
 * Calcular proyección de ingresos basada en precios actuales
 */
export async function POST(request: NextRequest) {
  return withAdminMiddleware(async (req) => {
    try {
      const body = await req.json();

      const RevenueProjectionSchema = z.object({
        centerId: z.string().cuid().optional(),
        courtIds: z.array(z.string().cuid()).optional(),
        projectionPeriod: z.enum(['week', 'month', 'quarter', 'year']).default('month'),
        occupancyRate: z.number().min(0).max(100).optional().default(70),
        startDate: z.string().datetime().optional(),
        scenarios: z.array(z.object({
          name: z.string(),
          occupancyRate: z.number().min(0).max(100),
          priceMultiplier: z.number().min(0).max(5).optional().default(1),
        })).optional(),
      });

      const validatedData = RevenueProjectionSchema.parse(body);

      // Calcular fecha de inicio si no se proporciona
      const startDate = validatedData.startDate
        ? new Date(validatedData.startDate)
        : new Date();

      // Calcular fecha de fin basada en el período
      const endDate = new Date(startDate);
      switch (validatedData.projectionPeriod) {
        case 'week':
          endDate.setDate(startDate.getDate() + 7);
          break;
        case 'month':
          endDate.setMonth(startDate.getMonth() + 1);
          break;
        case 'quarter':
          endDate.setMonth(startDate.getMonth() + 3);
          break;
        case 'year':
          endDate.setFullYear(startDate.getFullYear() + 1);
          break;
      }

      const revenueProjection = await pricingService.calculateRevenueProjection({
        centerId: validatedData.centerId,
        courtIds: validatedData.courtIds,
        startDate,
        endDate,
        occupancyRate: validatedData.occupancyRate,
        scenarios: validatedData.scenarios,
      });

      return API.success({
        revenueProjection,
        parameters: {
          ...validatedData,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
        calculatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error calculando proyección de ingresos:', error);
      if (error instanceof z.ZodError) {
        return API.validation(error.errors.map(e => ({ field: e.path.join('.'), message: e.message })));
      }
      return API.internalError();
    }
  })(request);
}