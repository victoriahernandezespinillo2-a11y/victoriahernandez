/**
 * API Routes para actividad reciente del sistema
 * GET /api/admin/activity - Obtener actividad reciente
 */

// Asegurar runtime Node.js para Prisma
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAdminMiddleware, withCors } from '@/lib/middleware';
import { ApiResponse as API } from '@/lib/middleware';
import { db } from '@repo/db';
// Nota: evitar dependencia directa de enums generados por Prisma en el cliente
// para compatibilidad entre versiones. Usamos literales tipados cuando sea necesario.

/**
 * OPTIONS /api/admin/activity
 * Manejar preflight requests de CORS
 */
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 204 });
}

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
export async function GET(request: NextRequest) {
  return withAdminMiddleware(async (req: NextRequest) => {
    try {
      const { searchParams } = req.nextUrl;
      const params = ActivityQuerySchema.parse(Object.fromEntries(searchParams.entries()));
      
      const hoursAgo = new Date();
      hoursAgo.setHours(hoursAgo.getHours() - params.hours);
      
      const [recentReservations, newUsers, recentPayments] = await Promise.all([
        db.reservation.findMany({
          where: { createdAt: { gte: hoursAgo } },
          include: { user: { select: { name: true } }, court: { select: { name: true, sportType: true } } },
          orderBy: { createdAt: 'desc' },
          take: Math.floor(params.limit * 0.4),
        }),
        db.user.findMany({
          where: { createdAt: { gte: hoursAgo } },
          select: { id: true, name: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: Math.floor(params.limit * 0.3),
        }),
        db.reservation.findMany({
          where: { status: 'PAID' as any, updatedAt: { gte: hoursAgo } },
          include: { user: { select: { name: true } } },
          orderBy: { updatedAt: 'desc' },
          take: Math.floor(params.limit * 0.3),
        }),
      ]).catch(() => [[], [], []] as any);
      
      const activities: any[] = [];
      (recentReservations as Array<{ id: string; createdAt: Date; user?: { name?: string|null }; court?: { name?: string|null } }>).forEach((reservation) => {
        activities.push({ id: `reservation-${reservation.id}`, type: 'reservation', user: reservation.user?.name || 'Usuario', action: 'Nueva reserva', target: `${reservation.court?.name}`, time: getTimeAgo(reservation.createdAt), timestamp: reservation.createdAt, icon: 'CalendarDaysIcon' });
      });
      (newUsers as Array<{ id: string; name?: string|null; createdAt: Date }>).forEach((user) => {
        activities.push({ id: `user-${user.id}`, type: 'user', user: user.name || 'Usuario', action: 'Nuevo usuario registrado', target: '', time: getTimeAgo(user.createdAt as any), timestamp: user.createdAt as any, icon: 'UsersIcon' });
      });
      (recentPayments as Array<{ id: string; updatedAt: Date; user?: { name?: string|null } }>).forEach((payment) => {
        activities.push({ id: `payment-${payment.id}`, type: 'payment', user: payment.user?.name || 'Usuario', action: 'Pago completado', target: `$${Number((payment as any).totalPrice || 0).toLocaleString()}`, time: getTimeAgo(payment.updatedAt), timestamp: payment.updatedAt, icon: 'CurrencyDollarIcon' });
      });
      
      const sortedActivities = activities
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, params.limit)
        .map(({ timestamp, ...rest }) => rest);
      
      const res = API.success({ activities: sortedActivities, meta: { total: sortedActivities.length, period: `${params.hours} horas`, lastUpdate: new Date().toISOString() } });
      return res;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const res = API.validation(error.errors.map(err => ({ field: err.path.join('.'), message: err.message })));
        return res;
      }
      console.error('Error obteniendo actividad reciente:', error);
      const res = API.success({ activities: [], meta: { total: 0, period: '24 horas', lastUpdate: new Date().toISOString() } });
      return res;
    }
  })(request, {} as any);
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - new Date(date).getTime()) / (1000 * 60));
  if (diffInMinutes < 1) return 'Ahora';
  if (diffInMinutes < 60) return `${diffInMinutes} min`;
  if (diffInMinutes < 1440) { const hours = Math.floor(diffInMinutes / 60); return `${hours} hora${hours > 1 ? 's' : ''}`; }
  const days = Math.floor(diffInMinutes / 1440); return `${days} día${days > 1 ? 's' : ''}`;
}
