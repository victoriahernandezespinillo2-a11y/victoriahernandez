/**
 * API Routes para administración de centros específicos
 * GET /api/admin/centers/[id] - Obtener detalles de un centro específico
 * PUT /api/admin/centers/[id] - Actualizar un centro específico
 * DELETE /api/admin/centers/[id] - Eliminar un centro específico
 */

import { NextRequest } from 'next/server';
import { withAdminMiddleware, ApiResponse } from '@/lib/middleware';
import { db } from '@repo/db';
import { z } from 'zod';

const UpdateCenterSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').optional(),
  description: z.string().optional(),
  address: z.string().min(5, 'La dirección debe tener al menos 5 caracteres').optional(),
  phone: z.string().optional(),
  email: z.string().email('Email inválido').optional(),
  website: z.string().url('URL inválida').optional(),
  timezone: z.string().optional(),
  dayStart: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  nightStart: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'MAINTENANCE']).optional(),
  operatingHours: z.object({
    monday: z.object({ open: z.string(), close: z.string(), closed: z.boolean() }).optional(),
    tuesday: z.object({ open: z.string(), close: z.string(), closed: z.boolean() }).optional(),
    wednesday: z.object({ open: z.string(), close: z.string(), closed: z.boolean() }).optional(),
    thursday: z.object({ open: z.string(), close: z.string(), closed: z.boolean() }).optional(),
    friday: z.object({ open: z.string(), close: z.string(), closed: z.boolean() }).optional(),
    saturday: z.object({ open: z.string(), close: z.string(), closed: z.boolean() }).optional(),
    sunday: z.object({ open: z.string(), close: z.string(), closed: z.boolean() }).optional()
  }).optional(),
  amenities: z.array(z.string()).optional(),
  policies: z.object({
    cancellation: z.string().optional(),
    payment: z.string().optional(),
    equipment: z.string().optional(),
    conduct: z.string().optional()
  }).optional(),
  location: z.object({
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zipCode: z.string().optional(),
    country: z.string().optional()
  }).optional(),
  settings: z.object({
    allowOnlineBooking: z.boolean().optional(),
    requireMembership: z.boolean().optional(),
    advanceBookingDays: z.number().int().min(1).max(365).optional(),
    maxBookingDuration: z.number().int().min(1).max(24).optional(),
    autoConfirmBookings: z.boolean().optional(),
    // Aceptar y preservar excepciones de operación por fecha
    exceptions: z
      .array(
        z.object({
          date: z.string(), // formato YYYY-MM-DD
          closed: z.boolean().optional(),
          ranges: z
            .array(
              z.object({ start: z.string(), end: z.string() })
            )
            .optional(),
        })
      )
      .optional(),
  })
    // Preservar otras claves no listadas en settings sin romper validación
    .catchall(z.any())
    .optional()
});

/**
 * GET /api/admin/centers/[id]
 * Obtener detalles completos de un centro específico
 * Acceso: ADMIN únicamente
 */
export async function GET(request: NextRequest) {
  return withAdminMiddleware(async (req) => {
    try {
      // Extraer id desde la URL
      const pathname = req.nextUrl.pathname;
      const centerId = pathname.split('/').pop() as string;
      
      const center = await db.center.findUnique({
        where: { id: centerId },
        include: {
          courts: {
            select: {
              id: true,
              name: true,
              sportType: true,
              isActive: true,
              capacity: true,
              _count: {
                select: {
                  reservations: true
                }
              }
            },
            orderBy: {
              name: 'asc'
            }
          },
          _count: {
            select: {
              courts: true
            }
          }
        }
      });
      
      if (!center) {
        return ApiResponse.notFound('Centro no encontrado');
      }
      
      // Estadísticas simplificadas - modelos de payment no disponibles
      const revenueStats = { _sum: { amount: 0 }, _count: { id: 0 } };
      const occupancyStats = { _count: { id: 0 } };
      const recentActivity: any[] = [];
      
      // Estadísticas simplificadas
      const centerDetails = {
        ...center,
        stats: {
          totalCourts: 0,
          totalUsers: 0,
          revenue30Days: 0,
          transactions30Days: 0,
          occupancyRate: 0,
          activeMaintenances: 0
        },
        recentActivity
      };
      
      return ApiResponse.success(centerDetails);
    } catch (error) {
      console.error('Error obteniendo detalles del centro:', error);
      return ApiResponse.internalError('Error interno del servidor');
    }
  })(request);
}

/**
 * PUT /api/admin/centers/[id]
 * Actualizar un centro específico
 * Acceso: ADMIN únicamente
 */
