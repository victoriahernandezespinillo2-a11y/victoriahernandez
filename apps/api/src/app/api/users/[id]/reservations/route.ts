/**
 * API Routes para reservas de usuarios
 * GET /api/users/[id]/reservations - Obtener reservas del usuario
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { UserService } from '../../../../../lib/services/user.service';
import { withAuthMiddleware, ApiResponse, AuthenticatedContext } from '../../../../../lib/middleware';

const userService = new UserService();

// Esquema de validación para parámetros de consulta
const GetUserReservationsSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  status: z.enum(['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW', 'CHECKED_IN']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

/**
 * GET /api/users/[id]/reservations
 * Obtener reservas del usuario con filtros y paginación
 * Los usuarios pueden ver sus propias reservas, STAFF/ADMIN pueden ver cualquier usuario
 */
export async function GET(req: NextRequest) {
  return withAuthMiddleware(async (request: NextRequest, context: AuthenticatedContext) => {
  try {
    const pathname = request.nextUrl.pathname;
    const userId = pathname.split('/').pop() as string;
    const { user } = context as any;
    
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