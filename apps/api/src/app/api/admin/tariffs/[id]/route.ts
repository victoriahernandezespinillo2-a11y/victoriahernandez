import { NextRequest } from 'next/server';
import { z } from 'zod';
import { withAdminMiddleware, ApiResponse } from '@/lib/middleware';
import { TariffService } from '@/lib/services/tariff.service';

export const runtime = 'nodejs';

const tariffService = new TariffService();

const CourtIdSchema = z
  .array(z.string().uuid().or(z.string().cuid()))
  .optional()
  .transform((value) => (Array.isArray(value) ? Array.from(new Set(value)) : undefined));

const BodySchema = z.object({
  segment: z.string().optional(),
  minAge: z.number().int().min(0).optional(),
  maxAge: z.number().int().min(0).optional(),
  discountPercent: z.number().min(0).max(100).optional(),
  description: z.string().max(500).optional(),
  requiresManualApproval: z.boolean().optional(),
  validFrom: z.string().optional(),
  validUntil: z.string().optional(),
  isActive: z.boolean().optional(),
  courtIds: CourtIdSchema,
});

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}

export async function PUT(req: NextRequest) {
  return withAdminMiddleware(async () => {
    try {
      const pathname = req.nextUrl.pathname;
      const id = pathname.split('/').pop() as string;
      const body = await req.json();
      const parsed = BodySchema.parse(body);

      const payload = {
        segment: parsed.segment as any,
        minAge: parsed.minAge,
        maxAge: parsed.maxAge,
        discountPercent: parsed.discountPercent,
        description: parsed.description,
        requiresManualApproval: parsed.requiresManualApproval,
        validFrom: parsed.validFrom ? new Date(parsed.validFrom) : undefined,
        validUntil: parsed.validUntil ? new Date(parsed.validUntil) : undefined,
        isActive: parsed.isActive,
        courtIds: parsed.courtIds,
      };

      const tariff = await tariffService.updateTariff(id, payload);
      return ApiResponse.success(tariff);
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
