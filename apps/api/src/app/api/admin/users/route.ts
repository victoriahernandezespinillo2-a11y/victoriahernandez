/**
 * API Routes para gestión de usuarios desde administración
 * GET /api/admin/users - Obtener lista de usuarios con filtros avanzados
 * POST /api/admin/users - Crear nuevo usuario
 */

import { NextRequest } from 'next/server';
import { withAdminMiddleware, ApiResponse } from '@/lib/middleware';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const GetUsersQuerySchema = z.object({
  page: z.string().transform(Number).optional().default(1),
  limit: z.string().transform(Number).optional().default(20),
  search: z.string().optional(),
  role: z.enum(['USER', 'STAFF', 'ADMIN']).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
  centerId: z.string().optional(),
  sortBy: z.enum(['name', 'email', 'createdAt', 'lastLogin']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  hasReservations: z.string().transform(Boolean).optional(),
  hasMemberships: z.string().transform(Boolean).optional()
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
        where.status = params.status;
      }
      
      if (params.centerId) {
        where.centerId = params.centerId;
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
        prisma.user.findMany({
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
            status: true,
            emailVerified: true,
            createdAt: true,
            updatedAt: true,
            lastLogin: true,
            center: {
              select: {
                id: true,
                name: true
              }
            },
            _count: {
              select: {
                reservations: true,
                memberships: true,
                payments: true
              }
            }
          }
        }),
        prisma.user.count({ where })
      ]);
      
      // Calcular estadísticas adicionales para cada usuario
      const usersWithStats = await Promise.all(
        users.map(async (user) => {
          const [totalSpent, activeReservations, activeMemberships] = await Promise.all([
            prisma.payment.aggregate({
              where: {
                userId: user.id,
                status: 'COMPLETED'
              },
              _sum: {
                amount: true
              }
            }),
            prisma.reservation.count({
              where: {
                userId: user.id,
                status: { in: ['CONFIRMED', 'PENDING'] }
              }
            }),
            prisma.membership.count({
              where: {
                userId: user.id,
                status: 'ACTIVE'
              }
            })
          ]);
          
          return {
            ...user,
            stats: {
              totalSpent: totalSpent._sum.amount || 0,
              activeReservations,
              activeMemberships,
              totalReservations: user._count.reservations,
              totalMemberships: user._count.memberships,
              totalPayments: user._count.payments
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
          centerId: params.centerId,
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
  })(request);
}

/**
 * POST /api/admin/users
 * Crear nuevo usuario desde administración
 * Acceso: ADMIN únicamente
 */
export async function POST(request: NextRequest) {
  return withAdminMiddleware(async (req, { user: adminUser }) => {
    try {
      const body = await req.json();
      const userData = CreateUserSchema.parse(body);
      
      // Verificar que el email no esté en uso
      const existingUser = await prisma.user.findUnique({
        where: { email: userData.email }
      });
      
      if (existingUser) {
        return ApiResponse.conflict('El email ya está registrado');
      }
      
      // Verificar que el centro existe si se especifica
      if (userData.centerId) {
        const center = await prisma.center.findUnique({
          where: { id: userData.centerId }
        });
        
        if (!center) {
          return ApiResponse.notFound('Centro no encontrado');
        }
      }
      
      // Hashear contraseña
      const hashedPassword = await bcrypt.hash(userData.password, 12);
      
      // Crear usuario
      const newUser = await prisma.user.create({
        data: {
          email: userData.email,
          password: hashedPassword,
          name: userData.name,
          phone: userData.phone,
          role: userData.role,
          status: userData.status,
          centerId: userData.centerId,
          emailVerified: new Date(), // Los usuarios creados por admin se consideran verificados
          createdBy: adminUser.id
        },
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          role: true,
          status: true,
          emailVerified: true,
          createdAt: true,
          center: {
            select: {
              id: true,
              name: true
            }
          }
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
  })(request);
}

/**
 * OPTIONS /api/admin/users
 * Manejar preflight requests
 */
export async function OPTIONS() {
  return ApiResponse.success(null);
}