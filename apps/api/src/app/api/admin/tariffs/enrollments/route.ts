import { NextRequest } from 'next/server';
import { z } from 'zod';
import { withAdminMiddleware, ApiResponse } from '@/lib/middleware';
import { TariffEnrollmentService } from '@/lib/services/tariff-enrollment.service';
import { TariffEnrollmentStatus } from '@repo/db';

export const runtime = 'nodejs';

const enrollmentService = new TariffEnrollmentService();

const idSchema = z.string().uuid().or(z.string().cuid());

const QuerySchema = z.object({
  status: z.nativeEnum(TariffEnrollmentStatus).optional(),
  segment: z.string().optional(),
  userId: idSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}

export async function GET(req: NextRequest) {
  return withAdminMiddleware(async () => {
    try {
      const params = QuerySchema.parse(Object.fromEntries(req.nextUrl.searchParams.entries()));
      const result = await enrollmentService.listEnrollments({
        status: params.status,
        segment: params.segment,
        userId: params.userId,
        page: params.page,
        limit: params.limit,
      });

      return ApiResponse.success(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return ApiResponse.validation(
          error.errors.map((err) => ({
            field: err.path.join('.'),
            message: err.message,
          }))
        );
      }

      return ApiResponse.error(
        error instanceof Error ? error.message : 'Error interno del servidor',
        500
      );
    }
  })(req);
}
