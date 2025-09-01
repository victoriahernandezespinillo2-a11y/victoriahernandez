/**
 * API Route para mantenimientos prÃ³ximos
 * GET /api/maintenance/upcoming - Obtener mantenimientos prÃ³ximos a vencer
 */

import { NextRequest } from 'next/server';
import { MaintenanceService } from '@/lib/services/maintenance.service';
import { withStaffMiddleware, ApiResponse } from '@/lib/middleware';
import { z } from 'zod';

const maintenanceService = new MaintenanceService();

const GetUpcomingSchema = z.object({
  days: z.coerce.number().min(1).max(30).default(7),
});

/**
 * GET /api/maintenance/upcoming
 * Obtener mantenimientos prÃ³ximos a vencer
 * Acceso: STAFF o superior
 */
export async function GET(request: NextRequest) {
  return withStaffMiddleware(async (req) => {
    try {
      const user = (req as any).user;
      const { searchParams } = new URL(req.url);
      const params = Object.fromEntries(searchParams.entries());
      
      const { days } = GetUpcomingSchema.parse(params);
      
      const upcomingMaintenance = await maintenanceService.getUpcomingMaintenance(days);
      
      return ApiResponse.success({
        maintenance: upcomingMaintenance,
        count: upcomingMaintenance.length,
        days,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return ApiResponse.badRequest('ParÃ¡metros invÃ¡lidos');
      }
      
      console.error('Error obteniendo mantenimientos prÃ³ximos:', error);
      return ApiResponse.internalError('Error interno del servidor');
    }
  })(request);
}

/**
 * OPTIONS /api/maintenance/upcoming
 * Manejar preflight requests
 */
export async function OPTIONS() {
  return ApiResponse.success(null);
}
