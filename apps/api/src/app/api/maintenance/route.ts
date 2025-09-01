/**
 * API Routes para gestiÃ³n de mantenimiento
 * GET /api/maintenance - Obtener lista de mantenimientos
 * POST /api/maintenance - Crear nuevo mantenimiento
 */

import { NextRequest } from 'next/server';
import { MaintenanceService, GetMaintenanceSchema, CreateMaintenanceSchema } from '@/lib/services/maintenance.service';
import { withStaffMiddleware, withAdminMiddleware, ApiResponse } from '@/lib/middleware';
import { z } from 'zod';

const maintenanceService = new MaintenanceService();

/**
 * GET /api/maintenance
 * Obtener lista de mantenimientos con filtros
 * Acceso: STAFF o superior
 */
export async function GET(request: NextRequest) {
  return withStaffMiddleware(async (req) => {
    try {
      const user = (req as any).user;
      const { searchParams } = new URL(req.url);
      const params = Object.fromEntries(searchParams.entries());

      const QuerySchema = z.object({
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(100).default(20),
        sortBy: z.enum(['type', 'createdAt', 'priority', 'scheduledDate']).default('createdAt'),
        sortOrder: z.enum(['asc', 'desc']).default('desc'),
        status: z.enum(['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
        type: z.string().optional(),
        centerId: z.string().optional(),
        courtId: z.string().optional(),
        from: z.string().datetime().optional(),
        to: z.string().datetime().optional(),
        assignedTo: z.string().optional(),
      });

      const parsed = QuerySchema.parse(params);
      
      const result = await maintenanceService.getMaintenance(parsed as any);
      
      return ApiResponse.success(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return ApiResponse.badRequest('ParÃ¡metros de consulta invÃ¡lidos');
      }
      
      console.error('Error obteniendo mantenimientos:', error);
      return ApiResponse.internalError('Error interno del servidor');
    }
  })(request);
}

/**
 * POST /api/maintenance
 * Crear nuevo mantenimiento
 * Acceso: ADMIN
 */
export async function POST(request: NextRequest) {
  return withAdminMiddleware(async (req) => {
    try {
      const user = (req as any).user;
      const body = await req.json();
      
      const maintenance = await maintenanceService.createMaintenance(body);
      
      return ApiResponse.success(maintenance, 201);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return ApiResponse.badRequest('Datos de mantenimiento invÃ¡lidos');
      }
      
      if (error instanceof Error) {
        if (error.message.includes('no encontrada') || error.message.includes('no vÃ¡lido')) {
          return ApiResponse.badRequest(error.message);
        }
        if (error.message.includes('conflicto')) {
          return ApiResponse.conflict(error.message);
        }
      }
      
      console.error('Error creando mantenimiento:', error);
      return ApiResponse.internalError('Error interno del servidor');
    }
  })(request);
}

/**
 * OPTIONS /api/maintenance
 * Manejar preflight requests
 */
export async function OPTIONS() {
  return ApiResponse.success(null);
}
