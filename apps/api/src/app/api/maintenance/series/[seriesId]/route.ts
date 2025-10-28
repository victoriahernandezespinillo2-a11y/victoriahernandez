/**
 * API Routes por serie de mantenimiento
 * DELETE /api/maintenance/series/[seriesId]?scope=future|all|range&from=...&to=...&includeStates=...&dryRun=true
 */

import { NextRequest } from 'next/server';
import { MaintenanceService } from '@/lib/services/maintenance.service';
import { withAdminMiddleware, ApiResponse } from '@/lib/middleware';

const service = new MaintenanceService();

export async function DELETE(request: NextRequest) {
  return withAdminMiddleware(async (req) => {
    try {
      const pathname = req.nextUrl.pathname;
      const parts = pathname.split('/');
      const seriesId = parts[parts.length - 1] as string;
      if (!seriesId) return ApiResponse.badRequest('seriesId requerido');

      const sp = req.nextUrl.searchParams;
      const scopeParam = (sp.get('scope') || 'future') as 'all'|'future'|'range';
      const from = sp.get('from') || undefined;
      const to = sp.get('to') || undefined;
      const dryRun = sp.get('dryRun') === 'true';
      const reason = sp.get('reason') || undefined;
      const includeStatesParam = sp.get('includeStates');
      const includeStates = includeStatesParam ? (includeStatesParam.split(',') as any) : undefined;

      const result = await service.deleteSeriesOccurrences(seriesId, { scope: scopeParam, from, to, includeStates, dryRun, reason });
      return ApiResponse.success(result);
    } catch (error) {
      console.error('Error borrando serie:', error);
      return ApiResponse.badRequest('Solicitud de borrado de serie inválida');
    }
  })(request);
}

export async function OPTIONS() {
  return ApiResponse.success(null);
}


