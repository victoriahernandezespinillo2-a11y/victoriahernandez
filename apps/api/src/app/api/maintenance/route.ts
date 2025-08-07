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
  return withStaffMiddleware(async (req, { user }) => {
    try {
      const { searchParams } = new URL(req.url);
      const params = Object.fromEntries(searchParams.entries());
      
      const result = await maintenanceService.getMaintenance(params);
      
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
  return withAdminMiddleware(async (req, { user }) => {
    try {
      const body = await req.json();
      
      const maintenance = await maintenanceService.createMaintenance(body);
      
      return ApiResponse.created(maintenance, 'Mantenimiento creado exitosamente');
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
 * OPTIONS /api/maintenance
 * Manejar preflight requests
 */
export async function OPTIONS() {
  return ApiResponse.success(null);
}