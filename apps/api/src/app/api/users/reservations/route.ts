/**
 * API Routes para reservas del usuario autenticado
 * GET /api/users/reservations - Obtener reservas del usuario actual
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { UserService } from '../../../../lib/services/user.service';
import { withAuthMiddleware, ApiResponse } from '../../../../lib/middleware';

const userService = new UserService();

// Esquema de validación para parámetros de consulta
const GetCurrentUserReservationsSchema = z.object({
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
 * GET /api/users/reservations
 * Obtener reservas del usuario autenticado con filtros y paginación
 */
export async function GET(req: NextRequest) {
  return withAuthMiddleware(async (request: NextRequest, context: any) => {
    try {
      const { user } = (context as any);
      const { searchParams } = request.nextUrl;
      const queryParams = Object.fromEntries(searchParams.entries());
      
      // Validar parámetros de consulta
      const validatedParams = GetCurrentUserReservationsSchema.parse(queryParams);
      
      const reservations = await userService.getUserReservations(user.id, validatedParams);
      
      return ApiResponse.success(reservations);
    } catch (error) {
      console.error('Error obteniendo reservas del usuario actual:', error);
      
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
 * OPTIONS /api/users/reservations
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