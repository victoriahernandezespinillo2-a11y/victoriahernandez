/**
 * Servicio de gestión de membresías
 * Maneja suscripciones, beneficios, renovaciones y estadísticas de membresías
 */

import { db, Membership, User } from '@repo/db';
import { z } from 'zod';
import { NotificationService } from '@polideportivo/notifications';
import { PaymentService } from '@polideportivo/payments';

// Esquemas de validación
export const CreateMembershipSchema = z.object({
  userId: z.string().uuid('ID de usuario inválido'),
  type: z.enum(['BASIC', 'PREMIUM', 'VIP'], {
    errorMap: () => ({ message: 'Tipo de membresía inválido' }),
  }),
  centerId: z.string().uuid('ID de centro inválido').optional(),
  startDate: z.string().datetime('Fecha de inicio inválida').optional(),
  duration: z.number().min(1, 'La duración debe ser al menos 1 mes').max(24, 'La duración máxima es 24 meses').default(1),
  paymentMethod: z.enum(['STRIPE', 'REDSYS', 'CASH', 'TRANSFER']).default('STRIPE'),
  autoRenew: z.boolean().default(false),
  benefits: z.object({
    discountPercentage: z.number().min(0).max(100).default(0),
    priorityBooking: z.boolean().default(false),
    freeHours: z.number().min(0).default(0),
    guestPasses: z.number().min(0).default(0),
    accessToEvents: z.boolean().default(false),
    personalTrainer: z.boolean().default(false),
  }).optional(),
});

export const UpdateMembershipSchema = z.object({
  type: z.enum(['BASIC', 'PREMIUM', 'VIP']).optional(),
  autoRenew: z.boolean().optional(),
  benefits: z.object({
    discountPercentage: z.number().min(0).max(100).optional(),
    priorityBooking: z.boolean().optional(),
    freeHours: z.number().min(0).optional(),
    guestPasses: z.number().min(0).optional(),
    accessToEvents: z.boolean().optional(),
    personalTrainer: z.boolean().optional(),
  }).optional(),
});

