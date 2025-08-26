import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@repo/auth';
import { waitingListService } from '../../../lib/services/waiting-list.service';
import { z } from 'zod';

// Esquema para agregar a lista de espera
const AddToWaitingListSchema = z.object({
  courtId: z.string().cuid(),
  preferredDate: z.string().datetime(),
  preferredTime: z.string().regex(/^\d{2}:\d{2}$/, 'Formato de hora debe ser HH:MM'),
  duration: z.number().min(30).max(480),
  flexibleTime: z.boolean().optional().default(false),
  timeRange: z.object({
    start: z.string().regex(/^\d{2}:\d{2}$/),
    end: z.string().regex(/^\d{2}:\d{2}$/),
  }).optional(),
  maxWaitDays: z.number().min(1).max(30).optional().default(7),
  notes: z.string().optional(),
});

// Esquema para filtros de búsqueda
const GetWaitingListSchema = z.object({
  courtId: z.string().cuid().optional(),
  status: z.enum(['active', 'notified', 'expired', 'claimed']).optional(),
  page: z.string().transform(Number).optional().default('1'),
  limit: z.string().transform(Number).optional().default('20'),
});

/**
 * GET /api/waiting-list
 * Obtener lista de espera del usuario autenticado
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
    const params = Object.fromEntries(searchParams.entries());
    
    const validatedParams = GetWaitingListSchema.parse(params);
    
    const waitingListEntriesAll = await waitingListService.getWaitingListByUser(
      session.user.id
    );
    
    // Filtros opcionales en memoria, compatibles con el servicio actual
    const waitingListEntries = waitingListEntriesAll.filter((e: any) => {
      if (validatedParams.courtId && e.courtId !== validatedParams.courtId) return false;
      if (validatedParams.status) {
        const map: Record<string, string> = { active: 'waiting', notified: 'notified', expired: 'expired', claimed: 'converted' };
        const target = map[validatedParams.status];
        if (target && e.status !== target) return false;
      }
      return true;
    });
    
    // Paginación
    const page = validatedParams.page;
    const limit = validatedParams.limit;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    
    const paginatedEntries = waitingListEntries.slice(startIndex, endIndex);
    
    return NextResponse.json({
      waitingList: paginatedEntries,
      pagination: {
        page,
        limit,
        total: waitingListEntries.length,
        totalPages: Math.ceil(waitingListEntries.length / limit),
      },
    });
  } catch (error) {
    console.error('Error obteniendo lista de espera:', error);
    
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
 * POST /api/waiting-list
 * Agregar usuario a lista de espera
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

    const body = await request.json();
    const validatedData = AddToWaitingListSchema.parse(body);
    
    // Construir fecha y hora preferida
    const preferredDate = new Date(validatedData.preferredDate);
    const timeParts = validatedData.preferredTime.split(':').map(Number);
    const [hours = 0, minutes = 0] = timeParts;
    
    const preferredDateTime = new Date(preferredDate);
    preferredDateTime.setHours(hours, minutes, 0, 0);
    
    // Construir rango de tiempo si es flexible
    let timeRange;
    if (validatedData.flexibleTime && validatedData.timeRange) {
      const startParts = validatedData.timeRange.start.split(':').map(Number);
      const endParts = validatedData.timeRange.end.split(':').map(Number);
      const [startHours = 0, startMinutes = 0] = startParts;
      const [endHours = 0, endMinutes = 0] = endParts;
      
      const startTime = new Date(preferredDate);
      startTime.setHours(startHours, startMinutes, 0, 0);
      
      const endTime = new Date(preferredDate);
      endTime.setHours(endHours, endMinutes, 0, 0);
      
      timeRange = {
        start: startTime,
        end: endTime,
      };
    }
    
    const maxWaitMinutes = 60; // límite conservador (el servicio acepta 15..1440)
    const waitingListEntry = await waitingListService.addToWaitingList({
      userId: session.user.id,
      courtId: validatedData.courtId,
      requestedTime: preferredDateTime.toISOString(),
      duration: validatedData.duration,
      maxWaitMinutes,
    });
    
    return NextResponse.json(
      {
        message: 'Agregado a lista de espera exitosamente',
        waitingListEntry,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error agregando a lista de espera:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      );
    }
    
    if (error instanceof Error) {
      if (error.message.includes('ya existe') || 
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