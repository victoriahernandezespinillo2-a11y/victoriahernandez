import { NextRequest } from 'next/server';
import { MaintenanceService } from '@/lib/services/maintenance.service';
import { withAdminMiddleware, ApiResponse } from '@/lib/middleware';

const maintenanceService = new MaintenanceService();

export async function GET(request: NextRequest) {
  return withAdminMiddleware(async (req) => {
    try {
      const pathname = req.nextUrl.pathname;
      const seriesId = pathname.split('/').slice(-2, -1)[0] as string;
      if (!seriesId) return ApiResponse.badRequest('seriesId requerido');
      const info = await maintenanceService.inferSeriesRule(seriesId);
      return ApiResponse.success(info);
    } catch (error: any) {
      return ApiResponse.internalError(error?.message || 'Error obteniendo serie');
    }
  })(request);
}

export async function POST(request: NextRequest) {
  return withAdminMiddleware(async (req) => {
    try {
      const pathname = req.nextUrl.pathname;
      const seriesId = pathname.split('/').slice(-2, -1)[0] as string;
      if (!seriesId) return ApiResponse.badRequest('seriesId requerido');
      const body = await req.json();
      const result = await maintenanceService.regenerateSeries(seriesId, body);
      return ApiResponse.success(result);
    } catch (error: any) {
      return ApiResponse.internalError(error?.message || 'Error regenerando serie');
    }
  })(request);
}

export async function OPTIONS() {
  return ApiResponse.success(null);
}


