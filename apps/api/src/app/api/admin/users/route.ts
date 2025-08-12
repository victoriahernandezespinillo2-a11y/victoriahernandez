/**
 * API Routes para gestión de usuarios desde administración
 * GET /api/admin/users - Obtener lista de usuarios con filtros avanzados
 * POST /api/admin/users - Crear nuevo usuario
 */

import { NextRequest } from 'next/server';
import { withAdminMiddleware, ApiResponse } from '@/lib/middleware';
import { db } from '@repo/db';
import { z } from 'zod';
import { hashPassword } from '@repo/auth';

// Usar cliente compartido

const GetUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  role: z.enum(['USER', 'STAFF', 'ADMIN']).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  sortBy: z.enum(['name', 'email', 'createdAt', 'lastLoginAt']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  hasReservations: z.coerce.boolean().optional(),
  hasMemberships: z.coerce.boolean().optional()
});

const CreateUserSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  phone: z.string().optional(),
  role: z.enum(['USER', 'STAFF', 'ADMIN']).default('USER'),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
  centerId: z.string().optional(),
  sendWelcomeEmail: z.boolean().optional().default(true)
});

/**
 * GET /api/admin/users
 * Obtener lista de usuarios con filtros avanzados
 * Acceso: ADMIN únicamente
 */
export async function GET(request: NextRequest) {
  return withAdminMiddleware(async (req) => {
    try {
      const { searchParams } = req.nextUrl;
      const params = GetUsersQuerySchema.parse(Object.fromEntries(searchParams.entries()));
      
      const skip = (params.page - 1) * params.limit;
      
      // Construir filtros
      const where: any = {};
      
      if (params.search) {
        where.OR = [
          { name: { contains: params.search, mode: 'insensitive' } },
          { email: { contains: params.search, mode: 'insensitive' } },
          { phone: { contains: params.search, mode: 'insensitive' } }
        ];
      }
      
      if (params.role) {
        where.role = params.role;
      }
      
      if (params.status) {
        where.isActive = params.status === 'ACTIVE';
      }
      
      if (params.hasReservations !== undefined) {
        if (params.hasReservations) {
          where.reservations = { some: {} };
        } else {
          where.reservations = { none: {} };
        }
      }
      
      if (params.hasMemberships !== undefined) {
        if (params.hasMemberships) {
          where.memberships = { some: {} };
        } else {
          where.memberships = { none: {} };
        }
      }
      
      // Construir ordenamiento
      const orderBy: any = {};
      orderBy[params.sortBy] = params.sortOrder;
      
      // Obtener usuarios y total
      const [users, total] = await Promise.all([
        db.user.findMany({
          where,
          skip,
          take: params.limit,
          orderBy,
          select: {
            id: true,
            email: true,
            name: true,
            phone: true,
            role: true,
            isActive: true,
            emailVerified: true,
            emailVerifiedAt: true,
            createdAt: true,
            updatedAt: true,
            lastLoginAt: true,
            _count: {
              select: {
                reservations: true,
                memberships: true
              }
            }
          }
        }),
        db.user.count({ where })
      ]);
      
      // Calcular estadísticas adicionales para cada usuario
      const usersWithStats = await Promise.all(
        users.map(async (user) => {
          const [totalSpent, activeReservations, activeMemberships] = await Promise.all([
            db.reservation.aggregate({
              where: {
                userId: user.id,
                status: 'PAID'
              },
              _sum: {
                totalPrice: true
              }
            }),
            db.reservation.count({
              where: {
                userId: user.id,
                status: { in: ['PAID', 'IN_PROGRESS', 'COMPLETED'] }
              }
            }),
            db.membership.count({
              where: {
                userId: user.id,
                status: 'active'
              }
            })
          ]);
          
          return {
            ...user,
            stats: {
              totalSpent: Number((totalSpent as any)._sum.totalPrice || 0),
              activeReservations,
              activeMemberships,
              totalReservations: user._count.reservations,
              totalMemberships: user._count.memberships
            }
          };
        })
      );
      
      const result = {
        data: usersWithStats,
        pagination: {
          page: params.page,
          limit: params.limit,
          total,
          pages: Math.ceil(total / params.limit)
        },
        filters: {
          search: params.search,
          role: params.role,
          status: params.status,
          hasReservations: params.hasReservations,
          hasMemberships: params.hasMemberships
        },
        sorting: {
          sortBy: params.sortBy,
          sortOrder: params.sortOrder
        }
      };
      
      return ApiResponse.success(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return ApiResponse.validation(
          error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          }))
        );
      }
      
      console.error('Error obteniendo usuarios:', error);
      return ApiResponse.internalError('Error interno del servidor');
    }
  })(request, {} as any);
}

/**
 * POST /api/admin/users
 * Crear nuevo usuario desde administración
 * Acceso: ADMIN únicamente
 */
export async function POST(request: NextRequest) {
  return withAdminMiddleware(async (req, context) => {
    try {
      const adminUser = (context as any)?.user;
      const body = await req.json();
      const userData = CreateUserSchema.parse(body);
      
      // Verificar que el email no esté en uso
      const existingUser = await db.user.findUnique({
        where: { email: userData.email }
      });
      
      if (existingUser) {
        return ApiResponse.conflict('El email ya está registrado');
      }
      
      // Hashear contraseña
      const hashedPassword = await hashPassword(userData.password);
      
      // Crear usuario
      const newUser = await db.user.create({
        data: {
          email: userData.email,
          password: hashedPassword,
          name: userData.name,
          phone: userData.phone,
          role: userData.role,
          isActive: userData.status === 'ACTIVE',
          emailVerified: true,
          emailVerifiedAt: new Date(),
          // createdBy: adminUser?.id // si existe en el modelo
        },
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          role: true,
          isActive: true,
          emailVerified: true,
          emailVerifiedAt: true,
          createdAt: true,
          updatedAt: true
        }
      });
      
      // TODO: Enviar email de bienvenida si está habilitado
      if (userData.sendWelcomeEmail) {
        // Aquí se integraría con el servicio de notificaciones
        console.log(`Enviando email de bienvenida a ${newUser.email}`);
      }
      
      return ApiResponse.success(newUser);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return ApiResponse.validation(
          error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          }))
        );
      }
      
      console.error('Error creando usuario:', error);
      return ApiResponse.internalError('Error interno del servidor');
    }
  })(request, {} as any);
}

/**
 * OPTIONS /api/admin/users
 * Manejar preflight requests
 */
export async function OPTIONS() {
  return ApiResponse.success(null);
}