/**
 * API Routes para cambio de contraseña
 * PUT /api/users/password - Cambiar contraseña del usuario autenticado
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { UserService, UpdatePasswordSchema } from '../../../../lib/services/user.service';
import { withAuthMiddleware, ApiResponse, AuthenticatedContext } from '../../../../lib/middleware';

const userService = new UserService();

/**
 * PUT /api/users/password
 * Cambiar contraseña del usuario autenticado
 */
export const PUT = withAuthMiddleware(async (
  req: NextRequest,
  { user }: AuthenticatedContext
) => {
  try {
    const body = await req.json();
    
    const result = await userService.updatePassword(user.id, body);
    
    return ApiResponse.success(result);
  } catch (error) {
    console.error('Error cambiando contraseña:', error);
    
    if (error instanceof z.ZodError) {
      return ApiResponse.validation(
        error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        }))
      );
    }
    
    if (error instanceof Error) {
      if (error.message === 'Usuario no encontrado') {
        return ApiResponse.notFound('Usuario');
      }
      if (error.message === 'Contraseña actual incorrecta') {
        return ApiResponse.error(error.message, 400);
      }
    }
    
    return ApiResponse.error(
      error instanceof Error ? error.message : 'Error interno del servidor',
      500
    );
  }
});

/**
 * OPTIONS /api/users/password
 * Manejar preflight requests
 */
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}