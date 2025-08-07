/**
 * API Routes para actividad reciente del sistema
 * GET /api/admin/activity - Obtener actividad reciente
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAdminMiddleware, withCors } from '@/lib/middleware';
import { ApiResponse } from '@/lib/middleware';
import { db } from '../../../../../../../packages/db/src';

/**
 * OPTIONS /api/admin/activity
 * Manejar preflight requests de CORS
 */
export const OPTIONS = withCors(async (request: NextRequest) => {
  return new NextResponse(null, { status: 200 });
});

// Schema de validación para parámetros de consulta
const ActivityQuerySchema = z.object({
  limit: z.string().optional().transform(val => val ? parseInt(val) : 10),
  hours: z.string().optional().transform(val => val ? parseInt(val) : 24),
});

/**
 * GET /api/admin/activity
 * Obtener actividad reciente del sistema
 * Acceso: ADMIN únicamente
 */
export const GET = withAdminMiddleware(async (request: NextRequest) => {
  console.log('🎯 [ACTIVITY] Endpoint /api/admin/activity llamado');
    try {
      console.log('🔐 [ACTIVITY] Verificando autenticación...');
      const { searchParams } = request.nextUrl;
      const params = ActivityQuerySchema.parse(Object.fromEntries(searchParams.entries()));
      console.log('✅ [ACTIVITY] Parámetros parseados:', params);
      
      const hoursAgo = new Date();
      hoursAgo.setHours(hoursAgo.getHours() - params.hours);
      
      // Obtener reservas recientes
      const recentReservations = await db.reservation.findMany({
        where: {
          createdAt: {
            gte: hoursAgo
          }
        },
        include: {
          user: {
            select: {
              name: true
            }
          },
          court: {
            select: {
              name: true,
              sportType: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: Math.floor(params.limit * 0.4) // 40% del límite para reservas
      });
      
      // Obtener nuevos usuarios
      const newUsers = await db.user.findMany({
        where: {
          createdAt: {
            gte: hoursAgo
          }
        },
        select: {
          id: true,
          name: true,
          createdAt: true
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: Math.floor(params.limit * 0.3) // 30% del límite para usuarios
      });
      
      // Obtener pagos recientes (reservas pagadas)
      const recentPayments = await db.reservation.findMany({
        where: {
          status: 'paid',
          updatedAt: {
            gte: hoursAgo
          }
        },
        include: {
          user: {
            select: {
              name: true
            }
          }
        },
        orderBy: {
          updatedAt: 'desc'
        },
        take: Math.floor(params.limit * 0.3) // 30% del límite para pagos
      });
      
      // Combinar y formatear actividades
      const activities: any[] = [];
      
      // Agregar reservas
      recentReservations.forEach(reservation => {
        activities.push({
          id: `reservation-${reservation.id}`,
          type: 'reservation',
          user: reservation.user.name || 'Usuario sin nombre',
          action: 'Nueva reserva',
          target: `${reservation.court.name}`,
          time: getTimeAgo(reservation.createdAt),
          timestamp: reservation.createdAt,
          icon: 'CalendarDaysIcon'
        });
      });
      
      // Agregar nuevos usuarios
      newUsers.forEach(user => {
        activities.push({
          id: `user-${user.id}`,
          type: 'user',
          user: user.name || 'Usuario sin nombre',
          action: 'Nuevo usuario registrado',
          target: '',
          time: getTimeAgo(user.createdAt),
          timestamp: user.createdAt,
          icon: 'UsersIcon'
        });
      });
      
      // Agregar pagos
      recentPayments.forEach(payment => {
        activities.push({
          id: `payment-${payment.id}`,
          type: 'payment',
          user: payment.user.name || 'Usuario sin nombre',
          action: 'Pago completado',
          target: `$${payment.totalPrice.toLocaleString()}`,
          time: getTimeAgo(payment.updatedAt),
          timestamp: payment.updatedAt,
          icon: 'CurrencyDollarIcon'
        });
      });
      
      // Ordenar por timestamp y limitar
      const sortedActivities = activities
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, params.limit)
        .map(activity => {
          // Remover timestamp del resultado final
          const { timestamp, ...activityWithoutTimestamp } = activity;
          return activityWithoutTimestamp;
        });
      
      console.log('📊 [ACTIVITY] Actividades procesadas:', sortedActivities.length);
      console.log('📤 [ACTIVITY] Enviando respuesta exitosa');

      return ApiResponse.success({
        activities: sortedActivities,
        meta: {
          total: sortedActivities.length,
          period: `${params.hours} horas`,
          lastUpdate: new Date().toISOString()
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return ApiResponse.validation(
          error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          }))
        );
      }
      
      console.error('Error obteniendo actividad reciente:', error);
      return ApiResponse.internalError('Error interno del servidor');
    }
});

/**
 * Función helper para calcular tiempo transcurrido
 */
function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
  
  if (diffInMinutes < 1) {
    return 'Ahora';
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes} min`;
  } else if (diffInMinutes < 1440) { // 24 horas
    const hours = Math.floor(diffInMinutes / 60);
    return `${hours} hora${hours > 1 ? 's' : ''}`;
  } else {
    const days = Math.floor(diffInMinutes / 1440);
    return `${days} día${days > 1 ? 's' : ''}`;
  }
}