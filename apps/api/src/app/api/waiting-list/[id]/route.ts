import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@repo/auth';
import { waitingListService } from '../../../../lib/services/waiting-list.service';
import { z } from 'zod';

// Esquema para actualizar entrada de lista de espera
const UpdateWaitingListSchema = z.object({
  preferredDate: z.string().datetime().optional(),
  preferredTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  duration: z.number().min(30).max(480).optional(),
  flexibleTime: z.boolean().optional(),
  timeRange: z.object({
    start: z.string().regex(/^\d{2}:\d{2}$/),
    end: z.string().regex(/^\d{2}:\d{2}$/),
  }).optional(),
  maxWaitDays: z.number().min(1).max(30).optional(),
  notes: z.string().optional(),
});

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * GET /api/waiting-list/[id]
 * Obtener detalles de una entrada específica de lista de espera
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

    const pathname = request.nextUrl.pathname;
    const waitingListId = pathname.split('/').pop() as string;
    
    if (!waitingListId) {
      return NextResponse.json(
        { error: 'ID de lista de espera requerido' },
        { status: 400 }
      );
    }

    // Obtener entradas de lista de espera del usuario para verificar permisos
    const userWaitingList = await waitingListService.getWaitingListByUser(
      session.user.id
    );
    
    const waitingListEntry = userWaitingList.find(entry => entry.id === waitingListId);
    
    if (!waitingListEntry) {
      return NextResponse.json(
        { error: 'Entrada de lista de espera no encontrada' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ waitingListEntry });
  } catch (error) {
    console.error('Error obteniendo entrada de lista de espera:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/waiting-list/[id]
 * Actualizar una entrada específica de lista de espera
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

    const pathname = request.nextUrl.pathname;
    const waitingListId = pathname.split('/').pop() as string;
    
    if (!waitingListId) {
      return NextResponse.json(
        { error: 'ID de lista de espera requerido' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validatedData = UpdateWaitingListSchema.parse(body);
    
    // Verificar que la entrada pertenece al usuario
    const userWaitingList = await waitingListService.getWaitingListByUser(
      session.user.id
    );
    
    const existingEntry = userWaitingList.find(entry => entry.id === waitingListId);
    
    if (!existingEntry) {
      return NextResponse.json(
        { error: 'Entrada de lista de espera no encontrada' },
        { status: 404 }
      );
    }
    
    // Verificar que la entrada se puede modificar
    if (existingEntry.status === 'claimed' || 
        existingEntry.status === 'expired') {
      return NextResponse.json(
        { error: 'No se puede modificar una entrada reclamada o expirada' },
        { status: 400 }
      );
    }
    
    // Preparar datos de actualización
    const updateData: any = {
      ...validatedData,
    };
    
    // Construir fecha y hora preferida si se proporcionan
    if (validatedData.preferredDate && validatedData.preferredTime) {
      const preferredDate = new Date(validatedData.preferredDate);
      const [hours, minutes] = validatedData.preferredTime.split(':').map(Number);
      
      const preferredDateTime = new Date(preferredDate);
      preferredDateTime.setHours(hours, minutes, 0, 0);
      
      updateData.preferredDateTime = preferredDateTime;
    }
    
    // Construir rango de tiempo si es flexible
    if (validatedData.flexibleTime && validatedData.timeRange && validatedData.preferredDate) {
      const preferredDate = new Date(validatedData.preferredDate);
      const [startHours, startMinutes] = validatedData.timeRange.start.split(':').map(Number);
      const [endHours, endMinutes] = validatedData.timeRange.end.split(':').map(Number);
      
      const startTime = new Date(preferredDate);
      startTime.setHours(startHours, startMinutes, 0, 0);
      
      const endTime = new Date(preferredDate);
      endTime.setHours(endHours, endMinutes, 0, 0);
      
      updateData.timeRange = {
        start: startTime,
        end: endTime,
      };
    }
    
    const updatedEntry = await waitingListService.updateWaitingListEntry(
      waitingListId,
      updateData
    );
    
    return NextResponse.json({
      message: 'Entrada de lista de espera actualizada exitosamente',
      waitingListEntry: updatedEntry,
    });
  } catch (error) {
    console.error('Error actualizando entrada de lista de espera:', error);
    
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

/**
 * DELETE /api/waiting-list/[id]
 * Cancelar una entrada específica de lista de espera
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

    const pathname = request.nextUrl.pathname;
    const waitingListId = pathname.split('/').pop() as string;
    
    if (!waitingListId) {
      return NextResponse.json(
        { error: 'ID de lista de espera requerido' },
        { status: 400 }
      );
    }

    // Verificar que la entrada pertenece al usuario
    const userWaitingList = await waitingListService.getWaitingListByUser(
      session.user.id
    );
    
    const existingEntry = userWaitingList.find(entry => entry.id === waitingListId);
    
    if (!existingEntry) {
      return NextResponse.json(
        { error: 'Entrada de lista de espera no encontrada' },
        { status: 404 }
      );
    }
    
    // Verificar que la entrada se puede cancelar
    if (existingEntry.status === 'claimed') {
      return NextResponse.json(
        { error: 'No se puede cancelar una entrada ya reclamada' },
        { status: 400 }
      );
    }
    
    if (existingEntry.status === 'expired') {
      return NextResponse.json(
        { error: 'La entrada ya está expirada' },
        { status: 400 }
      );
    }
    
    const cancelledEntry = await waitingListService.cancelWaitingListEntry(
      waitingListId
    );
    
    return NextResponse.json({
      message: 'Entrada de lista de espera cancelada exitosamente',
      waitingListEntry: cancelledEntry,
    });
  } catch (error) {
    console.error('Error cancelando entrada de lista de espera:', error);
    
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/waiting-list/[id]/claim
 * Reclamar un slot disponible desde la lista de espera
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

    const pathname = request.nextUrl.pathname;
    const waitingListId = pathname.split('/').pop() as string;
    
    if (!waitingListId) {
      return NextResponse.json(
        { error: 'ID de lista de espera requerido' },
        { status: 400 }
      );
    }

    const body = await request.json();
    
    const ClaimSlotSchema = z.object({
      availableSlotId: z.string().cuid(),
      paymentMethod: z.enum(['stripe', 'redsys', 'credits']).optional(),
    });
    
    const validatedData = ClaimSlotSchema.parse(body);
    
    // Verificar que la entrada pertenece al usuario
    const userWaitingList = await waitingListService.getWaitingListByUser(
      session.user.id
    );
    
    const waitingListEntry = userWaitingList.find(entry => entry.id === waitingListId);
    
    if (!waitingListEntry) {
      return NextResponse.json(
        { error: 'Entrada de lista de espera no encontrada' },
        { status: 404 }
      );
    }
    
    if (waitingListEntry.status !== 'notified') {
      return NextResponse.json(
        { error: 'Solo se pueden reclamar slots cuando se ha sido notificado' },
        { status: 400 }
      );
    }
    
    const claimedReservation = await waitingListService.claimAvailableSlot(
      waitingListId,
      validatedData.availableSlotId,
      validatedData.paymentMethod
    );
    
    return NextResponse.json({
      message: 'Slot reclamado exitosamente',
      reservation: claimedReservation,
    });
  } catch (error) {
    console.error('Error reclamando slot:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      );
    }
    
    if (error instanceof Error) {
      if (error.message.includes('expirado') || 
          error.message.includes('no disponible')) {
        return NextResponse.json(
          { error: error.message },
          { status: 410 } // Gone
        );
      }
    }
    
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}