import { NextRequest } from 'next/server';
import { MaintenanceService } from '@/lib/services/maintenance.service';
import { withAdminMiddleware, ApiResponse } from '@/lib/middleware';

const service = new MaintenanceService();

export async function POST(request: NextRequest) {
  return withAdminMiddleware(async (req) => {
    try {
      const pathname = req.nextUrl.pathname;
      const seriesId = pathname.split('/').slice(-3, -2)[0] as string; // .../series/[seriesId]/dedupe
      if (!seriesId) return ApiResponse.badRequest('seriesId requerido');
      const result = await service.dedupeSeries(seriesId);
      return ApiResponse.success(result);
    } catch (e) {
      console.error('Error dedupe series:', e);
      return ApiResponse.internalError('Error al deduplicar la serie');
    }
  })(request);
}

export async function OPTIONS() { return ApiResponse.success(null); }