export async function PUT(request: NextRequest) {
  return withAdminMiddleware(async (req) => {
    try {
      const pathname = req.nextUrl.pathname;
      const centerId = pathname.split('/').pop() as string;
      const body = await req.json();
      const centerData = UpdateCenterSchema.parse(body);
      
      // Verificar que el centro existe
      const existingCenter = await db.center.findUnique({
        where: { id: centerId }
      });
      
      if (!existingCenter) {
        return ApiResponse.notFound('Centro no encontrado');
      }
      
      // Verificar nombre único si se está actualizando
      if (centerData.name && centerData.name !== existingCenter.name) {
        const nameExists = await db.center.findFirst({
          where: {
            name: centerData.name,
            id: {
              not: centerId
            }
          }
        });
        
        if (nameExists) {
          return ApiResponse.badRequest('Ya existe un centro con ese nombre');
        }
      }
      
      // Actualizar centro
      // Mapear datos al esquema real: name/address/phone/email directos, resto se guarda en settings
      const updateData: any = {};
      if (centerData.name) updateData.name = centerData.name;
      if (centerData.address) updateData.address = centerData.address;
      if (centerData.phone) updateData.phone = centerData.phone;
      if (centerData.email) updateData.email = centerData.email;
      // Merge settings previos con nuevos metadatos (incluye timezone/dayStart/nightStart)
      const currentCfg = await db.center.findUnique({ where: { id: centerId }, select: { settings: true } });
      const currentSettings = (currentCfg?.settings as any) || {};
      const mergedSettings: Record<string, any> = {
        ...currentSettings,
        ...(centerData.description ? { description: centerData.description } : {}),
        ...(centerData.website ? { website: centerData.website } : {}),
        ...(centerData.operatingHours ? { operatingHours: centerData.operatingHours } : {}),
        ...(centerData.amenities ? { amenities: centerData.amenities } : {}),
        ...(centerData.policies ? { policies: centerData.policies } : {}),
        ...(centerData.location ? { location: centerData.location } : {}),
        ...(centerData.settings ? (centerData.settings as any) : {}),
        ...(centerData.timezone ? { timezone: centerData.timezone } : {}),
        ...(centerData.dayStart ? { dayStart: centerData.dayStart } : {}),
        ...(centerData.nightStart ? { nightStart: centerData.nightStart } : {}),
      };
      updateData.settings = mergedSettings;

      const updatedCenter = await db.center.update({
        where: { id: centerId },
        data: updateData,
        include: {
          _count: {
            select: {
              courts: true
            }
          }
        }
      });
      
      // Log de auditoría removido temporalmente - modelo no existe en schema
      
      return ApiResponse.success(updatedCenter);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return ApiResponse.validation(
          error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          }))
        );
      }
      
      console.error('Error actualizando centro:', error);
      return ApiResponse.internalError('Error interno del servidor');
    }
  })(request);
}

/**
 * DELETE /api/admin/centers/[id]
 * Eliminar un centro específico
 * Acceso: ADMIN únicamente
 */
export async function DELETE(request: NextRequest) {
  return withAdminMiddleware(async (req) => {
    try {
      const pathname = req.nextUrl.pathname;
      const centerId = pathname.split('/').pop() as string;
      
      // Verificar que el centro existe
      const existingCenter = await db.center.findUnique({
        where: { id: centerId },
        include: {
          courts: {
            include: {
              reservations: {
                where: {
                  status: { in: ['PAID', 'IN_PROGRESS'] },
                  startTime: {
                    gte: new Date()
                  }
                }
              }
            }
          }
        }
      });
      
      if (!existingCenter) {
        return ApiResponse.notFound('Centro no encontrado');
      }
      
      // Verificar si tiene reservas futuras
      const futureReservations = (existingCenter.courts as Array<{ reservations: any[] }>).reduce(
        (total: number, court) => total + (court.reservations?.length || 0),
        0
      );
      
      if (futureReservations > 0) {
        return ApiResponse.badRequest(
          'No se puede eliminar el centro porque tiene reservas futuras'
        );
      }
      
      // Verificación de membresías removida - no existe relación directa en el modelo
      
      // Verificación de usuarios removida - no existe relación directa en el modelo
      
      // Eliminar centro (esto eliminará en cascada las canchas y otros datos relacionados)
      await db.center.delete({
        where: { id: centerId }
      });
      
      // Log de auditoría omitido (modelo no disponible en el esquema actual)
      
      return ApiResponse.success({ id: centerId, name: existingCenter.name });
    } catch (error) {
      console.error('Error eliminando centro:', error);
      return ApiResponse.internalError('Error interno del servidor');
    }
  })(request);
}

/**
 * OPTIONS /api/admin/centers/[id]
 * Manejar preflight requests
 */
export async function OPTIONS() {
  return ApiResponse.success(null);
}