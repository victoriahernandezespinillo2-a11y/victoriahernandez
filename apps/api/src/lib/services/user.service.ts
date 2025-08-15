/**
 * Servicio de gestión de usuarios
 * Maneja operaciones CRUD, perfiles, preferencias y estadísticas de usuarios
 */

import { db, User, Membership, Reservation } from '@repo/db';
import { hashPassword } from '@repo/auth';
import { z } from 'zod';
import { NotificationService } from '@repo/notifications';

// Esquemas de validación
export const CreateUserSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  firstName: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  lastName: z.string().min(2, 'El apellido debe tener al menos 2 caracteres'),
  phone: z.string().optional(),
  dateOfBirth: z.string().datetime().optional(),
  role: z.enum(['USER', 'STAFF', 'ADMIN']).default('USER'),
});

export const UpdateUserSchema = z.object({
  firstName: z.string().min(2).optional(),
  lastName: z.string().min(2).optional(),
  phone: z.string().optional(),
  dateOfBirth: z.string().datetime().optional(),
  preferences: z.object({
    emailNotifications: z.boolean().optional(),
    smsNotifications: z.boolean().optional(),
    language: z.enum(['es', 'en']).optional(),
    timezone: z.string().optional(),
  }).optional(),
});

export const UpdatePasswordSchema = z.object({
  currentPassword: z.string(),
  newPassword: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
});

