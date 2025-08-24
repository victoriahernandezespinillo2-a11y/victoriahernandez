/**
 * API Routes para reservas de usuarios
 * GET /api/users/[id]/reservations - Obtener reservas del usuario
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { UserService } from '../../../../../lib/services/user.service';
import { withReservationMiddleware, ApiResponse } from '@/lib/middleware';

const userService = new UserService();

// Esquema de validación para parámetros de consulta
const GetUserReservationsSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  status: z.preprocess((val) => {
    if (val == null) return val as any;
    const v = String(val).toLowerCase();
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
    return (map[v] || v.toUpperCase()) as any;
  }, z.enum(['PENDING', 'PAID', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW'])).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

/**
 * GET /api/users/[id]/reservations
 * Obtener reservas del usuario con filtros y paginación
 * Los usuarios pueden ver sus propias reservas, STAFF/ADMIN pueden ver cualquier usuario
 */
export async function GET(req: NextRequest) {
  return withReservationMiddleware(async (request: NextRequest, context: any) => {
  try {
    const pathname = request.nextUrl.pathname;
    // Extract userId from path: /api/users/[id]/reservations -> get the [id] part
    const pathParts = pathname.split('/');
    const userId = pathParts[pathParts.length - 2]; // Get the ID before 'reservations'
    const { user } = (context as any);
    
    // Verificar permisos: usuarios solo pueden ver sus propias reservas
    if (user.role === 'USER' && user.id !== userId) {
      return ApiResponse.forbidden('Solo puedes ver tus propias reservas');
    }
    
    const { searchParams } = request.nextUrl;
    const queryParams = Object.fromEntries(searchParams.entries());
    
    // Validar parámetros de consulta
    const validatedParams = GetUserReservationsSchema.parse(queryParams);
    
    const reservations = await userService.getUserReservations(userId, validatedParams);
    
    return ApiResponse.success(reservations);
  } catch (error) {
    console.error('Error obteniendo reservas del usuario:', error);
    
    if (error instanceof z.ZodError) {
      return ApiResponse.validation(
        error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        }))
      );
    }
    
    if (error instanceof Error && error.message === 'Usuario no encontrado') {
      return ApiResponse.notFound('Usuario');
    }
    
    return ApiResponse.error(
      error instanceof Error ? error.message : 'Error interno del servidor',
      500
    );
  }
  })(req);
}

/**
 * OPTIONS /api/users/[id]/reservations
 * Manejar preflight requests
 */
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}