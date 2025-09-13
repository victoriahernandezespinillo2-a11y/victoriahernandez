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
import { deleteFirebaseUser, isFirebaseAdminConfigured } from '@/lib/firebase-admin';

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
 * Eliminar un usuario específico (eliminación completa)
 * Acceso: ADMIN únicamente
 */
export async function DELETE(request: NextRequest) {
  return withAdminMiddleware(async (req) => {
    try {
      const adminUser = (req as any).user;
      const pathname = req.nextUrl.pathname;
      const userId = pathname.split('/').pop() as string;
      
      console.log(`[DELETE USER] Iniciando eliminación del usuario: ${userId}`);
      
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
        console.log(`[DELETE USER] Usuario no encontrado: ${userId}`);
        return ApiResponse.notFound('Usuario no encontrado');
      }
      
      console.log(`[DELETE USER] Usuario encontrado: ${existingUser.email}`);
      
      // Verificar que no sea el mismo admin
      if (userId === adminUser?.id) {
        console.log(`[DELETE USER] Intento de auto-eliminación bloqueado: ${userId}`);
        return ApiResponse.badRequest('No puedes eliminar tu propia cuenta');
      }
      
      // Verificar si tiene reservas o membresías activas
      console.log(`[DELETE USER] Reservas activas: ${existingUser.reservations.length}, Membresías activas: ${existingUser.memberships.length}`);
      
      if (existingUser.reservations.length > 0 || existingUser.memberships.length > 0) {
        console.log(`[DELETE USER] Usuario tiene datos activos, eliminación bloqueada: ${userId}`);
        return ApiResponse.badRequest(
          'No se puede eliminar el usuario porque tiene reservas o membresías activas. ' +
          'Primero cancela todas las reservas activas y desactiva las membresías.'
        );
      }
      
      // Eliminación paso a paso (sin transacción por ahora para debug)
      console.log(`[DELETE USER] Iniciando eliminación paso a paso para: ${userId}`);
      
      let result;
      try {
        // 1. Eliminar datos relacionados primero
        console.log(`[DELETE USER] Eliminando reservas del usuario: ${userId}`);
        const deletedReservations = await db.reservation.deleteMany({
          where: { userId: userId }
        });
        console.log(`[DELETE USER] Reservas eliminadas: ${deletedReservations.count}`);
        
        console.log(`[DELETE USER] Eliminando membresías del usuario: ${userId}`);
        const deletedMemberships = await db.membership.deleteMany({
          where: { userId: userId }
        });
        console.log(`[DELETE USER] Membresías eliminadas: ${deletedMemberships.count}`);
        
        console.log(`[DELETE USER] Eliminando notificaciones del usuario: ${userId}`);
        const deletedNotifications = await db.notification.deleteMany({
          where: { userId: userId }
        });
        console.log(`[DELETE USER] Notificaciones eliminadas: ${deletedNotifications.count}`);
        
        console.log(`[DELETE USER] Eliminando usuario de la base de datos: ${userId}`);
        // 2. Eliminar el usuario de la base de datos
        result = await db.user.delete({
          where: { id: userId },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            isActive: true
          }
        });
        
        console.log(`[DELETE USER] Usuario eliminado exitosamente: ${result.email}`);
      } catch (error) {
        console.error(`[DELETE USER] Error en eliminación paso a paso para ${userId}:`, error);
        throw error;
      }
      
      // 3. Eliminar de Firebase Auth (si está configurado)
      let firebaseDeleted = false;
      if (isFirebaseAdminConfigured()) {
        try {
          firebaseDeleted = await deleteFirebaseUser(userId);
        } catch (firebaseError) {
          console.warn('No se pudo eliminar de Firebase Auth:', firebaseError);
          // No fallar la operación si Firebase falla
        }
      } else {
        console.log('Firebase Admin SDK no configurado. Usuario eliminado solo de la base de datos.');
      }
      
      // 4. Log de auditoría
      console.log(`Usuario eliminado: ${result.email} (${result.firstName} ${result.lastName}) por admin: ${adminUser.email}`);
      
      return ApiResponse.success({
        message: 'Usuario eliminado completamente',
        user: result,
        deletedAt: new Date().toISOString(),
        firebaseDeleted,
        deletedFrom: firebaseDeleted ? ['database', 'firebase'] : ['database']
      });
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