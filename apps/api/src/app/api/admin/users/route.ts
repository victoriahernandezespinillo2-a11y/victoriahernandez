/**
 * API Routes para gestiÃ³n de usuarios desde administraciÃ³n
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
  email: z.string().email('Email invÃ¡lido'),
  password: z.string().min(8, 'La contraseÃ±a debe tener al menos 8 caracteres'),
  firstName: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  lastName: z.string().min(2, 'El apellido debe tener al menos 2 caracteres'),
  phone: z.string().optional(),
  dateOfBirth: z
    .string()
    .datetime({ message: 'Fecha de nacimiento invÃ¡lida' })
    .optional()
    .nullable(),
  gdprConsent: z.boolean().default(false),
  membershipType: z.string().optional().nullable(),
  role: z.enum(['USER', 'STAFF', 'ADMIN']).default('USER'),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
  centerId: z.string().optional(),
  sendWelcomeEmail: z.boolean().optional().default(true)
});

/**
 * GET /api/admin/users
 * Obtener lista de usuarios con filtros avanzados
 * Acceso: ADMIN Ãºnicamente
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
      
      // Obtener usuarios y total con timeout
      const [users, total] = await Promise.race([
        Promise.all([
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
        ]),
        // Timeout de 15 segundos para la consulta principal
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout en consulta de usuarios')), 15000)
        )
      ]) as [any[], number];
      
      // Calcular estadísticas adicionales de forma optimizada (batch queries)
      let usersWithStats = users;
      
      try {
        // Obtener estadísticas en batch para todos los usuarios de una vez
        const userIds = users.map(u => u.id);
        
        const [reservationStats, membershipStats] = await Promise.race([
          Promise.all([
            // Estadísticas de reservas por usuario
            db.reservation.groupBy({
              by: ['userId'],
              where: { 
                userId: { in: userIds },
                status: { in: ['PAID', 'IN_PROGRESS', 'COMPLETED'] }
              },
              _sum: { totalPrice: true },
              _count: { id: true }
            }),
            // Estadísticas de membresías activas por usuario
            db.membership.groupBy({
              by: ['userId'],
              where: { 
                userId: { in: userIds },
                status: 'active'
              },
              _count: { id: true }
            })
          ]),
          // Timeout de 10 segundos para las estadísticas
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout en consulta de estadísticas')), 10000)
          )
        ]) as [any[], any[]];
        
        // Crear mapas para acceso rápido
        const reservationMap = new Map();
        const membershipMap = new Map();
        
        reservationStats.forEach(stat => {
          reservationMap.set(stat.userId, {
            totalSpent: Number(stat._sum.totalPrice || 0),
            activeReservations: stat._count.id
          });
        });
        
        membershipStats.forEach(stat => {
          membershipMap.set(stat.userId, {
            activeMemberships: stat._count.id
          });
        });
        
        // Aplicar estadísticas a cada usuario
        usersWithStats = users.map((user: any) => {
          const resStats = reservationMap.get(user.id) || { totalSpent: 0, activeReservations: 0 };
          const memStats = membershipMap.get(user.id) || { activeMemberships: 0 };
          
          return {
            ...user,
            stats: {
              totalSpent: resStats.totalSpent,
              activeReservations: resStats.activeReservations,
              activeMemberships: memStats.activeMemberships,
              totalReservations: user._count?.reservations ?? 0,
              totalMemberships: user._count?.memberships ?? 0,
            },
          };
        });
        
      } catch (e) {
        console.error('Error calculando estadísticas en batch, usando datos básicos:', e);
        // Fallback: usar solo los datos básicos sin estadísticas adicionales
        usersWithStats = users.map((user: any) => ({
          ...user,
          stats: {
            totalSpent: 0,
            activeReservations: 0,
            activeMemberships: 0,
            totalReservations: user._count?.reservations ?? 0,
            totalMemberships: user._count?.memberships ?? 0,
          },
        }));
      }
      
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
      
      // Fallback: si falla el bloque principal, devolver lista básica sin estadísticas
      try {
        console.error('Error obteniendo usuarios (principal). Aplicando fallback sin estadísticas:', error);
        const { searchParams } = (request as any).nextUrl;
        const params = GetUsersQuerySchema.parse(Object.fromEntries(searchParams.entries()));
        const skip = (params.page - 1) * params.limit;
        const where: any = {};
        if (params.search) {
          where.OR = [
            { name: { contains: params.search, mode: 'insensitive' } },
            { email: { contains: params.search, mode: 'insensitive' } },
            { phone: { contains: params.search, mode: 'insensitive' } },
          ];
        }
        if (params.role) where.role = params.role;
        if (params.status) where.isActive = params.status === 'ACTIVE';
        const orderBy: any = {}; orderBy[params.sortBy] = params.sortOrder;
        const [users, total] = await Promise.all([
          db.user.findMany({ where, skip, take: params.limit, orderBy, select: {
            id: true, email: true, name: true, phone: true, role: true, isActive: true,
            emailVerified: true, emailVerifiedAt: true, createdAt: true, updatedAt: true, lastLoginAt: true,
          } }),
          db.user.count({ where })
        ]);
        return ApiResponse.success({
          data: users,
          pagination: { page: params.page, limit: params.limit, total, pages: Math.ceil(total / params.limit) },
          partial: true,
        });
      } catch (fallbackError) {
        console.error('Fallback también falló en /admin/users:', fallbackError);
        return ApiResponse.internalError('Error interno del servidor');
      }
    }
  })(request);
}

/**
 * POST /api/admin/users
 * Crear nuevo usuario desde administraciÃ³n
 * Acceso: ADMIN Ãºnicamente
 */
export async function POST(request: NextRequest) {
  return withAdminMiddleware(async (req) => {
    try {
      const adminUser = (req as any).user;
      const body = await req.json();
      const userData = CreateUserSchema.parse(body);
      
      // Verificar que el email no estÃ© en uso
      const existingUser = await db.user.findUnique({
        where: { email: userData.email }
      });
      
      if (existingUser) {
        return ApiResponse.conflict('El email ya estÃ¡ registrado');
      }
      
      // Hashear contraseÃ±a
      const hashedPassword = await hashPassword(userData.password);
      
      // Crear usuario
      const newUser = await db.user.create({
        data: {
          email: userData.email,
          password: hashedPassword,
          firstName: userData.firstName,
          lastName: userData.lastName,
          name: `${userData.firstName} ${userData.lastName}`.trim(),
          phone: userData.phone,
          dateOfBirth: userData.dateOfBirth ? new Date(userData.dateOfBirth) : null,
          gdprConsent: userData.gdprConsent,
          membershipType: userData.membershipType ?? null,
          role: userData.role,
          isActive: userData.status === 'ACTIVE',
          emailVerified: true,
          emailVerifiedAt: new Date(),
          // createdBy: adminUser?.id // si existe en el modelo
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          name: true,
          phone: true,
          dateOfBirth: true,
          gdprConsent: true,
          membershipType: true,
          role: true,
          isActive: true,
          emailVerified: true,
          emailVerifiedAt: true,
          createdAt: true,
          updatedAt: true
        }
      });
      
      // TODO: Enviar email de bienvenida si estÃ¡ habilitado
      if (userData.sendWelcomeEmail) {
        // AquÃ­ se integrarÃ­a con el servicio de notificaciones
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
