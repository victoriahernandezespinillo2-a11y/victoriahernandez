/**
 * API Routes para gestión de reservas desde administración
 * GET /api/admin/reservations - Listar reservas con filtros y paginación
 */

import { NextRequest } from 'next/server';
import { withAdminMiddleware, ApiResponse } from '@/lib/middleware';
import { db } from '@repo/db';
import { z } from 'zod';
import { reservationService } from '@/lib/services/reservation.service';
import { stripeService } from '@repo/payments';
import { emailService } from '@repo/notifications';

const GetAdminReservationsSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(500).optional().default(50),
  status: z.enum(['PENDING','PAID','IN_PROGRESS','COMPLETED','CANCELLED','NO_SHOW']).optional(),
  userId: z.string().optional(),
  courtId: z.string().optional(),
  centerId: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  search: z.string().optional(),
  sortBy: z.enum(['createdAt','startTime','endTime','status']).optional().default('createdAt'),
  sortOrder: z.enum(['asc','desc']).optional().default('desc'),
});

export async function GET(request: NextRequest) {
  return withAdminMiddleware(async (req) => {
    try {
      const { searchParams } = req.nextUrl;
      const params = GetAdminReservationsSchema.parse(Object.fromEntries(searchParams.entries()));

      const skip = (params.page - 1) * params.limit;

      const where: any = {};
      if (params.status) where.status = params.status;
      if (params.userId) where.userId = params.userId;
      if (params.courtId) where.courtId = params.courtId;
      if (params.centerId) where.court = { is: { centerId: params.centerId } };
      if (params.startDate || params.endDate) {
        where.createdAt = {} as any;
        if (params.startDate) (where.createdAt as any).gte = new Date(params.startDate);
        if (params.endDate) (where.createdAt as any).lte = new Date(params.endDate);
      }
      if (params.search) {
        const q = params.search;
        where.OR = [
          { notes: { contains: q, mode: 'insensitive' } },
          { user: { is: { email: { contains: q, mode: 'insensitive' } } } },
          { court: { is: { name: { contains: q, mode: 'insensitive' } } } },
        ];
      }

      const [items, total] = await Promise.all([
        db.reservation.findMany({
          where,
          skip,
          take: params.limit,
          orderBy: { [params.sortBy]: params.sortOrder },
          include: {
            user: { select: { id: true, name: true, email: true } },
            court: { select: { id: true, name: true, center: { select: { id: true, name: true } } } },
          },
        }),
        db.reservation.count({ where }),
      ]);

      // Detectar reembolsos recientes por reservationId a partir de outbox
      const idsSet = new Set(items.map((r: any) => r.id));
      const refundedEvents = await db.outboxEvent.findMany({
        where: { eventType: 'RESERVATION_REFUNDED' },
        select: { eventData: true },
        orderBy: { createdAt: 'desc' },
      }).catch(() => []);
      const refundedIds = new Set<string>();
      for (const ev of refundedEvents as any[]) {
        const rid = ev?.eventData?.reservationId as string | undefined;
        if (rid && idsSet.has(rid)) refundedIds.add(rid);
      }

      // Detectar overrides de precio (tomar el más reciente por reserva)
      const overrideEvents = await db.outboxEvent.findMany({
        where: { eventType: 'PRICE_OVERRIDE' },
        select: { eventData: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      }).catch(() => []);
      const overrideMap = new Map<string, { delta: number; reason?: string }>();
      for (const ev of overrideEvents as any[]) {
        const rid = ev?.eventData?.reservationId as string | undefined;
        if (!rid) continue;
        if (!idsSet.has(rid)) continue;
        if (!overrideMap.has(rid)) {
          overrideMap.set(rid, { delta: Number(ev?.eventData?.delta || 0), reason: ev?.eventData?.reason });
        }
      }

      const mapped = items.map((r: any) => ({
        id: r.id,
        userId: r.userId,
        userName: r.user?.name || 'Usuario',
        userEmail: r.user?.email || '',
        courtId: r.courtId,
        courtName: r.court?.name || '',
        centerName: r.court?.center?.name || '',
        date: r.startTime.toISOString().split('T')[0],
        startTime: new Date(r.startTime).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
        endTime: new Date(r.endTime).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
        duration: Math.max(0, Math.round((r.endTime.getTime() - r.startTime.getTime()) / (60 * 60 * 1000))),
        totalAmount: Number(r.totalPrice || 0),
        status: r.status as any,
        paymentStatus: refundedIds.has(r.id) ? 'REFUNDED' : (r.status === 'PAID' ? 'PAID' : 'PENDING'),
        paymentMethod: (r as any).paymentMethod || null,
        override: overrideMap.get(r.id) || null,
        notes: r.notes || undefined,
        createdAt: r.createdAt,
      }));

      return ApiResponse.success({
        data: mapped,
        pagination: {
          page: params.page,
          limit: params.limit,
          total,
          pages: Math.ceil(total / params.limit),
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return ApiResponse.validation(
          error.errors.map((err) => ({ field: err.path.join('.'), message: err.message }))
        );
      }
      console.error('Error admin reservations:', error);
      return ApiResponse.internalError('Error interno del servidor');
    }
  })(request, {} as any);
}

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
 * POST /api/admin/reservations
 * Crear reserva manual (soporta usuario existente o alta rápida)
 */
const ManualReservationSchema = z.object({
  userId: z.string().optional(),
  newUser: z.object({
    name: z.string().min(2),
    email: z.string().email().optional(),
    phone: z.string().optional(),
  }).partial().refine((val) => !!(val.email || val.phone), { message: 'Email o teléfono requerido' }).optional(),
  courtId: z.string(),
  startTime: z.string().datetime(),
  duration: z.number().min(30).max(480),
  notes: z.string().optional(),
  pricingOverride: z.object({ amount: z.number().min(-100000).max(100000), reason: z.string().min(5) }).optional(),
  payment: z.object({
    method: z.enum(['CASH','TPV','TRANSFER','CREDITS','COURTESY','LINK']).default('CASH'),
    amount: z.number().min(0).optional(),
    reason: z.string().optional(),
    details: z.record(z.any()).optional(),
  }).optional(),
  sendNotifications: z.boolean().optional().default(true),
});

export async function POST(request: NextRequest) {
  return withAdminMiddleware(async (req) => {
    try {
      const body = await req.json();
      const input = ManualReservationSchema.parse(body);

      // 1) Resolver usuario
      let userId = input.userId || '';
      if (!userId) {
        // deduplicar por email o teléfono
        let existing = null as any;
        if (input.newUser?.email) {
          existing = await db.user.findUnique({ where: { email: input.newUser.email } });
        }
        if (!existing && input.newUser?.phone) {
          existing = await db.user.findFirst({ where: { phone: input.newUser.phone } });
        }
        if (existing) {
          userId = existing.id;
        } else {
          const created = await db.user.create({
            data: {
              email: input.newUser?.email || `${crypto.randomUUID()}@placeholder.local`,
              name: input.newUser?.name || 'Invitado',
              phone: input.newUser?.phone || null,
              role: 'USER',
              isActive: true,
              emailVerified: !!input.newUser?.email,
            },
            select: { id: true },
          });
          userId = created.id;
        }
      }

      // 2) Crear reserva usando el servicio (valida disponibilidad y calcula precio)
      let reservation = await reservationService.createReservation({
        courtId: input.courtId,
        userId,
        startTime: input.startTime,
        duration: input.duration,
        notes: input.notes,
        paymentMethod: undefined as any,
      } as any);

      // Aplicar override de precio si corresponde (solo Admin: protegido por withAdminMiddleware)
      if (input.pricingOverride) {
        const maxPercent = Number(process.env.MAX_PRICE_OVERRIDE_PERCENT || '20');
        const oldTotal = Number(reservation.totalPrice || 0);
        const delta = input.pricingOverride.amount;
        if (Math.abs(delta) > (oldTotal * maxPercent) / 100) {
          return ApiResponse.forbidden('Override supera el límite permitido');
        }
        reservation = await db.reservation.update({
          where: { id: reservation.id },
          data: { totalPrice: oldTotal + delta },
        });
        await db.outboxEvent.create({
          data: { eventType: 'PRICE_OVERRIDE', eventData: { reservationId: reservation.id, delta, reason: input.pricingOverride.reason } as any },
        });
      }

      // 3) Procesar pago según método (CASH/TPV/TRANSFER/COURTESY/CREDITS/LINK)
      const method = input.payment?.method || 'CASH';
      const amount = Number(reservation.totalPrice || 0);
      const finalizeAsPaid = async (pm: string) => {
        await db.reservation.update({ where: { id: reservation.id }, data: { status: 'PAID' as any, paymentMethod: pm } });
        await db.outboxEvent.create({ data: { eventType: 'PAYMENT_RECORDED', eventData: { reservationId: reservation.id, userId, method: pm, amount, details: input.payment?.details } as any } });
      };

      switch (method) {
        case 'CASH': {
          await finalizeAsPaid('CASH');
          break;
        }
        case 'TPV': {
          if (!input.payment?.details?.authCode) {
            // Aceptamos sin authCode, pero recomendamos enviarlo
          }
          await finalizeAsPaid('TPV');
          break;
        }
        case 'TRANSFER': {
          await finalizeAsPaid('TRANSFER');
          break;
        }
        case 'COURTESY': {
          const reason = (input.payment?.reason || '').trim();
          if (!reason) return ApiResponse.badRequest('La cortesía requiere motivo');
          await finalizeAsPaid('COURTESY');
          await db.outboxEvent.create({ data: { eventType: 'COURTESY_GRANTED', eventData: { reservationId: reservation.id, userId, reason } as any } });
          break;
        }
        case 'CREDITS': {
          // Deducción de créditos: requiere configuración del centro
          const court = await db.court.findUnique({ where: { id: input.courtId }, include: { center: true } });
          const settings: any = (court?.center as any)?.settings || {};
          const creditsCfg: any = settings.credits || {};
          const euroPerCredit: number | undefined = typeof creditsCfg.euroPerCredit === 'number' ? creditsCfg.euroPerCredit : undefined;
          if (!euroPerCredit || euroPerCredit <= 0) {
            return ApiResponse.badRequest('Configuración de créditos no definida en el centro');
          }
          const creditsNeeded = Math.ceil(amount / euroPerCredit);
          await db.$transaction(async (tx: any) => {
            const user = await tx.user.findUnique({ where: { id: userId }, select: { creditsBalance: true } });
            if (!user) throw new Error('Usuario no encontrado');
            if ((user.creditsBalance || 0) < creditsNeeded) {
              throw new Error('Saldo de créditos insuficiente');
            }
            await tx.user.update({ where: { id: userId }, data: { creditsBalance: { decrement: creditsNeeded } } });
            await tx.reservation.update({ where: { id: reservation.id }, data: { status: 'PAID' as any, paymentMethod: 'CREDITS' } });
            await tx.outboxEvent.create({ data: { eventType: 'CREDITS_DEBITED', eventData: { reservationId: reservation.id, userId, credits: creditsNeeded, euroPerCredit } as any } });
          });
          break;
        }
        case 'LINK': {
          // ya se maneja más abajo (generación de enlace), no marcar como pagado
          break;
        }
      }

      let paymentLinkUrl: string | undefined;

      // 4) Si el método es LINK, generar enlace de pago y enviar por email
      if (input.payment?.method === 'LINK') {
        try {
          const amount = Number(reservation.totalPrice || 0);
          const successUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'}/payments/success?rid=${reservation.id}`;
          const cancelUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'}/payments/cancel?rid=${reservation.id}`;
          const session = await stripeService.createCheckoutSession({
            amount,
            currency: 'eur',
            successUrl,
            cancelUrl,
            metadata: { reservationId: reservation.id },
            description: `Reserva ${reservation.courtId}`,
          });
          paymentLinkUrl = session.url || undefined;
          await db.outboxEvent.create({ data: { eventType: 'PAYMENT_LINK_CREATED', eventData: { reservationId: reservation.id, sessionId: session.id, url: paymentLinkUrl } as any } });

          // Enviar por email si hay correo del usuario
          const user = await db.user.findUnique({ where: { id: userId } });
          if (user?.email && paymentLinkUrl) {
            await emailService.sendEmail({
              to: user.email,
              subject: 'Enlace de pago de tu reserva',
              html: `<p>Hola ${user.name || ''},</p><p>Puedes completar el pago de tu reserva haciendo clic en el siguiente enlace:</p><p><a href="${paymentLinkUrl}">Pagar ahora</a></p>`,
            });
          }
        } catch (e) {
          console.warn('No se pudo generar/enviar enlace de pago:', e);
        }
      }

      // 5) Notificaciones básicas (deferred via outbox)
      if (input.sendNotifications) {
        try {
          await db.outboxEvent.create({
            data: {
              eventType: 'RESERVATION_CONFIRMATION_REQUESTED',
              eventData: { reservationId: reservation.id, userId },
            },
          });
        } catch (e) {
          console.warn('No se pudo encolar notificación de confirmación:', e);
        }
      }

      return ApiResponse.success({ id: reservation.id, paymentLinkUrl }, 201);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return ApiResponse.validation(
          error.errors.map((err) => ({ field: err.path.join('.'), message: err.message }))
        );
      }
      console.error('Error creando reserva manual:', error);
      return ApiResponse.internalError('Error interno del servidor');
    }
  })(request, {} as any);
}


