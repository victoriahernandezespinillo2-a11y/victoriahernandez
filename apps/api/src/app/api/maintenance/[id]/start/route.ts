/**
 * API Route para iniciar mantenimiento
 * POST /api/maintenance/[id]/start - Iniciar mantenimiento
 */

import { NextRequest } from 'next/server';
import { MaintenanceService } from '@/lib/services/maintenance.service';
import { withStaffMiddleware, ApiResponse } from '@/lib/middleware';

const maintenanceService = new MaintenanceService();

/**
 * POST /api/maintenance/[id]/start
 * Iniciar mantenimiento
 * Acceso: STAFF o superior
 */
export async function POST(
  request: NextRequest
) {
  return withStaffMiddleware(async (req) => {
    try {
      const user = (req as any).user;
      const pathname = req.nextUrl.pathname;
      const id = pathname.split('/').slice(-2, -1)[0] as string;
      
      if (!id) {
        return ApiResponse.badRequest('ID de mantenimiento requerido');
      }
      
      const maintenance = await maintenanceService.startMaintenance(id);
      
      return ApiResponse.success(maintenance);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('no encontrado')) {
          return ApiResponse.notFound('Mantenimiento no encontrado');
        }
        if (error.message.includes('programados')) {
          return ApiResponse.badRequest(error.message);
        }
      }
      
      console.error('Error iniciando mantenimiento:', error);
      return ApiResponse.internalError('Error interno del servidor');
    }
  })(request);
}

/**
 * OPTIONS /api/maintenance/[id]/start
 * Manejar preflight requests
 */
export async function OPTIONS() {
  return ApiResponse.success(null);
}