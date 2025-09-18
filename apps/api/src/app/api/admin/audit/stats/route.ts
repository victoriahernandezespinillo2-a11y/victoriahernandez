/**
 * API Route para estadísticas de auditoría
 * GET /api/admin/audit/stats - Obtener estadísticas de auditoría
 */

import { NextRequest } from 'next/server';
import { withAdminMiddleware, ApiResponse } from '@/lib/middleware';
import { AuditService } from '@/lib/services/audit.service';

const auditService = new AuditService();

/**
 * GET /api/admin/audit/stats
 * Obtener estadísticas de auditoría
 * Acceso: ADMIN únicamente
 */
export async function GET(request: NextRequest) {
  return withAdminMiddleware(async (req) => {
    try {
      const { searchParams } = req.nextUrl;
      const filters = Object.fromEntries(searchParams.entries());
      
      const stats = await auditService.getAuditStats(filters);
      
      return ApiResponse.success(stats);
    } catch (error) {
      console.error('Error obteniendo estadísticas de auditoría:', error);
      return ApiResponse.internalError('Error interno del servidor');
    }
  })(request);
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}