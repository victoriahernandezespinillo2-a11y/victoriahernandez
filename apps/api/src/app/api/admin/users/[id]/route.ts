/**
 * API Routes para administración de usuarios específicos
 * GET /api/admin/users/[id] - Obtener detalles de un usuario específico
 * PUT /api/admin/users/[id] - Actualizar un usuario específico
 * DELETE /api/admin/users/[id] - Eliminar un usuario específico
 */

import { NextRequest } from 'next/server';
import { withAdminMiddleware, ApiResponse } from '@/lib/middleware';
import { db } from '@repo/db';
import { z } from 'zod';
import { hashPassword } from '@repo/auth';

// Usar cliente compartido

const UpdateUserSchema = z.object({
  firstName: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').optional(),
  lastName: z.string().min(2, 'El apellido debe tener al menos 2 caracteres').optional(),
  email: z.string().email('Email inválido').optional(),
  phone: z.string().optional(),
  role: z.enum(['USER', 'STAFF', 'ADMIN']).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION']).optional(),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres').optional(),
  centerId: z.string().optional(),
  preferences: z.object({
    notifications: z.object({
      email: z.boolean().optional(),
      sms: z.boolean().optional(),
      push: z.boolean().optional()
    }).optional(),
    language: z.enum(['es', 'en']).optional(),
    timezone: z.string().optional()
  }).optional(),
  profile: z.object({
    dateOfBirth: z.string().optional(),
    gender: z.enum(['M', 'F', 'OTHER']).optional(),
    emergencyContact: z.object({
      name: z.string().optional(),
      phone: z.string().optional(),
      relationship: z.string().optional()
    }).optional(),
    medicalInfo: z.object({
      allergies: z.string().optional(),
      medications: z.string().optional(),
      conditions: z.string().optional()
    }).optional()
  }).optional()
});

/**
 * GET /api/admin/users/[id]
 * Obtener detalles completos de un usuario específico
 * Acceso: ADMIN únicamente
 */
export async function GET(request: NextRequest) {
  return withAdminMiddleware(async (req) => {
    try {
      const pathname = req.nextUrl.pathname;
      const userId = pathname.split('/').pop() as string;
      
      const user = await db.user.findUnique({
        where: { id: userId },
        include: {
          reservations: {
            select: {
              id: true,
              startTime: true,
              endTime: true,
              status: true,
              totalPrice: true,
              court: {
                select: {
                  id: true,
                  name: true,
                  sportType: true
                }
              }
            },
            orderBy: {
              createdAt: 'desc'
            },
            take: 10
          },
          memberships: {
            select: {
              id: true,
              type: true,
              status: true,
              validFrom: true,
              validUntil: true,
              price: true
            },
            orderBy: {
              createdAt: 'desc'
            },
            take: 5
          },
          // payments relation no existe en esquema actual
          _count: {
            select: {
              reservations: true,
              memberships: true
            }
          }
        }
      });
      
      if (!user) {
        return ApiResponse.notFound('Usuario no encontrado');
      }
      
      // Calcular estadísticas adicionales
      const [totalSpent, activeReservations, activeMemberships] = await Promise.all([
        Promise.resolve({ _sum: { amount: 0 } }),
        db.reservation.count({
          where: {
            userId: userId,
          status: { in: ['PAID', 'IN_PROGRESS', 'COMPLETED'] },
            startTime: {
              gte: new Date()
            }
          }
        }),
        db.membership.count({
          where: {
            userId: userId,
            status: 'ACTIVE',
            validUntil: {
              gte: new Date()
            }
          }
        })
      ]);
      
      const userDetails = {
        ...user,
        password: undefined, // No incluir la contraseña
        stats: {
               totalSpent: 0,
          totalReservations: user._count.reservations,
          totalMemberships: user._count.memberships,
           totalPayments: 0,
          activeReservations,
          activeMemberships
        }
      };
      
      return ApiResponse.success(userDetails);
    } catch (error) {
      console.error('Error obteniendo detalles del usuario:', error);
      return ApiResponse.internalError('Error interno del servidor');
    }
  })(request);
}

