import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@repo/auth';
import { reservationService } from '../../../../lib/services/reservation.service';
import { z } from 'zod';

// Esquema para actualizar reserva (normaliza estados a mayúsculas válidas)
const StatusEnum = z.enum(['PENDING', 'PAID', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW']);
const UpdateReservationSchema = z.object({
  startTime: z.string().datetime().optional(),
  duration: z.number().min(30).max(480).optional(),
  notes: z.string().optional(),
  status: z
    .preprocess((val) => {
      if (val == null) return val as any;
      const v = String(val).toLowerCase();
      const map: Record<string, string> = {
        confirmed: 'IN_PROGRESS',
        cancelled: 'CANCELLED',
        completed: 'COMPLETED',
        no_show: 'NO_SHOW',
        pending: 'PENDING',
        paid: 'PAID',
        in_progress: 'IN_PROGRESS',
      };
      return (map[v] || v.toUpperCase()) as any;
    }, StatusEnum)
    .optional(),
});

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * GET /api/reservations/[id]
 * Obtener detalles de una reserva específica
 */
export async function GET(
  request: NextRequest
) {
  try {
    console.log('🔍 [GET-RESERVATION] Iniciando búsqueda de reserva');
    
    const session = await auth();
    if (!session?.user?.id) {
      console.log('❌ [GET-RESERVATION] Usuario no autenticado');
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const pathname = request.nextUrl.pathname;
    const reservationId = pathname.split('/').pop() as string;
    
    console.log('🔍 [GET-RESERVATION] Buscando reserva:', reservationId, 'para usuario:', session.user.id);
    
    if (!reservationId) {
      console.log('❌ [GET-RESERVATION] ID de reserva requerido');
      return NextResponse.json(
        { error: 'ID de reserva requerido' },
        { status: 400 }
      );
    }

    // Obtener reservas del usuario para verificar permisos
    console.log('🔍 [GET-RESERVATION] Obteniendo reservas del usuario...');
    const userReservations = await reservationService.getReservationsByUser(
      session.user.id
    );
    
    console.log('🔍 [GET-RESERVATION] Reservas del usuario encontradas:', userReservations.length);
    
    const reservation = userReservations.find(r => r.id === reservationId);
    
    if (!reservation) {
      console.log('❌ [GET-RESERVATION] Reserva no encontrada para el usuario');
      return NextResponse.json(
        { error: 'Reserva no encontrada' },
        { status: 404 }
      );
    }
    
    console.log('✅ [GET-RESERVATION] Reserva encontrada exitosamente:', reservation.id);
    return NextResponse.json({ reservation });
  } catch (error) {
    console.error('🚨 [GET-RESERVATION] Error obteniendo reserva:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/reservations/[id]
 * Actualizar una reserva específica
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
    const reservationId = pathname.split('/').pop() as string;
    
    if (!reservationId) {
      return NextResponse.json(
        { error: 'ID de reserva requerido' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validatedData = UpdateReservationSchema.parse(body);
    
    // Verificar que la reserva pertenece al usuario
    const userReservations = await reservationService.getReservationsByUser(
      session.user.id
    );
    
    const existingReservation = userReservations.find(r => r.id === reservationId);
    
    if (!existingReservation) {
      return NextResponse.json(
        { error: 'Reserva no encontrada' },
        { status: 404 }
      );
    }
    
    // Verificar que la reserva se puede modificar
    if (existingReservation.status === 'CANCELLED' || 
        existingReservation.status === 'COMPLETED') {
      return NextResponse.json(
        { error: 'No se puede modificar una reserva cancelada o completada' },
        { status: 400 }
      );
    }
    
    const updatedReservation = await reservationService.updateReservation(
      reservationId,
      validatedData
    );
    
    return NextResponse.json({
      message: 'Reserva actualizada exitosamente',
      reservation: updatedReservation,
    });
  } catch (error) {
    console.error('Error actualizando reserva:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      );
    }
    
    if (error instanceof Error) {
      if (error.message.includes('no disponible') || 
          error.message.includes('conflicto')) {
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
 * DELETE /api/reservations/[id]
 * Cancelar una reserva específica
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
    const reservationId = pathname.split('/').pop() as string;
    
    if (!reservationId) {
      return NextResponse.json(
        { error: 'ID de reserva requerido' },
        { status: 400 }
      );
    }

    // Verificar que la reserva pertenece al usuario
    const userReservations = await reservationService.getReservationsByUser(
      session.user.id
    );
    
    const existingReservation = userReservations.find(r => r.id === reservationId);
    
    if (!existingReservation) {
      return NextResponse.json(
        { error: 'Reserva no encontrada' },
        { status: 404 }
      );
    }
    
    // Verificar que la reserva se puede cancelar
    if (existingReservation.status === 'CANCELLED') {
      return NextResponse.json(
        { error: 'La reserva ya está cancelada' },
        { status: 400 }
      );
    }
    
    if (existingReservation.status === 'COMPLETED') {
      return NextResponse.json(
        { error: 'No se puede cancelar una reserva completada' },
        { status: 400 }
      );
    }
    
    const cancelledReservation = await reservationService.cancelReservation(
      reservationId,
      session.user.id
    );
    
    return NextResponse.json({
      message: 'Reserva cancelada exitosamente',
      reservation: cancelledReservation,
    });
  } catch (error) {
    console.error('Error cancelando reserva:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('muy tarde') || 
          error.message.includes('no se puede cancelar')) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
    }
    
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}