import { NextRequest } from 'next/server';
import { z } from 'zod';
import { withAuthMiddleware, ApiResponse } from '@/lib/middleware';
import { TariffEnrollmentService } from '@/lib/services/tariff-enrollment.service';

export const runtime = 'nodejs';

const enrollmentService = new TariffEnrollmentService();

const idSchema = (message: string) =>
  z.string().uuid({ message }).or(z.string().cuid({ message }));

const BodySchema = z.object({
  tariffId: idSchema('ID de tarifa inválido'),
  notes: z.string().max(500).optional(),
  documentUrl: z.string().url().optional(),
});

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}

export async function POST(req: NextRequest) {
  return withAuthMiddleware(async (request) => {
    try {
      const user = (request as any).user;
      if (!user?.id) {
        return ApiResponse.unauthorized('Usuario no autenticado');
      }

      const body = await request.json();
      const parsed = BodySchema.parse(body);

      const enrollment = await enrollmentService.createEnrollment({
        userId: user.id,
        tariffId: parsed.tariffId,
        notes: parsed.notes,
        documentUrl: parsed.documentUrl,
      });

      return ApiResponse.success(enrollment, 201);
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
