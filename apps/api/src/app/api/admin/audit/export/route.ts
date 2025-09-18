/**
 * API Route para exportar logs de auditoría
 * GET /api/admin/audit/export - Exportar logs de auditoría
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAdminMiddleware, ApiResponse } from '@/lib/middleware';
import { AuditService, GetAuditLogsQuerySchema } from '@/lib/services/audit.service';

const auditService = new AuditService();

/**
 * GET /api/admin/audit/export
 * Exportar logs de auditoría
 * Acceso: ADMIN únicamente
 */
export async function GET(request: NextRequest) {
  return withAdminMiddleware(async (req) => {
    try {
      const { searchParams } = req.nextUrl;
      const query = GetAuditLogsQuerySchema.parse(Object.fromEntries(searchParams.entries()));
      const format = (searchParams.get('format') as 'json' | 'csv') || 'json';
      
      const data = await auditService.exportAuditLogs(query, format);
      
      if (format === 'csv') {
        const csvData = Array.isArray(data) ? data.join('\n') : String(data || '');
        return new NextResponse(csvData, {
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="audit-logs-${new Date().toISOString().split('T')[0]}.csv"`
          }
        });
      }
      
      return ApiResponse.success(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return ApiResponse.validation(
          error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          }))
        );
      }
      console.error('Error exportando logs de auditoría:', error);
      return ApiResponse.internalError('Error interno del servidor');
    }
  })(request);
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}