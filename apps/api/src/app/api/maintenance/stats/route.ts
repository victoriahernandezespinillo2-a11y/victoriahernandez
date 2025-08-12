/**
 * API Route para estadísticas de mantenimiento
 * GET /api/maintenance/stats - Obtener estadísticas de mantenimiento
 */

import { NextRequest } from 'next/server';
import { MaintenanceService } from '@/lib/services/maintenance.service';
import { withStaffMiddleware, ApiResponse } from '@/lib/middleware';

const maintenanceService = new MaintenanceService();

/**
 * GET /api/maintenance/stats
 * Obtener estadísticas de mantenimiento
 * Acceso: STAFF o superior
 */
export async function GET(request: NextRequest) {
  return withStaffMiddleware(async (req, context) => {
    try {
      const user = (context as any)?.user;
      const { searchParams } = new URL(req.url);
      const centerId = searchParams.get('centerId') || undefined;
      
      const stats = await maintenanceService.getMaintenanceStats(centerId);
      
      return ApiResponse.success(stats);
    } catch (error) {
      console.error('Error obteniendo estadísticas de mantenimiento:', error);
      return ApiResponse.internalError('Error interno del servidor');
    }
  })(request);
}

/**
 * OPTIONS /api/maintenance/stats
 * Manejar preflight requests
 */
export async function OPTIONS() {
  return ApiResponse.success(null);
}