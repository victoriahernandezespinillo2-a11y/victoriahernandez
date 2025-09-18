/**
 * API Route para limpiar logs de auditoría
 * DELETE /api/admin/audit/cleanup - Limpiar logs de auditoría antiguos
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAdminMiddleware, ApiResponse } from '@/lib/middleware';
import { AuditService } from '@/lib/services/audit.service';

const auditService = new AuditService();

/**
 * DELETE /api/admin/audit/cleanup
 * Limpiar logs de auditoría antiguos
 * Acceso: ADMIN únicamente
 */
export async function DELETE(request: NextRequest) {
  return withAdminMiddleware(async (req) => {
    try {
      const { searchParams } = req.nextUrl;
      const retentionDays = parseInt(searchParams.get('retentionDays') || '365');
      
      const result = await auditService.cleanupOldLogs(retentionDays);
      
      return ApiResponse.success(result);
    } catch (error) {
      console.error('Error limpiando logs de auditoría:', error);
      return ApiResponse.internalError('Error interno del servidor');
    }
  })(request);
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