export const GetMembershipsSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  userId: z.string().uuid().optional(),
  centerId: z.string().uuid().optional(),
  type: z.enum(['BASIC', 'PREMIUM', 'VIP']).optional(),
  status: z.enum(['ACTIVE', 'EXPIRED', 'SUSPENDED', 'CANCELLED']).optional(),
  sortBy: z.enum(['createdAt', 'startDate', 'endDate', 'type']).default('createdAt'),
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
        active: true,
        endDate: { gte: new Date() },
      },
    });

    if (activeMembership) {
      throw new Error('El usuario ya tiene una membresía activa');
    }

    const startDate = validatedData.startDate ? new Date(validatedData.startDate) : new Date();
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + validatedData.duration);

    const config = MEMBERSHIP_CONFIG[validatedData.type];
    const totalPrice = config.monthlyPrice * validatedData.duration;

    // Crear la membresía
    const membership = await db.membership.create({
      data: {
        userId: validatedData.userId,
        type: validatedData.type,
        centerId: validatedData.centerId,
        startDate,
        endDate,
        price: totalPrice,
        paymentMethod: validatedData.paymentMethod,
        autoRenew: validatedData.autoRenew,
        benefits: validatedData.benefits || config.benefits,
        active: true,
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
        center: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Procesar pago si no es en efectivo
    if (validatedData.paymentMethod !== 'CASH') {
      try {
        const paymentResult = await this.paymentService.createPayment({
          amount: totalPrice,
          currency: 'EUR',
          description: `Membresía ${config.name} - ${validatedData.duration} mes(es)`,
          metadata: {
            membershipId: membership.id,
            userId: validatedData.userId,
            type: 'membership',
          },
          gateway: validatedData.paymentMethod === 'STRIPE' ? 'stripe' : 'redsys',
        });

        // Actualizar membresía con información de pago
        await db.membership.update({
          where: { id: membership.id },
          data: {
            paymentId: paymentResult.id,
            paymentStatus: 'PENDING',
          },
        });
      } catch (error) {
        // Si falla el pago, eliminar la membresía
        await db.membership.delete({ where: { id: membership.id } });
        throw new Error('Error al procesar el pago');
      }
    }

    // Enviar notificación de bienvenida
    try {
      await this.notificationService.sendEmail({
        to: user.email,
        template: 'membership_welcome',
        data: {
          firstName: user.firstName,
          membershipType: config.name,
          startDate: startDate.toLocaleDateString('es-ES'),
          endDate: endDate.toLocaleDateString('es-ES'),
          benefits: config.benefits,
        },
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

    if (centerId) {
      where.centerId = centerId;
    }

    if (type) {
      where.type = type;
    }

    if (status) {
      switch (status) {
        case 'ACTIVE':
          where.active = true;
          where.endDate = { gte: now };
          break;
        case 'EXPIRED':
          where.endDate = { lt: now };
          break;
        case 'SUSPENDED':
          where.active = false;
          where.endDate = { gte: now };
          break;
        case 'CANCELLED':
          where.active = false;
          break;
      }
    }

    // Obtener membresías y total
    const [memberships, total] = await Promise.all([
      db.membership.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          center: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      db.membership.count({ where }),
    ]);

    // Calcular estado actual de cada membresía
    const membershipsWithStatus = memberships.map(membership => {
      let currentStatus: 'ACTIVE' | 'EXPIRED' | 'SUSPENDED' | 'CANCELLED';
      
      if (!membership.active) {
        currentStatus = membership.endDate < now ? 'EXPIRED' : 'CANCELLED';
      } else if (membership.endDate < now) {
        currentStatus = 'EXPIRED';
      } else {
        currentStatus = 'ACTIVE';
      }

      return {
        ...membership,
        currentStatus,
        daysRemaining: membership.endDate > now 
          ? Math.ceil((membership.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
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
        center: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
      },
    });

    if (!membership) {
      throw new Error('Membresía no encontrada');
    }

    const now = new Date();
    let currentStatus: 'ACTIVE' | 'EXPIRED' | 'SUSPENDED' | 'CANCELLED';
    
    if (!membership.active) {
      currentStatus = membership.endDate < now ? 'EXPIRED' : 'CANCELLED';
    } else if (membership.endDate < now) {
      currentStatus = 'EXPIRED';
    } else {
      currentStatus = 'ACTIVE';
    }

    return {
      ...membership,
      currentStatus,
      daysRemaining: membership.endDate > now 
        ? Math.ceil((membership.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
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
        type: validatedData.type,
        autoRenew: validatedData.autoRenew,
        benefits: validatedData.benefits ? {
          ...membership.benefits as any,
          ...validatedData.benefits,
        } : undefined,
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

    const membershipType = validatedData.upgradeType || membership.type;
    const config = MEMBERSHIP_CONFIG[membershipType];
    const totalPrice = config.monthlyPrice * validatedData.duration;

    // Calcular nueva fecha de fin
    const now = new Date();
    const currentEndDate = membership.endDate > now ? membership.endDate : now;
    const newEndDate = new Date(currentEndDate);
    newEndDate.setMonth(newEndDate.getMonth() + validatedData.duration);

    // Actualizar membresía
    const renewedMembership = await db.membership.update({
      where: { id },
      data: {
        type: membershipType,
        endDate: newEndDate,
        price: membership.price + totalPrice,
        paymentMethod: validatedData.paymentMethod,
        active: true,
        benefits: config.benefits,
      },
    });

    // Procesar pago
    if (validatedData.paymentMethod !== 'CASH') {
      try {
        await this.paymentService.createPayment({
          amount: totalPrice,
          currency: 'EUR',
          description: `Renovación membresía ${config.name} - ${validatedData.duration} mes(es)`,
          metadata: {
            membershipId: membership.id,
            userId: membership.userId,
            type: 'membership_renewal',
          },
          gateway: validatedData.paymentMethod === 'STRIPE' ? 'stripe' : 'redsys',
        });
      } catch (error) {
        throw new Error('Error al procesar el pago de renovación');
      }
    }

    // Enviar notificación
    try {
      await this.notificationService.sendEmail({
        to: membership.user.email,
        template: 'membership_renewed',
        data: {
          firstName: membership.user.firstName,
          membershipType: config.name,
          newEndDate: newEndDate.toLocaleDateString('es-ES'),
          duration: validatedData.duration,
        },
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
        active: false,
        suspensionReason: reason,
      },
    });

    // Enviar notificación
    try {
      await this.notificationService.sendEmail({
        to: membership.user.email,
        template: 'membership_suspended',
        data: {
          firstName: membership.user.firstName,
          reason: reason || 'No especificada',
        },
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

    if (membership.endDate < new Date()) {
      throw new Error('No se puede reactivar una membresía expirada');
    }

    const reactivatedMembership = await db.membership.update({
      where: { id },
      data: {
        active: true,
        suspensionReason: null,
      },
    });

    // Enviar notificación
    try {
      await this.notificationService.sendEmail({
        to: membership.user.email,
        template: 'membership_reactivated',
        data: {
          firstName: membership.user.firstName,
        },
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
    const where = centerId ? { centerId } : {};
    const now = new Date();

    const [total, active, expired, byType, revenue] = await Promise.all([
      db.membership.count({ where }),
      db.membership.count({
        where: {
          ...where,
          active: true,
          endDate: { gte: now },
        },
      }),
      db.membership.count({
        where: {
          ...where,
          endDate: { lt: now },
        },
      }),
      db.membership.groupBy({
        by: ['type'],
        where: {
          ...where,
          active: true,
          endDate: { gte: now },
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
      byType: byType.map(item => ({
        type: item.type,
        count: item._count.type,
      })),
      totalRevenue: revenue._sum.price || 0,
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
        active: true,
        endDate: {
          gte: now,
          lte: warningDate,
        },
        autoRenew: false,
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
          to: membership.user.email,
          template: 'membership_expiring',
          data: {
            firstName: membership.user.firstName,
            expirationDate: membership.endDate.toLocaleDateString('es-ES'),
            daysRemaining: Math.ceil(
              (membership.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
            ),
          },
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