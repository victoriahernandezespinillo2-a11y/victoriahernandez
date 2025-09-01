/**
 * Servicio de gestión de membresías
 * Maneja suscripciones, beneficios, renovaciones y estadísticas de membresías
 */

import { db, Membership, User } from '@repo/db';
import { z } from 'zod';
import { NotificationService } from '@repo/notifications';
import PaymentService from './payment.service';

// Esquemas de validación
export const CreateMembershipSchema = z.object({
  userId: z.string().uuid('ID de usuario inválido'),
  type: z.enum(['BASIC', 'PREMIUM', 'VIP'], { errorMap: () => ({ message: 'Tipo de membresía inválido' }) }),
  startDate: z.string().datetime('Fecha de inicio inválida').optional(),
  duration: z.number().min(1, 'La duración debe ser al menos 1 mes').max(24, 'La duración máxima es 24 meses').default(1),
  paymentMethod: z.enum(['STRIPE', 'REDSYS', 'CASH', 'TRANSFER']).default('STRIPE'),
  autoRenew: z.boolean().default(false),
  // benefits no se persiste directamente en el modelo actual
});

export const UpdateMembershipSchema = z.object({
  type: z.enum(['BASIC', 'PREMIUM', 'VIP']).optional(),
  autoRenew: z.boolean().optional(),
});

// Sin tipos de Prisma; usamos literales de cadena para los tipos

