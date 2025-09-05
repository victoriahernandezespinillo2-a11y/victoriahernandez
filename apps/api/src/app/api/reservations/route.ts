import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@repo/auth';
import { reservationService } from '../../../lib/services/reservation.service';
import AuthService from '../../../lib/services/auth.service';
import { z } from 'zod';
import { db } from '@repo/db';
import { withReservationMiddleware, ApiResponse } from '@/lib/middleware';

// FunciÃ³n de autenticaciÃ³n simplificada
async function getAuthenticatedUser(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return null;
    }
    return session.user;
  } catch (error) {
    console.error('âŒ [AUTH] Error en autenticaciÃ³n:', error);
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
  paymentMethod: z.enum(['stripe', 'redsys', 'redsys_bizum', 'credits']).optional(),
  notes: z.string().optional(),
  // Si la cancha es multiuso, sport es obligatorio
  sport: z.string().optional(),
});

// Esquema para filtros de bÃºsqueda (acepta IDs genÃ©ricos)
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
  return withReservationMiddleware(async (req: NextRequest) => {
    // Declarar finalUserId al inicio para evitar errores de referencia
    let finalUserId: string | undefined;
    
    try {
      // 1) Intentar con usuario provisto por middleware (JWT Bearer)
      const contextUser = (req as any).user;
      let session: any = contextUser ? { id: contextUser.id, email: contextUser.email } : null;

      // 2) Si no hay usuario en contexto, intentar con NextAuth
      if (!session) {
        session = await getAuthenticatedUser(req);
      }

      if (!session?.id) {
        return NextResponse.json(
          { error: 'No autorizado' },
          { status: 401 }
        );
      }
    // Alinear ID de sesiÃ³n con usuario real en BD (autoprovisionado por OAuth)
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
      // continuar con el ID de sesiÃ³n si falla la comprobaciÃ³n
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
    
    // Delegar a UserService que ya estÃ¡ probado en /api/users/reservations
    const { UserService } = await import('../../../lib/services/user.service');
    const userService = new UserService();
    const result = await userService.getUserReservations(finalUserId, {
      page: validatedParams.page,
      limit: validatedParams.limit,
      status: filters.status,
      startDate: filters.startDate,
      endDate: filters.endDate,
    });

    return ApiResponse.success(result);
  } catch (error) {
    console.error('Error obteniendo reservas:', error);
    // Soporte de depuraciÃ³n: si ?debug=1 incluir detalles en la respuesta
    const debug = request.nextUrl.searchParams.get('debug');
    if (debug) {
      return NextResponse.json(
        { success: false, error: (error as any)?.message || 'Error', stack: (error as any)?.stack },
        { status: 500 }
      );
    }
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'ParÃ¡metros invÃ¡lidos', details: error.errors },
        { status: 400 }
      );
    }
    
    return ApiResponse.internalError('Error interno del servidor');
  }
  })(request);
}

/**
 * POST /api/reservations
 * Crear nueva reserva
 */
