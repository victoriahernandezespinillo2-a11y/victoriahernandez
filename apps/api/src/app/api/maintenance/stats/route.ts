/**
 * API Route para estadÃ­sticas de mantenimiento
 * GET /api/maintenance/stats - Obtener estadÃ­sticas de mantenimiento
 */

import { NextRequest } from 'next/server';
import { MaintenanceService } from '@/lib/services/maintenance.service';
import { withStaffMiddleware, ApiResponse } from '@/lib/middleware';

const maintenanceService = new MaintenanceService();

/**
 * GET /api/maintenance/stats
 * Obtener estadÃ­sticas de mantenimiento
 * Acceso: STAFF o superior
 */
export async function GET(request: NextRequest) {
  return withStaffMiddleware(async (req) => {
    try {
      const user = (req as any).user;
      const { searchParams } = new URL(req.url);
      const centerId = searchParams.get('centerId') || undefined;
      
      const stats = await maintenanceService.getMaintenanceStats(centerId);
      
      return ApiResponse.success(stats);
    } catch (error) {
      console.error('Error obteniendo estadÃ­sticas de mantenimiento:', error);
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
