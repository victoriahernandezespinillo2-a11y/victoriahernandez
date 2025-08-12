/**
 * API Routes para mantenimiento específico
 * GET /api/maintenance/[id] - Obtener mantenimiento por ID
 * PUT /api/maintenance/[id] - Actualizar mantenimiento
 * DELETE /api/maintenance/[id] - Cancelar mantenimiento
 */

import { NextRequest } from 'next/server';
import { MaintenanceService, UpdateMaintenanceSchema } from '@/lib/services/maintenance.service';
import { withStaffMiddleware, withAdminMiddleware, ApiResponse } from '@/lib/middleware';
import { z } from 'zod';

const maintenanceService = new MaintenanceService();

/**
 * GET /api/maintenance/[id]
 * Obtener mantenimiento por ID
 * Acceso: STAFF o superior
 */
export async function GET(
  request: NextRequest
) {
  return withStaffMiddleware(async (req, context) => {
    try {
      const user = (context as any)?.user;
      const pathname = req.nextUrl.pathname;
      const id = pathname.split('/').pop() as string;
      
      if (!id) {
        return ApiResponse.badRequest('ID de mantenimiento requerido');
      }
      
      const maintenance = await maintenanceService.getMaintenanceById(id);
      
      return ApiResponse.success(maintenance);
    } catch (error) {
      if (error instanceof Error && error.message.includes('no encontrado')) {
        return ApiResponse.notFound('Mantenimiento no encontrado');
      }
      
      console.error('Error obteniendo mantenimiento:', error);
      return ApiResponse.internalError('Error interno del servidor');
    }
  })(request);
}

/**
 * PUT /api/maintenance/[id]
 * Actualizar mantenimiento
 * Acceso: ADMIN
 */
export async function PUT(
  request: NextRequest
) {
  return withAdminMiddleware(async (req, context) => {
    try {
      const user = (context as any)?.user;
      const pathname = req.nextUrl.pathname;
      const id = pathname.split('/').pop() as string;
      
      if (!id) {
        return ApiResponse.badRequest('ID de mantenimiento requerido');
      }
      
      const body = await req.json();
      
      const maintenance = await maintenanceService.updateMaintenance(id, body);
      
      return ApiResponse.success(maintenance);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return ApiResponse.badRequest('Datos de mantenimiento inválidos');
      }
      
      if (error instanceof Error) {
        if (error.message.includes('no encontrado')) {
          return ApiResponse.notFound('Mantenimiento no encontrado');
        }
        if (error.message.includes('completado')) {
          return ApiResponse.badRequest(error.message);
        }
        if (error.message.includes('conflicto')) {
          return ApiResponse.conflict(error.message);
        }
      }
      
      console.error('Error actualizando mantenimiento:', error);
      return ApiResponse.internalError('Error interno del servidor');
    }
  })(request);
}

/**
 * DELETE /api/maintenance/[id]
 * Cancelar mantenimiento
 * Acceso: ADMIN
 */
export async function DELETE(
  request: NextRequest
) {
  return withAdminMiddleware(async (req, context) => {
    try {
      const user = (context as any)?.user;
      const pathname = req.nextUrl.pathname;
      const id = pathname.split('/').pop() as string;
      
      if (!id) {
        return ApiResponse.badRequest('ID de mantenimiento requerido');
      }
      
      const { searchParams } = new URL(req.url);
      const reason = searchParams.get('reason') || undefined;
      
      const maintenance = await maintenanceService.cancelMaintenance(id, reason);
      
      return ApiResponse.success(maintenance);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('no encontrado')) {
          return ApiResponse.notFound('Mantenimiento no encontrado');
        }
        if (error.message.includes('completado')) {
          return ApiResponse.badRequest(error.message);
        }
      }
      
      console.error('Error cancelando mantenimiento:', error);
      return ApiResponse.internalError('Error interno del servidor');
    }
  })(request);
}

/**
 * OPTIONS /api/maintenance/[id]
 * Manejar preflight requests
 */
export async function OPTIONS() {
  return ApiResponse.success(null);
}