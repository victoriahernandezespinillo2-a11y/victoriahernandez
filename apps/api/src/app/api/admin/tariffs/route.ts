import { NextRequest } from 'next/server';
import { z } from 'zod';
import { withAdminMiddleware, ApiResponse } from '@/lib/middleware';
import { TariffService } from '@/lib/services/tariff.service';

export const runtime = 'nodejs';

const tariffService = new TariffService();

const QuerySchema = z.object({
  segment: z.string().optional(),
  isActive: z
    .string()
    .optional()
    .transform((value) => {
      if (value === undefined) return undefined;
      return value === 'true';
    }),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const CourtIdSchema = z
  .array(z.string().uuid().or(z.string().cuid()))
  .optional()
  .transform((value) => (Array.isArray(value) ? Array.from(new Set(value)) : undefined));

const BodySchema = z.object({
  segment: z.string().min(1),
  minAge: z.number().int().min(0),
  maxAge: z.number().int().min(0).optional(),
  discountPercent: z.number().min(0).max(100),
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

export async function GET(req: NextRequest) {
  return withAdminMiddleware(async () => {
    try {
      const params = QuerySchema.parse(Object.fromEntries(req.nextUrl.searchParams.entries()));
      const result = await tariffService.listTariffs({
        segment: params.segment as any,
        isActive: params.isActive,
        from: params.from ? new Date(params.from) : undefined,
        to: params.to ? new Date(params.to) : undefined,
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

export async function POST(req: NextRequest) {
  return withAdminMiddleware(async () => {
    try {
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

      const tariff = await tariffService.createTariff(payload);
      return ApiResponse.success(tariff, 201);
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

