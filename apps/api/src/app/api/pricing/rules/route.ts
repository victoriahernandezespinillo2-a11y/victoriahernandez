import { NextRequest, NextResponse } from 'next/server';
import { auth, withRole } from '@repo/auth';
import { pricingService } from '../../../../lib/services/pricing.service';
import { z } from 'zod';

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
  priority: z.number().min(1).max(100).optional().default('50'),
  isActive: z.boolean().optional().default(true),
});

// Esquema para filtros de búsqueda
const GetPricingRulesSchema = z.object({
  courtId: z.string().cuid().optional(),
  centerId: z.string().cuid().optional(),
  sport: z.string().optional(),
  isActive: z.string().transform(val => val === 'true').optional(),
  page: z.string().transform(Number).optional().default('1'),
  limit: z.string().transform(Number).optional().default('20'),
});

/**
 * GET /api/pricing/rules
 * Obtener reglas de precios (solo para administradores y staff)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Verificar permisos de administrador o staff
    const hasPermission = await withRole(['ADMIN', 'STAFF'])(session);
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Permisos insuficientes' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const params = Object.fromEntries(searchParams.entries());
    
    const validatedParams = GetPricingRulesSchema.parse(params);
    
    const filters: any = {
      courtId: validatedParams.courtId,
      centerId: validatedParams.centerId,
      sport: validatedParams.sport,
      isActive: validatedParams.isActive,
    };
    
    const pricingRules = await pricingService.getPricingRules(filters);
    
    // Paginación
    const page = validatedParams.page;
    const limit = validatedParams.limit;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    
    const paginatedRules = pricingRules.slice(startIndex, endIndex);
    
    return NextResponse.json({
      pricingRules: paginatedRules,
      pagination: {
        page,
        limit,
        total: pricingRules.length,
        totalPages: Math.ceil(pricingRules.length / limit),
      },
      filters,
    });
  } catch (error) {
    console.error('Error obteniendo reglas de precios:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Parámetros inválidos', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/pricing/rules
 * Crear nueva regla de precios (solo para administradores)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Verificar permisos de administrador
    const hasPermission = await withRole(['ADMIN'])(session);
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Solo los administradores pueden crear reglas de precios' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = CreatePricingRuleSchema.parse(body);
    
    // Validar que se especifique al menos courtId, centerId o sport
    if (!validatedData.courtId && !validatedData.centerId && !validatedData.sport) {
      return NextResponse.json(
        { error: 'Debe especificar al menos courtId, centerId o sport' },
        { status: 400 }
      );
    }
    
    // Convertir fechas si se proporcionan
    const ruleData: any = {
      ...validatedData,
    };
    
    if (validatedData.validFrom) {
      ruleData.validFrom = new Date(validatedData.validFrom);
    }
    
    if (validatedData.validTo) {
      ruleData.validTo = new Date(validatedData.validTo);
    }
    
    const pricingRule = await pricingService.createPricingRule(ruleData);
    
    return NextResponse.json(
      {
        message: 'Regla de precios creada exitosamente',
        pricingRule,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creando regla de precios:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      );
    }
    
    if (error instanceof Error) {
      if (error.message.includes('conflicto') || 
          error.message.includes('duplicado')) {
        return NextResponse.json(
          { error: error.message },
          { status: 409 }
        );
      }
    }
    
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}