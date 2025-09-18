/**
 * API Routes para logs de auditoría Enterprise
 * GET /api/admin/audit - Obtener logs de auditoría del sistema
 * POST /api/admin/audit - Crear log de auditoría manual
 * DELETE /api/admin/audit/cleanup - Limpiar logs antiguos
 * GET /api/admin/audit/export - Exportar logs de auditoría
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { withAdminMiddleware, ApiResponse } from '@/lib/middleware';
import { AuditService, CreateAuditLogSchema, GetAuditLogsQuerySchema } from '@/lib/services/audit.service';
import { withAuditMiddleware } from '@/lib/middleware/audit.middleware';

const auditService = new AuditService();

/**
 * GET /api/admin/audit
 * Obtener logs de auditoría del sistema
 * Acceso: ADMIN únicamente
 */
export const GET = withAuditMiddleware(
  {
    action: 'VIEW_AUDIT_LOGS',
    resource: 'audit',
    category: 'DATA_ACCESS',
    severity: 'MEDIUM',
    tags: ['audit', 'logs', 'view']
  },
  withAdminMiddleware(async (req) => {
    try {
      const { searchParams } = req.nextUrl;
      const queryParams = GetAuditLogsQuerySchema.parse(Object.fromEntries(searchParams.entries()));
      
      const result = await auditService.getAuditLogs(queryParams);
      const stats = await auditService.getAuditStats(queryParams);
      
      return ApiResponse.success({
        ...result,
        stats
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return ApiResponse.validation(
          error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          }))
        );
      }
      
      console.error('Error obteniendo logs de auditoría:', error);
      return ApiResponse.internalError('Error interno del servidor');
    }
  })
);

/**
 * POST /api/admin/audit
 * Crear log de auditoría manual
 * Acceso: ADMIN únicamente
 */
export const POST = withAuditMiddleware(
  {
    action: 'CREATE_AUDIT_LOG',
    resource: 'audit',
    category: 'DATA_MODIFICATION',
    severity: 'MEDIUM',
    tags: ['audit', 'logs', 'create']
  },
  withAdminMiddleware(async (req) => {
    try {
      const body = await req.json();
      const auditData = CreateAuditLogSchema.parse(body);
      
      const auditLog = await auditService.createAuditLog(auditData);
      
      return ApiResponse.success(auditLog);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return ApiResponse.validation(
          error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          }))
        );
      }
      
      console.error('Error creando log de auditoría:', error);
      return ApiResponse.internalError('Error interno del servidor');
    }
  })
);




/**
 * OPTIONS /api/admin/audit
 * Manejar preflight requests
 */
export async function OPTIONS() {
  return ApiResponse.success(null);
}
