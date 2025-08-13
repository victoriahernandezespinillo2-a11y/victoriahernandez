/**
 * API Routes para estadísticas de usuarios
 * GET /api/users/[id]/stats - Obtener estadísticas del usuario
 */

import { NextRequest } from 'next/server';
import { UserService } from '../../../../../lib/services/user.service';
import { withAuthMiddleware, ApiResponse } from '../../../../../lib/middleware';

const userService = new UserService();

/**
 * GET /api/users/[id]/stats
 * Obtener estadísticas del usuario
 * Los usuarios pueden ver sus propias estadísticas, STAFF/ADMIN pueden ver cualquier usuario
 */
export async function GET(req: NextRequest) {
  return withAuthMiddleware(async (request: NextRequest, context: any) => {
  try {
    const pathname = request.nextUrl.pathname;
    const userId = pathname.split('/').pop() as string;
    const { user } = (context as any);
    
    // Verificar permisos: usuarios solo pueden ver sus propias estadísticas
    if (user.role === 'USER' && user.id !== userId) {
      return ApiResponse.forbidden('Solo puedes ver tus propias estadísticas');
    }
    
    const stats = await userService.getUserStats(userId);
    
    return ApiResponse.success(stats);
  } catch (error) {
    console.error('Error obteniendo estadísticas del usuario:', error);
    
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
 * OPTIONS /api/users/[id]/stats
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