/**
 * GET /api/admin/courts/[id]/availability?date=YYYY-MM-DD
 * Disponibilidad de una cancha para un día
 */

import { NextRequest } from 'next/server';
import { withAdminMiddleware, ApiResponse } from '@/lib/middleware';
import { reservationService } from '@/lib/services/reservation.service';
import { z } from 'zod';

const QuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function GET(request: NextRequest) {
  return withAdminMiddleware(async (req) => {
    try {
      const courtId = req.nextUrl.pathname.split('/').filter(Boolean).slice(-2, -1)[0];
      if (!courtId) return ApiResponse.badRequest('ID de cancha requerido');
      const params = QuerySchema.parse(Object.fromEntries(req.nextUrl.searchParams.entries()));
      const date = new Date(params.date + 'T00:00:00');
      const availability = await reservationService.getCourtAvailability(courtId, date);
      return ApiResponse.success(availability);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return ApiResponse.validation(
          error.errors.map((e) => ({ field: e.path.join('.'), message: e.message }))
        );
      }
      console.error('Error availability:', error);
      return ApiResponse.internalError('Error interno del servidor');
    }
  })(request);
}

export async function OPTIONS() { return ApiResponse.success(null); }




