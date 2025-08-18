import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@repo/auth';
import { reservationService } from '../../../lib/services/reservation.service';
import AuthService from '../../../lib/services/auth.service';
import { z } from 'zod';

// Esquema para crear reserva (acepta UUID o CUID)
const CreateReservationSchema = z.object({
  courtId: z.string().min(1, 'courtId requerido'),
  startTime: z.string().datetime(),
  duration: z.number().min(30).max(480),
  isRecurring: z.boolean().optional().default(false),
  recurringPattern: z.object({
    frequency: z.enum(['weekly', 'biweekly', 'monthly']),
    daysOfWeek: z.array(z.number().min(1).max(7)),
    endDate: z.string().datetime(),
    exceptions: z.array(z.string().datetime()).optional(),
  }).optional(),
  paymentMethod: z.enum(['stripe', 'redsys', 'credits']).optional(),
  notes: z.string().optional(),
});

// Esquema para filtros de búsqueda (acepta IDs genéricos)
const GetReservationsSchema = z.object({
  status: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  courtId: z.string().min(1).optional(),
  page: z.string().transform(Number).optional().default('1'),
  limit: z.string().transform(Number).optional().default('20'),
});

/**
 * GET /api/reservations
 * Obtener reservas del usuario autenticado
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
    // Alinear ID de sesión con usuario real en BD (autoprovisionado por OAuth)
    const authService = new AuthService();
    let finalUserId = session.user.id as string;
    try {
      const userById = await authService.getUserById(finalUserId);
      if (!userById && session.user.email) {
        const ensured = await authService.ensureUserByEmail(
          session.user.email as string,
          (session.user as any).name as string | undefined
        );
        finalUserId = ensured.id;
      }
    } catch {
      // continuar con el ID de sesión si falla la comprobación
    }

    const { searchParams } = new URL(request.url);
    const params = Object.fromEntries(searchParams.entries());
    
    const validatedParams = GetReservationsSchema.parse(params);
    
    const filters: any = {
      status: validatedParams.status,
    };
    
    if (validatedParams.startDate && validatedParams.endDate) {
      filters.startDate = new Date(validatedParams.startDate);
      filters.endDate = new Date(validatedParams.endDate);
    }
    
    const reservations = await reservationService.getReservationsByUser(
      finalUserId,
      filters
    );
    
    // Paginación simple
    const page = validatedParams.page;
    const limit = validatedParams.limit;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    
    const paginatedReservations = reservations.slice(startIndex, endIndex);
    
    return NextResponse.json({
      reservations: paginatedReservations,
      pagination: {
        page,
        limit,
        total: reservations.length,
        totalPages: Math.ceil(reservations.length / limit),
      },
    });
  } catch (error) {
    console.error('Error obteniendo reservas:', error);
    
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
 * POST /api/reservations
 * Crear nueva reserva
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

    // Asegurar que el usuario exista en la base de datos (autoprovisionamiento OAuth)
    const authService = new AuthService();
    let finalUserId = session.user.id as string;
    try {
      const userById = await authService.getUserById(finalUserId);
      if (!userById && session.user.email) {
        const ensured = await authService.ensureUserByEmail(
          session.user.email as string,
          (session.user as any).name as string | undefined
        );
        finalUserId = ensured.id;
      }
    } catch {
      // Si algo falla en la comprobación/creación, continuamos y dejaremos que Prisma reporte con claridad
    }

    const body = await request.json();
    const validatedData = CreateReservationSchema.parse(body);
    
    const reservation = await reservationService.createReservation({
      ...validatedData,
      userId: finalUserId,
    });
    
    return NextResponse.json(
      {
        message: 'Reserva creada exitosamente',
        reservation,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creando reserva:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      );
    }
    
    if (error instanceof Error) {
      // Errores específicos del negocio
      if (error.message.includes('no disponible') || 
          error.message.includes('no está disponible') ||
          error.message.includes('mantenimiento')) {
        return NextResponse.json(
          { error: error.message },
          { status: 409 } // Conflict
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