export async function POST(request: NextRequest) {
  return withReservationMiddleware(async (req: NextRequest) => {
    // Declarar finalUserId al inicio para evitar errores de referencia
  let finalUserId: string | undefined;
  let body: any;
  
  try {
      // 1) Intentar con usuario provisto por middleware (JWT Bearer)
      const contextUser = (req as any).user;
      let session: any = contextUser ? { id: contextUser.id, email: contextUser.email } : null;

      // 2) Si no hay usuario en contexto, intentar con NextAuth
      if (!session) {
        session = await getAuthenticatedUser(req);
      }

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
      // Si algo falla en la comprobaciÃ³n/creaciÃ³n, continuamos y dejaremos que Prisma reporte con claridad
    }

    body = await req.json();
    console.log('ðŸ” [RESERVATION-DEBUG] Datos recibidos:', {
      body,
      finalUserId,
      session: session?.email
    });
    
    const validatedData = CreateReservationSchema.parse(body);
    console.log('âœ… [RESERVATION-DEBUG] Datos validados:', validatedData);
    
    // Mapear mÃ©todo de pago para persistencia
    const mappedPaymentMethod = validatedData.paymentMethod === 'redsys_bizum'
      ? 'redsys'
      : validatedData.paymentMethod === 'redsys'
        ? 'redsys'
        : validatedData.paymentMethod || undefined;

    // Validación multiuso: si la cancha es multiuso, sport debe estar en allowedSports
    const court = await db.court.findUnique({
      where: { id: validatedData.courtId },
      select: { isMultiuse: true, allowedSports: true }
    });
    if (!court) {
      return NextResponse.json({ error: 'Cancha no encontrada' }, { status: 404 });
    }
    if (court.isMultiuse) {
      const sport = (validatedData.sport || '').trim();
      if (!sport) {
        return NextResponse.json({ error: 'Debe seleccionar un deporte para esta cancha multiuso' }, { status: 400 });
      }
      if (!Array.isArray(court.allowedSports) || court.allowedSports.length === 0) {
        return NextResponse.json({ error: 'Configuración inválida: la cancha multiuso no tiene deportes permitidos' }, { status: 400 });
      }
      if (!court.allowedSports.includes(sport)) {
        return NextResponse.json({ error: 'El deporte seleccionado no está permitido para esta cancha' }, { status: 400 });
      }
    }

    let reservation = await reservationService.createReservation({
      ...validatedData,
      paymentMethod: mappedPaymentMethod,
      userId: finalUserId,
    });
    console.log('ðŸŽ‰ [RESERVATION-DEBUG] Reserva creada exitosamente:', reservation.id);

    // Si el mÃ©todo de pago solicitado es 'credits', realizar cargo de crÃ©ditos y marcar como pagado
    if (validatedData.paymentMethod === 'credits') {
      // Obtener configuraciÃ³n euroPerCredit desde el centro de la cancha
      const court = await db.court.findUnique({
        where: { id: reservation.courtId },
        include: { center: true },
      });
      const settings: any = (court as any)?.center?.settings || {};
      const creditsCfg: any = settings.credits || {};
      const euroPerCredit: number | undefined = typeof creditsCfg.euroPerCredit === 'number' ? creditsCfg.euroPerCredit : undefined;
      if (!euroPerCredit || euroPerCredit <= 0) {
        return NextResponse.json(
          { error: 'ConfiguraciÃ³n de crÃ©ditos no definida en el centro' },
          { status: 400 }
        );
      }

      const amount = Number(reservation.totalPrice || 0);
      const creditsNeeded = Math.ceil(amount / euroPerCredit);

      // Idempotency-Key para evitar dobles cargos
      const idemKey = request.headers.get('Idempotency-Key') || undefined;

      // TransacciÃ³n atÃ³mica: validar saldo, debitar, actualizar reserva, registrar ledger y outbox
      await (db as any).$transaction(async (tx: any) => {
        // Idempotencia: si ya existe movimiento con el mismo idempotencyKey, no repetir
        if (idemKey) {
          const existing = await tx.walletLedger.findUnique({ where: { idempotency_key: idemKey } }).catch(() => null);
          if (existing) {
            // En caso idempotente, asegurar que la reserva estÃ© marcada pagada
            await tx.reservation.update({ where: { id: reservation.id }, data: { status: 'PAID', paymentMethod: 'CREDITS' } });
            return;
          }
        }

        const user = await tx.user.findUnique({ where: { id: finalUserId }, select: { creditsBalance: true } });
        if (!user) throw new Error('Usuario no encontrado');
        if ((user.creditsBalance || 0) < creditsNeeded) {
          throw new Error('Saldo de crÃ©ditos insuficiente');
        }

        await tx.user.update({ where: { id: finalUserId }, data: { creditsBalance: { decrement: creditsNeeded } } });
        await tx.reservation.update({ where: { id: reservation.id }, data: { status: 'PAID', paymentMethod: 'CREDITS' } });

        await tx.walletLedger.create({
          data: {
            userId: finalUserId!,
            reservationId: reservation.id,
            amount: -creditsNeeded,
            type: 'DEBIT',
            description: 'Pago de reserva con crÃ©ditos',
            idempotency_key: idemKey,
          }
        });

        await tx.outboxEvent.create({
          data: {
            type: 'reservation_paid',
            payload: {
              reservationId: reservation.id,
              userId: finalUserId,
              amount,
              creditsUsed: creditsNeeded,
              paymentMethod: 'CREDITS'
            },
          }
        });
      });
    }

    return ApiResponse.success({ reservation }, 201);
  } catch (error) {
    console.error('ðŸš¨ [RESERVATION-DEBUG] Error detallado:', {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      body,
      finalUserId,
      validationStep: 'En createReservation'
    });

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos invÃ¡lidos', details: error.errors },
        { status: 400 }
      );
    }

    // Mapear errores de negocio conocidos a 409 Conflict
    const message = (error as Error)?.message || '';
    const conflictPhrases = [
      'Horario no disponible',
      'El usuario ya tiene una reserva',
      'Cancha en mantenimiento',
      'El horario estÃ¡ siendo procesado'
    ];
    if (conflictPhrases.some((m) => message.includes(m))) {
      return NextResponse.json(
        { error: message || 'Conflicto al crear la reserva' },
        { status: 409 }
      );
    }

    return ApiResponse.internalError('Error interno del servidor');
  }
  })(request);
}
