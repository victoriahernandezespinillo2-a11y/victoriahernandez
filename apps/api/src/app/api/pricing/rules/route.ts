// Forzar runtime Node.js (Prisma)
export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { pricingService } from '../../../../lib/services/pricing.service';
import { withAdminMiddleware, ApiResponse as API } from '@/lib/middleware';

// Esquema para crear regla de precio
const CreatePricingRuleSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  courtId: z.string().cuid().optional(),
  centerId: z.string().cuid().optional(),
  sport: z.string().optional(),
  basePrice: z.number().min(0),
  timeSlots: z.array(z.object({
    start: z.string().regex(/^\d{2}:\d{2}$/),
    end: z.string().regex(/^\d{2}:\d{2}$/),
    multiplier: z.number().min(0).max(10),
  })).optional(),
  daysOfWeek: z.array(z.number().min(1).max(7)).optional(),
  validFrom: z.string().datetime().optional(),
  validTo: z.string().datetime().optional(),
  membershipDiscount: z.number().min(0).max(100).optional(),
  priority: z.number().min(1).max(100).optional().default(50),
  isActive: z.boolean().optional().default(true),
});

// Esquema para filtros de búsqueda
const GetPricingRulesSchema = z.object({
  courtId: z.string().optional(),
  centerId: z.string().optional(),
  sport: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

/**
 * OPTIONS /api/pricing/rules - Preflight CORS
 */
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');
  const allowedOrigins = process.env.NODE_ENV === 'production'
    ? ['https://polideportivo.com', 'https://admin.polideportivo.com']
    : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3003'];

  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
  };
  if (origin && allowedOrigins.includes(origin)) headers['Access-Control-Allow-Origin'] = origin;
  return new Response(null, { status: 200, headers });
}

/**
 * GET /api/pricing/rules
 * Obtener reglas de precios (solo para administradores y staff)
 */
export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin');
  const allowedOrigins = process.env.NODE_ENV === 'production'
    ? ['https://polideportivo.com', 'https://admin.polideportivo.com']
    : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3003'];
  const corsHeaders: Record<string, string> = { Vary: 'Origin' };
  if (origin && allowedOrigins.includes(origin)) {
    corsHeaders['Access-Control-Allow-Origin'] = origin;
    corsHeaders['Access-Control-Allow-Credentials'] = 'true';
  }

  return withAdminMiddleware(async (req) => {
    try {
      const params = Object.fromEntries(req.nextUrl.searchParams.entries());
      const validatedParams = GetPricingRulesSchema.parse(params);

      const filters: any = {
        courtId: validatedParams.courtId,
        centerId: validatedParams.centerId,
        sport: validatedParams.sport,
        isActive: validatedParams.isActive,
      };

      const pricingRules = await pricingService.getPricingRules(filters);

      const page = validatedParams.page;
      const limit = validatedParams.limit;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedRules = pricingRules.slice(startIndex, endIndex);

      const res = API.success({
        pricingRules: paginatedRules,
        pagination: {
          page,
          limit,
          total: pricingRules.length,
          totalPages: Math.ceil(Math.max(1, pricingRules.length) / Math.max(1, limit)),
        },
        filters,
      });
      Object.entries(corsHeaders).forEach(([k, v]) => res.headers.set(k, v));
      return res;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const res = API.validation(error.errors.map(e => ({ field: e.path.join('.'), message: e.message })));
        Object.entries(corsHeaders).forEach(([k, v]) => res.headers.set(k, v));
        return res;
      }
      console.error('Error obteniendo reglas de precios:', error);
      const res = API.success({ pricingRules: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 }, filters: {} });
      Object.entries(corsHeaders).forEach(([k, v]) => res.headers.set(k, v));
      return res;
    }
  })(request, {} as any);
}

/**
 * POST /api/pricing/rules
 * Crear nueva regla de precios (solo para administradores)
 */
export async function POST(request: NextRequest) {
  return withAdminMiddleware(async (req) => {
    try {
      const body = await req.json();
      const validatedData = CreatePricingRuleSchema.parse(body);

      // Validar que se especifique al menos courtId, centerId o sport
      if (!validatedData.courtId && !validatedData.centerId && !validatedData.sport) {
        return API.badRequest('Debe especificar al menos courtId, centerId o sport');
      }

      // Convertir fechas si se proporcionan
      const ruleData: any = { ...validatedData };
      if (validatedData.validFrom) ruleData.validFrom = new Date(validatedData.validFrom);
      if (validatedData.validTo) ruleData.validTo = new Date(validatedData.validTo);

      const pricingRule = await pricingService.createPricingRule(ruleData);
      return API.success({ message: 'Regla de precios creada exitosamente', pricingRule }, 201);
    } catch (error) {
      console.error('Error creando regla de precios:', error);
      if (error instanceof z.ZodError) {
        return API.validation(error.errors.map(e => ({ field: e.path.join('.'), message: e.message })));
      }
      if (error instanceof Error) {
        if (error.message.includes('conflicto') || error.message.includes('duplicado')) {
          return API.conflict(error.message);
        }
      }
      return API.internalError('Error interno del servidor');
    }
  })(request, {} as any);
}
