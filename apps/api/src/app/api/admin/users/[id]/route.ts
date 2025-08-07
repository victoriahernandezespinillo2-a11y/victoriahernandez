/**
 * API Routes para administración de usuarios específicos
 * GET /api/admin/users/[id] - Obtener detalles de un usuario específico
 * PUT /api/admin/users/[id] - Actualizar un usuario específico
 * DELETE /api/admin/users/[id] - Eliminar un usuario específico
 */

import { NextRequest } from 'next/server';
import { withAdminMiddleware, ApiResponse } from '@/lib/middleware';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

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
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAdminMiddleware(async (req) => {
    try {
      const userId = params.id;
      
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          center: {
            select: {
              id: true,
              name: true,
              address: true
            }
          },
          reservations: {
            select: {
              id: true,
              startTime: true,
              endTime: true,
              status: true,
              totalAmount: true,
              court: {
                select: {
                  id: true,
                  name: true,
                  sport: true
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
              startDate: true,
              endDate: true,
              price: true
            },
            orderBy: {
              createdAt: 'desc'
            },
            take: 5
          },
          payments: {
            select: {
              id: true,
              amount: true,
              status: true,
              method: true,
              createdAt: true
            },
            orderBy: {
              createdAt: 'desc'
            },
            take: 10
          },
          _count: {
            select: {
              reservations: true,
              memberships: true,
              payments: true
            }
          }
        }
      });
      
      if (!user) {
        return ApiResponse.notFound('Usuario no encontrado');
      }
      
      // Calcular estadísticas adicionales
      const [totalSpent, activeReservations, activeMemberships] = await Promise.all([
        prisma.payment.aggregate({
          where: {
            userId: userId,
            status: 'COMPLETED'
          },
          _sum: {
            amount: true
          }
        }),
        prisma.reservation.count({
          where: {
            userId: userId,
            status: 'CONFIRMED',
            startTime: {
              gte: new Date()
            }
          }
        }),
        prisma.membership.count({
          where: {
            userId: userId,
            status: 'ACTIVE',
            endDate: {
              gte: new Date()
            }
          }
        })
      ]);
      
      const userDetails = {
        ...user,
        password: undefined, // No incluir la contraseña
        stats: {
          totalSpent: totalSpent._sum.amount || 0,
          totalReservations: user._count.reservations,
          totalMemberships: user._count.memberships,
          totalPayments: user._count.payments,
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
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAdminMiddleware(async (req, { user: adminUser }) => {
    try {
      const userId = params.id;
      const body = await req.json();
      const userData = UpdateUserSchema.parse(body);
      
      // Verificar que el usuario existe
      const existingUser = await prisma.user.findUnique({
        where: { id: userId }
      });
      
      if (!existingUser) {
        return ApiResponse.notFound('Usuario no encontrado');
      }
      
      // Verificar email único si se está actualizando
      if (userData.email && userData.email !== existingUser.email) {
        const emailExists = await prisma.user.findUnique({
          where: { email: userData.email }
        });
        
        if (emailExists) {
          return ApiResponse.badRequest('El email ya está en uso');
        }
      }
      
      // Verificar que el centro existe si se está asignando
      if (userData.centerId) {
        const centerExists = await prisma.center.findUnique({
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
        updateData.password = await bcrypt.hash(userData.password, 12);
      }
      
      // Actualizar usuario
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: updateData,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          role: true,
          status: true,
          centerId: true,
          preferences: true,
          profile: true,
          createdAt: true,
          updatedAt: true,
          center: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });
      
      // Registrar en log de auditoría
      await prisma.auditLog.create({
        data: {
          action: 'UPDATE_USER',
          entityType: 'USER',
          entityId: userId,
          userId: adminUser.id,
          details: {
            updatedFields: Object.keys(userData),
            previousData: {
              email: existingUser.email,
              role: existingUser.role,
              status: existingUser.status
            },
            newData: {
              email: updatedUser.email,
              role: updatedUser.role,
              status: updatedUser.status
            }
          }
        }
      });
      
      return ApiResponse.success(updatedUser, 'Usuario actualizado exitosamente');
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
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAdminMiddleware(async (req, { user: adminUser }) => {
    try {
      const userId = params.id;
      
      // Verificar que el usuario existe
      const existingUser = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          reservations: {
            where: {
              status: 'CONFIRMED',
              startTime: {
                gte: new Date()
              }
            }
          },
          memberships: {
            where: {
              status: 'ACTIVE',
              endDate: {
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
      if (userId === adminUser.id) {
        return ApiResponse.badRequest('No puedes eliminar tu propia cuenta');
      }
      
      // Verificar si tiene reservas o membresías activas
      if (existingUser.reservations.length > 0 || existingUser.memberships.length > 0) {
        return ApiResponse.badRequest(
          'No se puede eliminar el usuario porque tiene reservas o membresías activas'
        );
      }
      
      // Realizar soft delete
      const deletedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          status: 'INACTIVE',
          email: `deleted_${Date.now()}_${existingUser.email}`,
          deletedAt: new Date()
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          status: true,
          deletedAt: true
        }
      });
      
      // Registrar en log de auditoría
      await prisma.auditLog.create({
        data: {
          action: 'DELETE_USER',
          entityType: 'USER',
          entityId: userId,
          userId: adminUser.id,
          details: {
            deletedUser: {
              name: `${existingUser.firstName} ${existingUser.lastName}`,
              email: existingUser.email,
              role: existingUser.role
            }
          }
        }
      });
      
      return ApiResponse.success(deletedUser, 'Usuario eliminado exitosamente');
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