export const GetMembershipsSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  // El ID de usuario se obtiene normalmente del JWT; el parámetro sólo es
  // útil para roles STAFF/ADMIN.  Por robustez lo hacemos opcional y sólo se
  // valida si se envía.
  userId: z.string().uuid('ID de usuario inválido').optional(),
  // centerId no existe en el modelo Membership; se ignora si llega
  centerId: z.string().uuid().optional(),
  type: z.enum(['BASIC', 'PREMIUM', 'VIP']).optional(),
  // Mapearemos estos estados a los campos reales (status string + validUntil)
  status: z.enum(['ACTIVE', 'EXPIRED', 'CANCELLED']).optional(),
  // createdAt | validFrom | validUntil | type
  sortBy: z.enum(['createdAt', 'validFrom', 'validUntil', 'type']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const RenewMembershipSchema = z.object({
  duration: z.number().min(1).max(24).default(1),
  paymentMethod: z.enum(['STRIPE', 'REDSYS', 'CASH', 'TRANSFER']).default('STRIPE'),
  upgradeType: z.enum(['BASIC', 'PREMIUM', 'VIP']).optional(),
});

// Configuración de tipos de membresía
const MEMBERSHIP_CONFIG = {
  BASIC: {
    name: 'Básica',
    monthlyPrice: 29.99,
    benefits: {
      discountPercentage: 5,
      priorityBooking: false,
      freeHours: 0,
      guestPasses: 0,
      accessToEvents: false,
      personalTrainer: false,
    },
  },
  PREMIUM: {
    name: 'Premium',
    monthlyPrice: 49.99,
    benefits: {
      discountPercentage: 15,
      priorityBooking: true,
      freeHours: 2,
      guestPasses: 2,
      accessToEvents: true,
      personalTrainer: false,
    },
  },
  VIP: {
    name: 'VIP',
    monthlyPrice: 79.99,
    benefits: {
      discountPercentage: 25,
      priorityBooking: true,
      freeHours: 5,
      guestPasses: 5,
      accessToEvents: true,
      personalTrainer: true,
    },
  },
} as const;

export class MembershipService {
  private notificationService: NotificationService;
  private paymentService: PaymentService;

  constructor() {
    this.notificationService = new NotificationService();
    this.paymentService = new PaymentService();
  }

  /**
   * Crear una nueva membresía
   */
  async createMembership(data: z.infer<typeof CreateMembershipSchema>) {
    const validatedData = CreateMembershipSchema.parse(data);

    // Verificar que el usuario existe
    const user = await db.user.findUnique({
      where: { id: validatedData.userId },
      select: { id: true, email: true, firstName: true, lastName: true },
    });

    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    // Verificar si ya tiene una membresía activa
    const activeMembership = await db.membership.findFirst({
      where: {
        userId: validatedData.userId,
        status: 'active',
        validUntil: { gte: new Date() },
      },
    });

    if (activeMembership) {
      throw new Error('El usuario ya tiene una membresía activa');
    }

    const startDate = validatedData.startDate ? new Date(validatedData.startDate) : new Date();
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + validatedData.duration);

    const config = (MEMBERSHIP_CONFIG as any)[validatedData.type as any] ?? { name: String(validatedData.type), monthlyPrice: 0, benefits: {} };
    const totalPrice = config.monthlyPrice * validatedData.duration;

    // Crear la membresía
    const membership = await db.membership.create({
      data: {
        userId: validatedData.userId,
        type: validatedData.type as any,
        validFrom: startDate,
        validUntil: endDate,
        price: totalPrice,
        status: 'active',
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Procesar pago si no es en efectivo
    if ((validatedData.paymentMethod as any) !== 'CASH') {
      try {
        await this.paymentService.createPayment({
          amount: totalPrice,
          currency: 'EUR',
          description: `Membresía ${config.name} - ${validatedData.duration} mes(es)`,
          userId: validatedData.userId,
          membershipId: membership.id,
          paymentMethod: validatedData.paymentMethod === 'TRANSFER' ? 'TRANSFER' : (validatedData.paymentMethod === 'CASH' ? 'CASH' : 'CARD'),
          provider: validatedData.paymentMethod === 'STRIPE' ? 'STRIPE' : (validatedData.paymentMethod === 'REDSYS' ? 'REDSYS' : 'MANUAL'),
          metadata: { type: 'membership' },
        } as any);
      } catch (error) {
        // Si falla el pago, eliminar la membresía
        await db.membership.delete({ where: { id: membership.id } });
        throw new Error('Error al procesar el pago');
      }
    }

    // Enviar notificación de bienvenida
    try {
      await this.notificationService.sendEmail({
        to: user.email!,
        subject: 'Bienvenido a tu membresía',
        html: `<p>Hola ${user.firstName ?? ''},</p><p>Tu membresía ${config.name} está activa del ${startDate.toLocaleDateString('es-ES')} al ${endDate.toLocaleDateString('es-ES')}.</p>`,
      });
    } catch (error) {
      console.error('Error enviando email de bienvenida de membresía:', error);
    }

    return membership;
  }

  /**
   * Obtener membresías con filtros y paginación
   */
  async getMemberships(params: z.infer<typeof GetMembershipsSchema>) {
    const { page, limit, userId, centerId, type, status, sortBy, sortOrder } = 
      GetMembershipsSchema.parse(params);

    const skip = (page - 1) * limit;
    const now = new Date();

    // Construir filtros
    const where: any = {};

    if (userId) {
      where.userId = userId;
    }

    // centerId no existe en Membership. Si llega, se ignora para evitar 500.

    if (type) {
      where.type = type;
    }

    if (status) {
      switch (status) {
        case 'ACTIVE':
          // status guardado como 'active' y vigencia futura
          where.status = 'active';
          where.validUntil = { gte: now };
          break;
        case 'EXPIRED':
          where.validUntil = { lt: now };
          break;
        case 'CANCELLED':
          where.status = 'cancelled';
          break;
      }
    }

    // Obtener membresías y total
    const [memberships, total] = await Promise.all([
      db.membership.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder } as any,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      db.membership.count({ where }),
    ]);

    // Calcular estado actual de cada membresía
    const membershipsWithStatus = memberships.map((membership: any) => {
      const validUntil: Date = membership.validUntil;
      const statusStr: string = membership.status || 'active';
      let currentStatus: 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
      if (statusStr === 'cancelled') currentStatus = 'CANCELLED';
      else if (validUntil < now) currentStatus = 'EXPIRED';
      else currentStatus = 'ACTIVE';

      return {
        ...membership,
        currentStatus,
        daysRemaining: validUntil > now
          ? Math.ceil((validUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          : 0,
      };
    });

    return {
      memberships: membershipsWithStatus,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Obtener membresía por ID
   */
  async getMembershipById(id: string) {
    const membership = await db.membership.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!membership) {
      throw new Error('Membresía no encontrada');
    }

    const now = new Date();
    let currentStatus: 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
    const statusStr: string = (membership as any).status || 'active';
    const validUntil: Date = (membership as any).validUntil;
    if (statusStr === 'cancelled') currentStatus = 'CANCELLED';
    else if (validUntil < now) currentStatus = 'EXPIRED';
    else currentStatus = 'ACTIVE';

    return {
      ...membership,
      currentStatus,
      daysRemaining: validUntil > now 
        ? Math.ceil((validUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : 0,
    };
  }

  /**
   * Actualizar membresía
   */
  async updateMembership(id: string, data: z.infer<typeof UpdateMembershipSchema>) {
    const validatedData = UpdateMembershipSchema.parse(data);

    const membership = await db.membership.findUnique({
      where: { id },
    });

    if (!membership) {
      throw new Error('Membresía no encontrada');
    }

    const updatedMembership = await db.membership.update({
      where: { id },
      data: {
        type: (validatedData.type as any),
        // autoRenew no existe en el modelo actual
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return updatedMembership;
  }

  /**
   * Renovar membresía
   */
  async renewMembership(id: string, data: z.infer<typeof RenewMembershipSchema>) {
    const validatedData = RenewMembershipSchema.parse(data);

    const membership = await db.membership.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!membership) {
      throw new Error('Membresía no encontrada');
    }

    const membershipType = (validatedData.upgradeType as any) || membership.type;
    const config = (MEMBERSHIP_CONFIG as any)[membershipType as any] ?? { name: String(membershipType), monthlyPrice: 0, benefits: {} };
    const totalPrice = config.monthlyPrice * validatedData.duration;

    // Calcular nueva fecha de fin
    const now = new Date();
    const currentEndDate = (membership as any).validUntil > now ? (membership as any).validUntil : now;
    const newEndDate = new Date(currentEndDate);
    newEndDate.setMonth(newEndDate.getMonth() + validatedData.duration);

    // Actualizar membresía
    const renewedMembership = await db.membership.update({
      where: { id },
      data: {
        type: (membershipType as any),
        validUntil: newEndDate,
        price: Number((membership as any).price ?? 0) + totalPrice,
        status: 'active',
      },
    });

    // Procesar pago
    if ((validatedData.paymentMethod as any) !== 'CASH') {
      try {
        await this.paymentService.createPayment({
          amount: totalPrice,
          currency: 'EUR',
          description: `Renovación membresía ${config.name} - ${validatedData.duration} mes(es)`,
          userId: membership.userId,
          membershipId: membership.id,
          paymentMethod: validatedData.paymentMethod === 'TRANSFER' ? 'TRANSFER' : (validatedData.paymentMethod === 'CASH' ? 'CASH' : 'CARD'),
          provider: validatedData.paymentMethod === 'STRIPE' ? 'STRIPE' : (validatedData.paymentMethod === 'REDSYS' ? 'REDSYS' : 'MANUAL'),
          metadata: { type: 'membership_renewal' },
        } as any);
      } catch (error) {
        throw new Error('Error al procesar el pago de renovación');
      }
    }

    // Enviar notificación
    try {
      await this.notificationService.sendEmail({
        to: membership.user.email!,
        subject: 'Tu membresía ha sido renovada',
        html: `<p>Hola ${membership.user.firstName ?? ''},</p><p>Renovaste tu membresía ${config.name}. Nueva fecha de fin: ${newEndDate.toLocaleDateString('es-ES')}.</p>`,
      });
    } catch (error) {
      console.error('Error enviando email de renovación:', error);
    }

    return renewedMembership;
  }

  /**
   * Suspender membresía
   */
  async suspendMembership(id: string, reason?: string) {
    const membership = await db.membership.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            email: true,
            firstName: true,
          },
        },
      },
    });

    if (!membership) {
      throw new Error('Membresía no encontrada');
    }

    const suspendedMembership = await db.membership.update({
      where: { id },
      data: {
        status: 'cancelled',
      },
    });

    // Enviar notificación
    try {
      await this.notificationService.sendEmail({
        to: membership.user.email!,
        subject: 'Tu membresía ha sido cancelada',
        html: `<p>Hola ${membership.user.firstName ?? ''},</p><p>Tu membresía se ha cancelado${reason ? `: ${reason}` : ''}.</p>`,
      });
    } catch (error) {
      console.error('Error enviando email de suspensión:', error);
    }

    return suspendedMembership;
  }

  /**
   * Reactivar membresía
   */
  async reactivateMembership(id: string) {
    const membership = await db.membership.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            email: true,
            firstName: true,
          },
        },
      },
    });

    if (!membership) {
      throw new Error('Membresía no encontrada');
    }

    if ((membership as any).validUntil < new Date()) {
      throw new Error('No se puede reactivar una membresía expirada');
    }

    const reactivatedMembership = await db.membership.update({
      where: { id },
      data: {
        status: 'active',
      },
    });

    // Enviar notificación
    try {
      await this.notificationService.sendEmail({
        to: membership.user.email!,
        subject: 'Tu membresía ha sido reactivada',
        html: `<p>Hola ${membership.user.firstName ?? ''},</p><p>Tu membresía ha sido reactivada.</p>`,
      });
    } catch (error) {
      console.error('Error enviando email de reactivación:', error);
    }

    return reactivatedMembership;
  }

  /**
   * Obtener estadísticas de membresías
   */
  async getMembershipStats(centerId?: string) {
    const where: any = {};
    const now = new Date();

    const [total, active, expired, byType, revenue] = await Promise.all([
      db.membership.count({ where }),
      db.membership.count({
        where: {
          ...where,
          status: 'active',
          validUntil: { gte: now },
        },
      }),
      db.membership.count({
        where: {
          ...where,
          validUntil: { lt: now },
        },
      }),
      db.membership.groupBy({
        by: ['type'],
        where: {
          ...where,
          status: 'active',
          validUntil: { gte: now },
        },
        _count: { type: true },
      }),
      db.membership.aggregate({
        where,
        _sum: { price: true },
      }),
    ]);

    return {
      total,
      active,
      expired,
      suspended: total - active - expired,
      byType: byType.map((item: any) => ({
        type: item.type,
        count: (item._count as any)?.type || 0,
      })),
      totalRevenue: Number((revenue as any)?._sum?.price || 0),
    };
  }

  /**
   * Verificar membresías que expiran pronto
   */
  async checkExpiringMemberships() {
    const now = new Date();
    const warningDate = new Date();
    warningDate.setDate(warningDate.getDate() + 7); // 7 días antes

    const expiringMemberships = await db.membership.findMany({
      where: {
        status: 'active',
        validUntil: {
          gte: now,
          lte: warningDate,
        },
      },
      include: {
        user: {
          select: {
            email: true,
            firstName: true,
          },
        },
      },
    });

    // Enviar notificaciones
    for (const membership of expiringMemberships) {
      try {
        await this.notificationService.sendEmail({
          to: membership.user.email!,
          subject: 'Tu membresía está por expirar',
          html: `<p>Hola ${membership.user.firstName ?? ''},</p><p>Tu membresía expira el ${(membership as any).validUntil.toLocaleDateString('es-ES')}.</p>`,
        });
      } catch (error) {
        console.error('Error enviando notificación de expiración:', error);
      }
    }

    return expiringMemberships.length;
  }

  /**
   * Obtener tipos de membresía disponibles
   */
  getMembershipTypes() {
    return Object.entries(MEMBERSHIP_CONFIG).map(([key, config]) => ({
      type: key,
      name: config.name,
      monthlyPrice: config.monthlyPrice,
      benefits: config.benefits,
    }));
  }
}
