/**
 * API Route para completar mantenimiento
 * POST /api/maintenance/[id]/complete - Completar mantenimiento
 */

import { NextRequest } from 'next/server';
import { MaintenanceService, CompleteMaintenanceSchema } from '@/lib/services/maintenance.service';
import { withStaffMiddleware, ApiResponse } from '@/lib/middleware';
import { z } from 'zod';

const maintenanceService = new MaintenanceService();

/**
 * POST /api/maintenance/[id]/complete
 * Completar mantenimiento
 * Acceso: STAFF o superior
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withStaffMiddleware(async (req, { user }) => {
    try {
      const { id } = params;
      
      if (!id) {
        return ApiResponse.badRequest('ID de mantenimiento requerido');
      }
      
      const body = await req.json();
      
      const maintenance = await maintenanceService.completeMaintenance(id, body);
      
      return ApiResponse.success(maintenance, 'Mantenimiento completado exitosamente');
    } catch (error) {
      if (error instanceof z.ZodError) {
        return ApiResponse.badRequest('Datos de completado inválidos');
      }
      
      if (error instanceof Error) {
        if (error.message.includes('no encontrado')) {
          return ApiResponse.notFound('Mantenimiento no encontrado');
        }
        if (error.message.includes('completado')) {
          return ApiResponse.badRequest(error.message);
        }
      }
      
      console.error('Error completando mantenimiento:', error);
      return ApiResponse.internalError('Error interno del servidor');
    }
  })(request);
}

/**
 * OPTIONS /api/maintenance/[id]/complete
 * Manejar preflight requests
 */
export async function OPTIONS() {
  return ApiResponse.success(null);
}