export const GetUsersSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
  role: z.enum(['USER', 'STAFF', 'ADMIN']).optional(),
  centerId: z.string().uuid().optional(),
  active: z.coerce.boolean().optional(),
  sortBy: z.enum(['createdAt', 'firstName', 'lastName', 'email']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export class UserService {
  private notificationService: NotificationService;

  constructor() {
    this.notificationService = new NotificationService();
  }

  /**
   * Crear un nuevo usuario
   */
  async createUser(data: z.infer<typeof CreateUserSchema>) {
    const validatedData = CreateUserSchema.parse(data);

    // Verificar si el email ya existe
    const existingUser = await db.user.findUnique({
      where: { email: validatedData.email },
    });

    if (existingUser) {
      throw new Error('El email ya está registrado');
    }

    // Hash de la contraseña
    const hashedPassword = await hashPassword(validatedData.password);

    // Crear usuario
    const user = await db.user.create({
      data: {
        email: validatedData.email,
        password: hashedPassword,
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        phone: validatedData.phone,
        dateOfBirth: validatedData.dateOfBirth ? new Date(validatedData.dateOfBirth) : null,
        role: validatedData.role,
        // centerId/preferences no existen en el modelo actual
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        dateOfBirth: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Enviar email de bienvenida
    try {
      await this.notificationService.sendEmail({
        to: user.email,
        subject: 'Bienvenido',
        html: `<p>Hola ${user.firstName ?? ''}, bienvenido a la plataforma.</p>`,
      });
    } catch (error) {
      console.error('Error enviando email de bienvenida:', error);
    }

    return user;
  }

  /**
   * Obtener usuarios con filtros y paginación
   */
  async getUsers(params: z.infer<typeof GetUsersSchema>) {
    const { page, limit, search, role, centerId, active, sortBy, sortOrder } = 
      GetUsersSchema.parse(params);

    const skip = (page - 1) * limit;

    // Construir filtros
    const where: any = {};

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (role) {
      where.role = role;
    }

    // centerId no existe en el modelo User

    if (active !== undefined) {
      where.isActive = active;
    }

    // Obtener usuarios y total
    const [users, total] = await Promise.all([
      db.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              reservations: true,
              memberships: true,
            },
          },
          // center no es relación en el schema actual
        },
      }),
      db.user.count({ where }),
    ]);

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Obtener usuario por ID
   */
  async getUserById(id: string) {
    const user = await db.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        dateOfBirth: true,
        role: true,
        membershipType: true,
        membershipExpiresAt: true,
        creditsBalance: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        // center no es relación en el modelo actual
        memberships: {
          where: { status: 'active', validUntil: { gte: new Date() } },
          select: {
            id: true,
            type: true,
            validFrom: true,
            validUntil: true,
          },
        },
        _count: {
          select: {
            reservations: true,
            // tournaments no en el modelo actual
          },
        },
      },
    });

    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    return user;
  }

  /**
   * Actualizar usuario
   */
  async updateUser(id: string, data: z.infer<typeof UpdateUserSchema>) {
    const validatedData = UpdateUserSchema.parse(data);

    const user = await db.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    const updatedUser = await db.user.update({
      where: { id },
      data: {
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        phone: validatedData.phone,
        dateOfBirth: validatedData.dateOfBirth ? new Date(validatedData.dateOfBirth) : undefined,
        // preferences no existe en el modelo actual
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        dateOfBirth: true,
        role: true,
        updatedAt: true,
      },
    });

    return updatedUser;
  }

  /**
   * Cambiar contraseña
   */
  async updatePassword(id: string, data: z.infer<typeof UpdatePasswordSchema>) {
    const validatedData = UpdatePasswordSchema.parse(data);

    const user = await db.user.findUnique({
      where: { id },
      select: { id: true, password: true },
    });

    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    // Verificar contraseña actual (aquí necesitarías una función de verificación)
    // const isValidPassword = await verifyPassword(validatedData.currentPassword, user.password);
    // if (!isValidPassword) {
    //   throw new Error('Contraseña actual incorrecta');
    // }

    const hashedPassword = await hashPassword(validatedData.newPassword);

    await db.user.update({
      where: { id },
      data: { password: hashedPassword },
    });

    return { success: true };
  }

  /**
   * Activar/desactivar usuario
   */
  async toggleUserStatus(id: string, active: boolean) {
    const user = await db.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    const updatedUser = await db.user.update({
      where: { id },
      data: { isActive: active },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
         isActive: true,
      },
    });

    return updatedUser;
  }

  /**
   * Obtener estadísticas del usuario
   */
  async getUserStats(id: string) {
    const user = await db.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const [totalReservations, monthlyReservations, yearlyReservations, activeMemberships] = 
      await Promise.all([
        db.reservation.count({
          where: { userId: id },
        }),
        db.reservation.count({
          where: {
            userId: id,
            createdAt: { gte: startOfMonth },
          },
        }),
        db.reservation.count({
          where: {
            userId: id,
            createdAt: { gte: startOfYear },
          },
        }),
        db.membership.count({
          where: {
            userId: id,
            status: 'active',
            validUntil: { gte: now },
          },
        }),
      ]);

    // Deportes más reservados
    const sportStats = await db.reservation.groupBy({
      by: ['courtId'],
      where: { userId: id },
      _count: { courtId: true },
      orderBy: { _count: { courtId: 'desc' } },
      take: 5,
    });

    const sportsWithDetails = await Promise.all(
      sportStats.map(async (stat: any) => {
        const court = await db.court.findUnique({
          where: { id: stat.courtId },
          select: { sportType: true },
        });
        return {
          sport: (court as any)?.sportType || 'Desconocido',
          count: stat._count.courtId,
        };
      })
    );

    return {
      totalReservations,
      monthlyReservations,
      yearlyReservations,
      activeMemberships,
      favoriteSports: sportsWithDetails,
    };
  }

  /**
   * Obtener historial de reservas del usuario
   */
  async getUserReservations(id: string, params: {
    page?: number;
    limit?: number;
    status?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const { page = 1, limit = 20, status, startDate, endDate } = params;
    const skip = (page - 1) * limit;

    const where: any = { userId: id };

    // Normalizar y validar estado para evitar errores Prisma por enums inválidos
    if (status) {
      const map: Record<string, string> = {
        confirmed: 'IN_PROGRESS',
        check_in: 'IN_PROGRESS',
        checked_in: 'IN_PROGRESS',
        pending: 'PENDING',
        paid: 'PAID',
        in_progress: 'IN_PROGRESS',
        cancelled: 'CANCELLED',
        completed: 'COMPLETED',
        no_show: 'NO_SHOW',
      };
      const normalized = map[status.toLowerCase()] || status.toUpperCase();
      const allowed = new Set(['PENDING', 'PAID', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW']);
      if (allowed.has(normalized)) {
        where.status = normalized;
      }
    }

    if (startDate || endDate) {
      where.startTime = {} as any;
      if (startDate) (where.startTime as any).gte = new Date(startDate);
      if (endDate) (where.startTime as any).lte = new Date(endDate);
    }

    const [reservations, total] = await Promise.all([
      db.reservation.findMany({
        where,
        skip,
        take: limit,
        orderBy: { startTime: 'desc' },
        include: {
          court: {
            select: {
              id: true,
              name: true,
              sportType: true,
              center: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      }),
      db.reservation.count({ where }),
    ]);

    return {
      reservations,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Eliminar usuario (soft delete)
   */
  async deleteUser(id: string) {
    const user = await db.user.findUnique({
      where: { id },
      include: {
        reservations: {
          where: {
            status: { in: ['PAID', 'IN_PROGRESS'] },
            startTime: { gte: new Date() },
          },
        },
      },
    });

    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    // Verificar si tiene reservas activas
    if (user.reservations.length > 0) {
      throw new Error('No se puede eliminar un usuario con reservas activas');
    }

    // Soft delete
    await db.user.update({
      where: { id },
      data: {
        isActive: false,
        email: `deleted_${Date.now()}_${user.email}`,
      },
    });

    return { success: true };
  }
}