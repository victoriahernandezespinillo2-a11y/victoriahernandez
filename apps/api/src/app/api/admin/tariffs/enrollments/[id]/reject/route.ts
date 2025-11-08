import { NextRequest } from 'next/server';
import { z } from 'zod';
import { withAdminMiddleware, ApiResponse } from '@/lib/middleware';
import { TariffEnrollmentService } from '@/lib/services/tariff-enrollment.service';

export const runtime = 'nodejs';

const enrollmentService = new TariffEnrollmentService();

const BodySchema = z.object({
  reason: z.string().min(5, 'El motivo es obligatorio').max(500),
  notes: z.string().max(500).optional(),
});

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}

export async function POST(req: NextRequest) {
  return withAdminMiddleware(async (request) => {
    try {
      const user = (request as any).user;
      const segments = request.nextUrl.pathname.split('/');
      const enrollmentId = segments[segments.length - 2] as string;
      const body = await request.json();
      const parsed = BodySchema.parse(body);

      const result = await enrollmentService.rejectEnrollment({
        enrollmentId,
        adminId: user.id,
        notes: parsed.notes,
        reason: parsed.reason,
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
        400
      );
    }
  })(req);
}