/**
 * PUT /api/admin/users/[id]
 * Actualizar un usuario específico
 * Acceso: ADMIN únicamente
 */
export async function PUT(request: NextRequest) {
  return withAdminMiddleware(async (req) => {
    try {
      const adminUser = (req as any).user;
      const pathname = req.nextUrl.pathname;
      const userId = pathname.split('/').pop() as string;
      const body = await req.json();
      const userData = UpdateUserSchema.parse(body);
      
      // Verificar que el usuario existe
      const existingUser = await db.user.findUnique({
        where: { id: userId }
      });
      
      if (!existingUser) {
        return ApiResponse.notFound('Usuario no encontrado');
      }
      
      // Verificar email único si se está actualizando
      if (userData.email && userData.email !== existingUser.email) {
        const emailExists = await db.user.findUnique({
          where: { email: userData.email }
        });
        
        if (emailExists) {
          return ApiResponse.badRequest('El email ya está en uso');
        }
      }
      
      // Verificar que el centro existe si se está asignando
      if (userData.centerId) {
        const centerExists = await db.center.findUnique({
          where: { id: userData.centerId }
        });
        
        if (!centerExists) {
          return ApiResponse.badRequest('Centro no encontrado');
        }
      }
      
      // Preparar datos para actualización
      const updateData: any = {
        ...userData
      };
      
      // Hashear contraseña si se proporciona
      if (userData.password) {
        updateData.password = await hashPassword(userData.password);
      }
      
      // Actualizar usuario
      const updatedUser = await db.user.update({
        where: { id: userId },
        data: updateData,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        }
      });
      
      // Registro de auditoría omitido (modelo no disponible en el esquema actual)
      
      return ApiResponse.success(updatedUser);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return ApiResponse.validation(
          error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          }))
        );
      }
      
      console.error('Error actualizando usuario:', error);
      return ApiResponse.internalError('Error interno del servidor');
    }
  })(request);
}

/**
 * DELETE /api/admin/users/[id]
 * Eliminar un usuario específico (soft delete)
 * Acceso: ADMIN únicamente
 */
export async function DELETE(request: NextRequest) {
  return withAdminMiddleware(async (req) => {
    try {
      const adminUser = (req as any).user;
      const pathname = req.nextUrl.pathname;
      const userId = pathname.split('/').pop() as string;
      
      // Verificar que el usuario existe
      const existingUser = await db.user.findUnique({
        where: { id: userId },
        include: {
          reservations: {
            where: {
              status: { in: ['PAID', 'IN_PROGRESS', 'COMPLETED'] },
              startTime: {
                gte: new Date()
              }
            }
          },
          memberships: {
            where: {
              status: 'ACTIVE',
              validUntil: {
                gte: new Date()
              }
            }
          }
        }
      });
      
      if (!existingUser) {
        return ApiResponse.notFound('Usuario no encontrado');
      }
      
      // Verificar que no sea el mismo admin
      if (userId === adminUser?.id) {
        return ApiResponse.badRequest('No puedes eliminar tu propia cuenta');
      }
      
      // Verificar si tiene reservas o membresías activas
      if (existingUser.reservations.length > 0 || existingUser.memberships.length > 0) {
        return ApiResponse.badRequest(
          'No se puede eliminar el usuario porque tiene reservas o membresías activas'
        );
      }
      
      // Realizar soft delete
      const deletedUser = await db.user.update({
        where: { id: userId },
        data: {
          isActive: false,
          email: `deleted_${Date.now()}_${existingUser.email}`
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          isActive: true
        }
      });
      
      // Registro de auditoría omitido (modelo no disponible en el esquema actual)
      
      return ApiResponse.success(deletedUser);
    } catch (error) {
      console.error('Error eliminando usuario:', error);
      return ApiResponse.internalError('Error interno del servidor');
    }
  })(request);
}

/**
 * OPTIONS /api/admin/users/[id]
 * Manejar preflight requests
 */
export async function OPTIONS() {
  return ApiResponse.success(null);
}