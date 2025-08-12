import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@repo/auth';
import { pricingService } from '../../../../lib/services/pricing.service';
import { z } from 'zod';

// Esquema para calcular precio
const CalculatePriceSchema = z.object({
  courtId: z.string().cuid(),
  startTime: z.string().datetime(),
  duration: z.number().min(30).max(480),
  userId: z.string().cuid().optional(),
  membershipId: z.string().cuid().optional(),
  isRecurring: z.boolean().optional().default(false),
  recurringFrequency: z.enum(['weekly', 'biweekly', 'monthly']).optional(),
  recurringCount: z.number().min(1).max(52).optional(),
});

/**
 * POST /api/pricing/calculate
 * Calcular precio de una reserva
 */
export async function POST(request: NextRequest) {
  try {
    // Intentar obtener sesión, pero permitir cálculo sin autenticación
    const session = await auth().catch(() => null);

    const body = await request.json();
    const validatedData = CalculatePriceSchema.parse(body);
    
    // Usar el ID del usuario de la sesión si no se proporciona
    const userId = validatedData.userId || session?.user?.id;
    
    const pricing = await pricingService.calculatePrice({
      courtId: validatedData.courtId,
      startTime: new Date(validatedData.startTime),
      duration: validatedData.duration,
      userId,
    });
    
    // Calcular precio para reservas recurrentes si aplica
    let recurringPricing = null;
    if (validatedData.isRecurring && validatedData.recurringFrequency && validatedData.recurringCount) {
      const recurringPrices = [];
      const startDate = new Date(validatedData.startTime);
      
      for (let i = 0; i < validatedData.recurringCount; i++) {
        const currentDate = new Date(startDate);
        
        // Calcular fecha según frecuencia
        switch (validatedData.recurringFrequency) {
          case 'weekly':
            currentDate.setDate(startDate.getDate() + (i * 7));
            break;
          case 'biweekly':
            currentDate.setDate(startDate.getDate() + (i * 14));
            break;
          case 'monthly':
            currentDate.setMonth(startDate.getMonth() + i);
            break;
        }
        
        const recurringPrice = await pricingService.calculatePrice({
          courtId: validatedData.courtId,
          startTime: currentDate,
          duration: validatedData.duration,
          userId,
        });
        
        recurringPrices.push({
          date: currentDate.toISOString(),
          ...recurringPrice,
        });
      }
      
      const totalRecurringPrice = recurringPrices.reduce(
        (sum, price: any) => sum + Number(price.total || 0),
        0
      );
      
      const totalRecurringDiscount = recurringPrices.reduce(
        (sum, price: any) => sum + Number(price.discount || 0),
        0
      );
      
      recurringPricing = {
        frequency: validatedData.recurringFrequency,
        count: validatedData.recurringCount,
        prices: recurringPrices,
        summary: {
          totalBasePrice: recurringPrices.reduce(
            (sum, price) => sum + price.basePrice,
            0
          ),
          totalDiscount: totalRecurringDiscount,
          totalFinalPrice: totalRecurringPrice,
          averagePricePerSession: totalRecurringPrice / validatedData.recurringCount,
          savings: recurringPrices.reduce(
            (sum, price) => sum + price.basePrice,
            0
          ) - totalRecurringPrice,
        },
      };
    }
    
    return NextResponse.json({
      pricing,
      recurringPricing,
      calculation: {
        courtId: validatedData.courtId,
        startTime: validatedData.startTime,
        duration: validatedData.duration,
        userId,
        membershipId: validatedData.membershipId,
        isRecurring: validatedData.isRecurring,
        calculatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error calculando precio:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      );
    }
    
    if (error instanceof Error) {
      if (error.message.includes('no encontrada') || 
          error.message.includes('no existe')) {
        return NextResponse.json(
          { error: error.message },
          { status: 404 }
        );
      }
    }
    
    if (process.env.NODE_ENV !== 'production') {
      const err = error as Error;
      return NextResponse.json(
        { error: err?.message || 'Error interno del servidor', stack: err?.stack },
        { status: 500 }
      );
    }
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

/**
 * GET /api/pricing/calculate
 * Obtener precios en lote para múltiples horarios
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

    const { searchParams } = new URL(request.url);
    
    const BulkPricingSchema = z.object({
      courtId: z.string().cuid(),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      duration: z.string().transform(Number).optional().default('60'),
      startHour: z.string().transform(Number).optional().default('6'),
      endHour: z.string().transform(Number).optional().default('23'),
      interval: z.string().transform(Number).optional().default('60'), // minutos
    });
    
    const params = Object.fromEntries(searchParams.entries());
    const validatedParams = BulkPricingSchema.parse(params);
    
    const bulkPricing = await pricingService.getBulkPricing({
      courtId: validatedParams.courtId,
      date: new Date(validatedParams.date),
      duration: validatedParams.duration,
      startHour: validatedParams.startHour,
      endHour: validatedParams.endHour,
      interval: validatedParams.interval,
      userId: session.user.id,
    });
    
    return NextResponse.json({
      bulkPricing,
      parameters: {
        courtId: validatedParams.courtId,
        date: validatedParams.date,
        duration: validatedParams.duration,
        timeRange: {
          start: validatedParams.startHour,
          end: validatedParams.endHour,
        },
        interval: validatedParams.interval,
      },
      summary: {
        totalSlots: bulkPricing.length,
        priceRange: bulkPricing.length > 0 ? {
          min: Math.min(...bulkPricing.map(p => p.finalPrice)),
          max: Math.max(...bulkPricing.map(p => p.finalPrice)),
        } : null,
        averagePrice: bulkPricing.length > 0 
          ? bulkPricing.reduce((sum, p) => sum + p.finalPrice, 0) / bulkPricing.length
          : 0,
      },
    });
  } catch (error) {
    console.error('Error obteniendo precios en lote:', error);
    
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