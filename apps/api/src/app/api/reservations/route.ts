import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@repo/auth';
import { reservationService } from '../../../lib/services/reservation.service';
import AuthService from '../../../lib/services/auth.service';
import { z } from 'zod';
import { db } from '@repo/db';
import { withReservationMiddleware, ApiResponse } from '@/lib/middleware';

// Función de autenticación simplificada
async function getAuthenticatedUser(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return null;
    }
    return session.user;
  } catch (error) {
    console.error('❌ [AUTH] Error en autenticación:', error);
    return null;
  }
}

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
  return withReservationMiddleware(async (req: NextRequest, context: any) => {
    // Declarar finalUserId al inicio para evitar errores de referencia
    let finalUserId: string | undefined;
    
    try {
      const session = await getAuthenticatedUser(req);
      if (!session?.id) {
        return NextResponse.json(
          { error: 'No autorizado' },
          { status: 401 }
        );
      }
    // Alinear ID de sesión con usuario real en BD (autoprovisionado por OAuth)
    const authService = new AuthService();
    finalUserId = session.id as string;
    try {
      const userById = await authService.getUserById(finalUserId);
      if (!userById && session.email) {
        const ensured = await authService.ensureUserByEmail(
          session.email as string,
          (session as any).name as string | undefined
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
  })(request);
}

/**
 * POST /api/reservations
 * Crear nueva reserva
 */
export async function POST(request: NextRequest) {
  return withReservationMiddleware(async (req: NextRequest, context: any) => {
    // Declarar finalUserId al inicio para evitar errores de referencia
  let finalUserId: string | undefined;
  let body: any;
  
  try {
      const session = await getAuthenticatedUser(req);
    if (!session?.id) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Asegurar que el usuario exista en la base de datos (autoprovisionamiento OAuth)
    const authService = new AuthService();
    finalUserId = session.id as string;
    try {
      const userById = await authService.getUserById(finalUserId);
      if (!userById && session.email) {
        const ensured = await authService.ensureUserByEmail(
          session.email as string,
          (session as any).name as string | undefined
        );
        finalUserId = ensured.id;
      }
    } catch {
      // Si algo falla en la comprobación/creación, continuamos y dejaremos que Prisma reporte con claridad
    }

    body = await req.json();
    const validatedData = CreateReservationSchema.parse(body);
    
    let reservation = await reservationService.createReservation({
      ...validatedData,
      userId: finalUserId,
    });

    // Si el método de pago solicitado es 'credits', realizar cargo de créditos y marcar como pagado
    if (validatedData.paymentMethod === 'credits') {
      // Obtener configuración euroPerCredit desde el centro de la cancha
      const court = await db.court.findUnique({
        where: { id: reservation.courtId },
        include: { center: true },
      });
      const settings: any = (court as any)?.center?.settings || {};
      const creditsCfg: any = settings.credits || {};
      const euroPerCredit: number | undefined = typeof creditsCfg.euroPerCredit === 'number' ? creditsCfg.euroPerCredit : undefined;
      if (!euroPerCredit || euroPerCredit <= 0) {
        return NextResponse.json(
          { error: 'Configuración de créditos no definida en el centro' },
          { status: 400 }
        );
      }

      const amount = Number(reservation.totalPrice || 0);
      const creditsNeeded = Math.ceil(amount / euroPerCredit);

      // Idempotency-Key para evitar dobles cargos
      const idemKey = request.headers.get('Idempotency-Key') || undefined;

      // Transacción atómica: validar saldo, debitar, actualizar reserva, registrar ledger y outbox
      await (db as any).$transaction(async (tx: any) => {
        // Idempotencia: si ya existe movimiento con el mismo idempotencyKey, no repetir
        if (idemKey) {
          const existing = await tx.walletLedger.findUnique({ where: { idempotency_key: idemKey } }).catch(() => null);
          if (existing) {
            // En caso idempotente, asegurar que la reserva esté marcada pagada
            await tx.reservation.update({ where: { id: reservation.id }, data: { status: 'PAID', paymentMethod: 'CREDITS' } });
            return;
          }
        }

        const user = await tx.user.findUnique({ where: { id: finalUserId }, select: { creditsBalance: true } });
        if (!user) throw new Error('Usuario no encontrado');
        if ((user.creditsBalance || 0) < creditsNeeded) {
          throw new Error('Saldo de créditos insuficiente');
        }

        await tx.user.update({ where: { id: finalUserId }, data: { creditsBalance: { decrement: creditsNeeded } } });
        reservation = await tx.reservation.update({ where: { id: reservation.id }, data: { status: 'PAID' as any, paymentMethod: 'CREDITS' } });

        // Registrar en ledger del monedero
        await tx.walletLedger.create({
          data: {
            userId: finalUserId,
            type: 'DEBIT',
            reason: 'ORDER',
            credits: creditsNeeded,
            balanceAfter: (user.creditsBalance || 0) - creditsNeeded,
            metadata: { reservationId: reservation.id, euroPerCredit },
            idempotencyKey: idemKey || null,
          }
        });

        // Outbox para downstream
        await tx.outboxEvent.create({
          data: {
            eventType: 'CREDITS_DEBITED',
            eventData: { reservationId: reservation.id, userId: finalUserId, credits: creditsNeeded, euroPerCredit } as any,
          }
        });
      });
    }

    return NextResponse.json(
      {
        message: 'Reserva creada exitosamente',
        reservation,
      },
      { status: 201 }
    );
  } catch (error) {
    // 🔍 LOGGING PROFESIONAL PARA DEBUGGING
    console.error('🚨 [RESERVATIONS-API] Error creando reserva:', {
      error: {
        message: error instanceof Error ? error.message : 'Error desconocido',
        name: error instanceof Error ? error.name : 'Unknown',
        stack: error instanceof Error ? error.stack : undefined,
        code: (error as any)?.code,
        meta: (error as any)?.meta,
        cause: (error as any)?.cause
      },
      userId: finalUserId || 'undefined',
      timestamp: new Date().toISOString(),
      requestData: {
        courtId: body?.courtId || 'undefined',
        startTime: body?.startTime || 'undefined',
        duration: body?.duration || 'undefined',
        hasNotes: !!body?.notes
      }
    });
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Parámetros inválidos', details: error.errors },
        { status: 400 }
      );
    }
    
    if (error instanceof Error) {
      // 🔒 Errores específicos del negocio
      if (error.message.includes('no disponible') || 
          error.message.includes('no está disponible') ||
          error.message.includes('mantenimiento')) {
        return NextResponse.json(
          { error: error.message },
          { status: 409 } // Conflict
        );
      }
      
      // 🚨 MANEJO ESPECÍFICO DEL ERROR DE CONFLICTO DE USUARIO
      if (error.message.includes('usuario ya tiene') || 
          error.message.includes('ya tiene una reserva')) {
        return NextResponse.json(
          { error: error.message },
          { status: 409 } // Conflict
        );
      }
      
      // 💳 Errores de créditos
      if (error.message.includes('créditos') || 
          error.message.includes('saldo') ||
          error.message.includes('insuficiente')) {
        return NextResponse.json(
          { error: error.message },
          { status: 402 } // Payment Required
        );
      }
      
      // 🏟️ Errores de cancha
      if (error.message.includes('cancha') || 
          error.message.includes('court')) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 } // Bad Request
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
  })(request);
}