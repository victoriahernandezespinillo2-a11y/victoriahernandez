import { NextRequest } from 'next/server';
import { withPublicMiddleware, ApiResponse } from '@/lib/middleware';
import { TariffService } from '@/lib/services/tariff.service';

export const runtime = 'nodejs';

const tariffService = new TariffService();

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}

export async function GET(req: NextRequest) {
  return withPublicMiddleware(async () => {
    try {
      const searchParams = req.nextUrl.searchParams;
      const reference = searchParams.get('referenceDate');
      let referenceDate: Date | undefined;
      if (reference) {
        const parsed = new Date(reference);
        if (!Number.isNaN(parsed.getTime())) {
          referenceDate = parsed;
        }
      }

      const tariffs = await tariffService.getActiveTariffs(referenceDate || new Date());
      return ApiResponse.success(tariffs);
    } catch (error) {
      console.error('Error obteniendo tarifas:', error);
      return ApiResponse.error(
        error instanceof Error ? error.message : 'Error interno del servidor',
        500
      );
    }
  })(req);
}

