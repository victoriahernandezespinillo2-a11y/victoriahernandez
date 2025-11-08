/**
 * API Routes para gestión de reservas desde administración
 * GET /api/admin/reservations - Listar reservas con filtros y paginación
 */

import { NextRequest } from 'next/server';
import { withAdminMiddleware, ApiResponse } from '@/lib/middleware';
import { db } from '@repo/db';
import { ledgerService } from '@/lib/services/ledger.service';
import { z } from 'zod';
import { reservationService } from '@/lib/services/reservation.service';
import { emailService } from '@repo/notifications';
import { AutoCompleteService } from '@/lib/services/auto-complete.service';
import { 
  AdminPaymentMethodSchema, 
  PricingOverrideSchema,
  validatePriceOverride 
} from '@/lib/validators/reservation.validator';

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
  // Campo de fecha a considerar para el filtrado temporal. Por defecto startTime para coherencia con los reportes
  dateField: z.enum(['startTime','createdAt']).optional().default('startTime'),
});

export async function GET(request: NextRequest) {
  return withAdminMiddleware(async (req) => {
    try {
      // Marcación oportunista de NO_SHOW: idempotente, rápida y segura
      try {
        const now = new Date();
        const graceMin = Math.max(0, Number(process.env.NO_SHOW_GRACE_MINUTES || '5'));
        const cutoff = new Date(now.getTime() - graceMin * 60000);
        await db.reservation.updateMany({
          where: { endTime: { lt: cutoff }, checkInTime: null, status: { in: ['PENDING','PAID'] as any } },
          data: { status: 'NO_SHOW' as any },
        });
      } catch {}

      // ✅ AUTO-COMPLETAR: Marcar como COMPLETED las reservas que ya terminaron
      try {
        await AutoCompleteService.autoCompleteExpiredReservations();
      } catch (error) {
        console.warn('Auto-complete error (non-critical):', error);
      }

      const { searchParams } = req.nextUrl;
      console.log('Admin reservations request params:', Object.fromEntries(searchParams.entries()));
      
      let params;
      try {
        params = GetAdminReservationsSchema.parse(Object.fromEntries(searchParams.entries()));
      } catch (error) {
        console.error('Error parsing admin reservations params:', error);
        return ApiResponse.validation([{ field: 'params', message: 'Parámetros de consulta inválidos' }]);
      }

      const skip = (params.page - 1) * params.limit;

      const where: any = {};
      if (params.status) where.status = params.status;
      if (params.userId) where.userId = params.userId;
      if (params.courtId) where.courtId = params.courtId;
      if (params.centerId) where.court = { is: { centerId: params.centerId } };
      if (params.startDate || params.endDate) {
        const field = params.dateField || 'startTime';
        const range: any = {};
        if (params.startDate) {
          const gte = new Date(params.startDate);
          gte.setHours(0, 0, 0, 0);
          range.gte = gte;
        }
        if (params.endDate) {
          const lte = new Date(params.endDate);
          lte.setHours(23, 59, 59, 999);
          range.lte = lte;
        }
        (where as any)[field] = range;
      }
      if (params.search) {
        const q = params.search;
        where.OR = [
          { notes: { contains: q, mode: 'insensitive' } },
          { user: { is: { email: { contains: q, mode: 'insensitive' } } } },
          { court: { is: { name: { contains: q, mode: 'insensitive' } } } },
        ];
      }

      console.log('Admin reservations query where:', JSON.stringify(where, null, 2));
      console.log('Admin reservations query params:', { skip, limit: params.limit, sortBy: params.sortBy, sortOrder: params.sortOrder });

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
          // Asegurar que se incluyan todos los campos, incluyendo promoCode y promoDiscount
        }),
        db.reservation.count({ where }),
      ]);

      console.log('Admin reservations query results:', { itemsCount: items.length, total });

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

      // Detectar si existe un pago registrado (PAYMENT_RECORDED o RESERVATION_PAID)
      const paymentEvents = await db.outboxEvent.findMany({
        where: {
          eventType: { in: ['PAYMENT_RECORDED','RESERVATION_PAID'] },
        },
        select: { eventData: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      }).catch(() => [] as any[]);
      const hasPaymentMap = new Set<string>();
      for (const ev of paymentEvents as any[]) {
        const rid = ev?.eventData?.reservationId as string | undefined;
        if (rid && idsSet.has(rid)) hasPaymentMap.add(rid);
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
        startTime: new Date(r.startTime).toLocaleTimeString('es-ES', { 
          hour: '2-digit', 
          minute: '2-digit',
          timeZone: 'Europe/Madrid'
        }),
        endTime: new Date(r.endTime).toLocaleTimeString('es-ES', { 
          hour: '2-digit', 
          minute: '2-digit',
          timeZone: 'Europe/Madrid'
        }),
        duration: Math.max(0, Math.round((r.endTime.getTime() - r.startTime.getTime()) / (60 * 60 * 1000))),
        totalAmount: Number(r.totalPrice || 0),
        status: r.status as any,
        paymentStatus: refundedIds.has(r.id)
          ? 'REFUNDED'
          : (r.status === 'PAID' || hasPaymentMap.has(r.id) ? 'PAID' : 'PENDING'),
        paymentMethod: (r as any).paymentMethod || null,
        promoCode: (r as any).promoCode || null,
        promoDiscount: (r as any).promoDiscount || null,
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
        console.error('Zod validation error in admin reservations:', error.errors);
        return ApiResponse.validation(
          error.errors.map((err) => ({ field: err.path.join('.'), message: err.message }))
        );
      }
      
      console.error('Error in admin reservations GET:', error);
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      
      // Proporcionar más información del error
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      return ApiResponse.internalError(`Error interno del servidor: ${errorMessage}`);
    }
  })(request);
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
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
  pricingOverride: PricingOverrideSchema.optional(),
  payment: z.object({
    method: AdminPaymentMethodSchema.default('CASH'),
    amount: z.number().min(0).optional(),
    reason: z.string().optional(),
    details: z.record(z.any()).optional(),
    sendEmail: z.boolean().optional(),
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
            select: { id: true, email: true, name: true },
          });
          userId = created.id;

          // Enviar correo de bienvenida para usuarios nuevos creados por admin
          if (created.email && created.email !== `${crypto.randomUUID()}@placeholder.local`) {
            try {
              const { NotificationService } = await import('@repo/notifications');
              const notificationService = new NotificationService();
              
              await notificationService.sendEmailTemplate('welcome', created.email, {
                name: created.name || created.email?.split('@')[0] || 'Usuario'
              });
              
              console.log(`Correo de bienvenida enviado a usuario creado por admin: ${created.email}`);
            } catch (emailError) {
              console.error('Error enviando correo de bienvenida:', emailError);
              // No fallar la creación por error en el correo
            }
          }
        }
      }

      // 2) Crear reserva usando el servicio (valida disponibilidad y calcula precio)
      // NOTA: Para reservas manuales de admin, el paymentMethod se procesa DESPUÉS de crear la reserva
      // Por lo tanto, omitimos el campo paymentMethod en la creación inicial
      let reservation = await reservationService.createReservation({
        courtId: input.courtId,
        userId,
        startTime: input.startTime,
        duration: input.duration,
        isRecurring: false, // Las reservas manuales de admin no son recurrentes
        notes: input.notes,
        // paymentMethod se omite intencionalmente - se procesa en el paso 3
      });

      // Aplicar override de precio si corresponde (solo Admin: protegido por withAdminMiddleware)
      if (input.pricingOverride) {
        const oldTotal = Number(reservation.totalPrice || 0);
        const delta = input.pricingOverride.amount;
        
        // Validación robusta usando función centralizada
        const validation = validatePriceOverride(delta, oldTotal);
        
        if (!validation.isValid) {
          console.error('[PRICE_OVERRIDE] Validación fallida:', {
            reservationId: reservation.id,
            oldTotal,
            delta,
            error: validation.error,
            details: validation.details
          });
          return ApiResponse.forbidden(validation.error || 'Override supera el límite permitido');
        }
        
        // Logging detallado para auditoría
        console.log('[PRICE_OVERRIDE] Aplicando override:', {
          reservationId: reservation.id,
          oldTotal,
          delta,
          newTotal: oldTotal + delta,
          reason: input.pricingOverride.reason,
          percentageApplied: validation.details?.percentageApplied,
          timestamp: new Date().toISOString()
        });
        
        reservation = await db.reservation.update({
          where: { id: reservation.id },
          data: { totalPrice: oldTotal + delta },
        });
        
        // Registrar evento de auditoría con detalles completos
        await db.outboxEvent.create({
          data: { 
            eventType: 'PRICE_OVERRIDE', 
            eventData: { 
              reservationId: reservation.id, 
              delta, 
              reason: input.pricingOverride.reason,
              oldTotal,
              newTotal: oldTotal + delta,
              percentageApplied: validation.details?.percentageApplied,
              timestamp: new Date().toISOString()
            } as any 
          },
        });
      }

      // 3) Procesar pago según método (CASH/TPV/TRANSFER/COURTESY/CREDITS/LINK)
      const method = input.payment?.method || 'CASH';
      const amount = Number(reservation.totalPrice || 0);
      const finalizeAsPaid = async (pm: string) => {
        await db.reservation.update({ where: { id: reservation.id }, data: { paymentStatus: 'PAID' as any, paidAt: new Date(), paymentMethod: pm } });
        await db.outboxEvent.create({ data: { eventType: 'PAYMENT_RECORDED', eventData: { reservationId: reservation.id, userId, method: pm, amount, details: input.payment?.details } as any } });
        try {
          const ledgerMethod = pm === 'TPV' ? 'CARD' : pm;
          await ledgerService.recordPayment({
            paymentStatus: 'PAID',
            sourceType: 'RESERVATION',
            sourceId: reservation.id,
            direction: 'CREDIT',
            amountEuro: amount,
            currency: 'EUR',
            method: ledgerMethod as any,
            paidAt: new Date(),
            idempotencyKey: `MANUAL:${reservation.id}:${ledgerMethod}`,
            metadata: { admin: true, details: input.payment?.details }
          });
        } catch (e) {
          // No bloquear el flujo administrativo por error contable; quedará para reconciliación
          console.warn('Ledger recordPayment failed (manual reservation):', e);
        }
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
          const creditsNeededRaw = amount / euroPerCredit;
          const creditsNeeded = Number(creditsNeededRaw.toFixed(6));
          if (!Number.isFinite(creditsNeeded) || creditsNeeded <= 0) {
            return ApiResponse.badRequest('Monto inválido para el cobro en créditos');
          }
          await db.$transaction(async (tx: any) => {
            const user = await tx.user.findUnique({ where: { id: userId }, select: { creditsBalance: true } });
            if (!user) throw new Error('Usuario no encontrado');
            if (Number(user.creditsBalance || 0) < creditsNeeded) {
              throw new Error('Saldo de créditos insuficiente');
            }
            await tx.user.update({ where: { id: userId }, data: { creditsBalance: { decrement: creditsNeeded } } });
            await tx.reservation.update({ where: { id: reservation.id }, data: { status: 'PAID' as any, paymentMethod: 'CREDITS' } });
            await tx.outboxEvent.create({ data: { eventType: 'CREDITS_DEBITED', eventData: { reservationId: reservation.id, userId, credits: creditsNeeded, euroPerCredit, amountEuro: amount } as any } });
          });
          break;
        }
        case 'LINK': {
          // ya se maneja más abajo (generación de enlace), no marcar como pagado
          break;
        }
      }

      let paymentLinkUrl: string | undefined;

      // 4) Si el método es LINK, generar enlace de pago (Redsys redirect) y enviar por email
  if (input.payment?.method === 'LINK') {
        const amountDue = Number(reservation.totalPrice || 0);
        // Reglas: no generar si importe 0 o estado incompatible o ya hay pago
        const blockedStatuses = new Set(['PAID','COMPLETED','CANCELLED']);
        if (blockedStatuses.has((reservation.status as any) || '')) {
          return ApiResponse.badRequest('La reserva no admite enlace de pago en su estado actual');
        }
        if (!(amountDue > 0)) {
          return ApiResponse.badRequest('La reserva no tiene importe a cobrar');
        }
    const existingPayment = await db.outboxEvent.findFirst({
          where: {
            eventType: { in: ['PAYMENT_RECORDED','RESERVATION_PAID'] },
            eventData: { path: ['reservationId'], equals: reservation.id } as any,
          },
        } as any);
        if (existingPayment) {
          return ApiResponse.badRequest('La reserva ya tiene un pago registrado');
        }

        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001';
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';
        const redirectUrl = `${apiUrl}/api/payments/redsys/redirect?rid=${encodeURIComponent(reservation.id)}`;
    paymentLinkUrl = redirectUrl;
        await db.outboxEvent.create({
          data: {
            eventType: 'PAYMENT_LINK_CREATED',
            eventData: {
              reservationId: reservation.id,
              provider: 'redsys',
              amount: amountDue,
              url: redirectUrl,
              successUrl: `${appUrl}/dashboard/reservations/success?reservationId=${reservation.id}`,
              cancelUrl: `${appUrl}/dashboard/reservations`,
            } as any,
          },
        });

    const user = await db.user.findUnique({ where: { id: userId } });
    const shouldSendEmail = !!input.payment?.sendEmail;
    if (shouldSendEmail && user?.email && paymentLinkUrl) {
      await emailService.sendEmail({
        to: user.email,
        subject: 'Enlace de pago de tu reserva',
        html: `<p>Hola ${user.name || ''},</p><p>Puedes completar el pago de tu reserva haciendo clic en el siguiente enlace:</p><p><a href="${paymentLinkUrl}">Pagar ahora</a></p>`,
      });
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

      // Mapear errores de negocio comunes a respuestas claras
      const businessErrors = [
        'Horario no disponible',
        'Saldo de créditos insuficiente',
        'Cancha en mantenimiento durante el horario solicitado',
        'El deporte seleccionado no está permitido',
      ];

      if (error instanceof Error && businessErrors.includes(error.message)) {
        return ApiResponse.badRequest(error.message);
      }

      // Registrar stack para debugging
      console.error('Error creando reserva manual:', error instanceof Error ? error.stack : error);

      // En entorno de desarrollo, devolver el mensaje para depuración
      if (process.env.NODE_ENV !== 'production') {
        return ApiResponse.internalError(error instanceof Error ? error.message : 'Error interno del servidor');
      }

      return ApiResponse.internalError('Error interno del servidor');
    }
  })(request);
}


