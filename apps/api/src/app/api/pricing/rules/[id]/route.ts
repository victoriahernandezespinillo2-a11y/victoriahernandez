import { NextRequest, NextResponse } from 'next/server';
import { auth, withRole } from '@repo/auth';
import { pricingService } from '../../../../../lib/services/pricing.service';
import { z } from 'zod';

// Esquema para actualizar regla de precio
const UpdatePricingRuleSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  basePrice: z.number().min(0).optional(),
  timeSlots: z.array(z.object({
    start: z.string().regex(/^\d{2}:\d{2}$/),
    end: z.string().regex(/^\d{2}:\d{2}$/),
    multiplier: z.number().min(0).max(10),
  })).optional(),
  daysOfWeek: z.array(z.number().min(1).max(7)).optional(),
  validFrom: z.string().datetime().optional(),
  validTo: z.string().datetime().optional(),
  membershipDiscount: z.number().min(0).max(100).optional(),
  priority: z.number().min(1).max(100).optional(),
  isActive: z.boolean().optional(),
});

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * GET /api/pricing/rules/[id]
 * Obtener detalles de una regla de precios específica
 */
export async function GET(
  request: NextRequest
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Verificar permisos de administrador o staff
    const hasPermission = await withRole(['admin', 'staff'])(session);
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Permisos insuficientes' },
        { status: 403 }
      );
    }

    const pathname = request.nextUrl.pathname;
    const ruleId = pathname.split('/').slice(-1)[0] as string;
    
    if (!ruleId) {
      return NextResponse.json(
        { error: 'ID de regla requerido' },
        { status: 400 }
      );
    }

    const pricingRule = await pricingService.getPricingRuleById(ruleId);
    
    if (!pricingRule) {
      return NextResponse.json(
        { error: 'Regla de precios no encontrada' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ pricingRule });
  } catch (error) {
    console.error('Error obteniendo regla de precios:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/pricing/rules/[id]
 * Actualizar una regla de precios específica
 */
export async function PUT(
  request: NextRequest
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Verificar permisos de administrador
    const hasPermission = await withRole(['admin'])(session);
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Solo los administradores pueden modificar reglas de precios' },
        { status: 403 }
      );
    }

    const pathname = request.nextUrl.pathname;
    const ruleId = pathname.split('/').slice(-1)[0] as string;
    
    if (!ruleId) {
      return NextResponse.json(
        { error: 'ID de regla requerido' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validatedData = UpdatePricingRuleSchema.parse(body);
    
    // Verificar que la regla existe
    const existingRule = await pricingService.getPricingRuleById(ruleId);
    
    if (!existingRule) {
      return NextResponse.json(
        { error: 'Regla de precios no encontrada' },
        { status: 404 }
      );
    }
    
    // Preparar datos de actualización
    const updateData: any = {
      ...validatedData,
    };
    
    // Convertir fechas si se proporcionan
    if (validatedData.validFrom) {
      updateData.validFrom = new Date(validatedData.validFrom);
    }
    
    if (validatedData.validTo) {
      updateData.validTo = new Date(validatedData.validTo);
    }
    
    const updatedRule = await pricingService.updatePricingRule(
      ruleId,
      updateData
    );
    
    return NextResponse.json({
      message: 'Regla de precios actualizada exitosamente',
      pricingRule: updatedRule,
    });
  } catch (error) {
    console.error('Error actualizando regla de precios:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      );
    }
    
    if (error instanceof Error) {
      if (error.message.includes('conflicto')) {
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

/**
 * DELETE /api/pricing/rules/[id]
 * Eliminar una regla de precios específica
 */
export async function DELETE(
  request: NextRequest
) {
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
        { error: 'Solo los administradores pueden eliminar reglas de precios' },
        { status: 403 }
      );
    }

    const pathname = request.nextUrl.pathname;
    const ruleId = pathname.split('/').slice(-1)[0] as string;
    
    if (!ruleId) {
      return NextResponse.json(
        { error: 'ID de regla requerido' },
        { status: 400 }
      );
    }

    // Verificar que la regla existe
    const existingRule = await pricingService.getPricingRuleById(ruleId);
    
    if (!existingRule) {
      return NextResponse.json(
        { error: 'Regla de precios no encontrada' },
        { status: 404 }
      );
    }
    
    const deletedRule = await pricingService.deletePricingRule(ruleId);
    
    return NextResponse.json({
      message: 'Regla de precios eliminada exitosamente',
      pricingRule: deletedRule,
    });
  } catch (error) {
    console.error('Error eliminando regla de precios:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('en uso') || 
          error.message.includes('referencias')) {
        return NextResponse.json(
          { error: 'No se puede eliminar la regla porque está siendo utilizada' },
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

/**
 * POST /api/pricing/rules/[id]/test
 * Probar una regla de precios con datos específicos
 */
export async function POST(
  request: NextRequest
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Verificar permisos de administrador o staff
    const hasPermission = await withRole(['admin', 'staff'])(session);
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Permisos insuficientes' },
        { status: 403 }
      );
    }

    const pathname = request.nextUrl.pathname;
    const ruleId = pathname.split('/').slice(-2, -1)[0] as string;
    
    if (!ruleId) {
      return NextResponse.json(
        { error: 'ID de regla requerido' },
        { status: 400 }
      );
    }

    const body = await request.json();
    
    const TestRuleSchema = z.object({
      courtId: z.string().cuid(),
      startTime: z.string().datetime(),
      duration: z.number().min(30).max(480),
      userId: z.string().cuid().optional(),
      membershipId: z.string().cuid().optional(),
    });
    
    const validatedData = TestRuleSchema.parse(body);
    
    // Verificar que la regla existe
    const pricingRule = await pricingService.getPricingRuleById(ruleId);
    
    if (!pricingRule) {
      return NextResponse.json(
        { error: 'Regla de precios no encontrada' },
        { status: 404 }
      );
    }
    
    // Calcular precio usando solo esta regla específica
    const testResult = await pricingService.testPricingRule(
      ruleId,
      {
        courtId: validatedData.courtId,
        startTime: new Date(validatedData.startTime),
        duration: validatedData.duration,
        userId: validatedData.userId || session.user.id,
      }
    );
    
    return NextResponse.json({
      testResult,
      rule: pricingRule,
      testParameters: {
        courtId: validatedData.courtId,
        startTime: validatedData.startTime,
        duration: validatedData.duration,
        userId: validatedData.userId || session.user.id,
        // membershipId ignorado por el servicio base
      },
      testedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error probando regla de precios:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}