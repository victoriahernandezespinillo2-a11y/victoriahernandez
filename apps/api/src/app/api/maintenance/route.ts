/**
 * API Routes para gestión de mantenimiento
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
        limit: z.coerce.number().int().min(1).max(500).default(100),
        sortBy: z.enum(['type', 'createdAt', 'scheduledAt']).default('scheduledAt'),
        sortOrder: z.enum(['asc', 'desc']).default('asc'),
        status: z.enum(['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
        type: z.string().optional(),
        centerId: z.string().optional(),
        courtId: z.string().optional(),
        startDate: z.string().datetime().optional(),
        endDate: z.string().datetime().optional(),
        assignedTo: z.string().optional(),
      });

      const parsed = QuerySchema.parse(params);
      
      const result = await maintenanceService.getMaintenance(parsed as any);
      
      return ApiResponse.success(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return ApiResponse.badRequest('Parámetros de consulta inválidos');
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
        return ApiResponse.badRequest('Datos de mantenimiento inválidos');
      }
      
      if (error instanceof Error) {
        if (error.message.includes('no encontrada') || error.message.includes('no válido')) {
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
 * POST /api/maintenance/occurrences:delete
 * Ruta especial para eliminar ocurrencias por IDs en lote.
 */
export async function DELETE(request: NextRequest) {
  const url = new URL(request.url);
  if (url.pathname.endsWith('/api/maintenance/occurrences:delete')) {
    return withAdminMiddleware(async (req) => {
      try {
        const body = await req.json();
        const ids: string[] = Array.isArray(body?.ids) ? body.ids : [];
        const includeStates = Array.isArray(body?.includeStates) ? body.includeStates : undefined;
        const dryRun = Boolean(body?.dryRun);
        const reason = typeof body?.reason === 'string' ? body.reason : undefined;
        const result = await maintenanceService.deleteOccurrencesByIds(ids, { includeStates: includeStates as any, dryRun, reason });
        return ApiResponse.success(result);
      } catch (error) {
        console.error('Error en eliminación masiva de ocurrencias:', error);
        return ApiResponse.badRequest('Solicitud inválida para eliminación masiva');
      }
    })(request);
  }
  // 405 Method Not Allowed para rutas DELETE no soportadas en este handler
  return ApiResponse.error('DELETE no soportado', 405);
}

/**
 * OPTIONS /api/maintenance
 * Manejar preflight requests
 */
export async function OPTIONS() {
  return ApiResponse.success(null);
}
