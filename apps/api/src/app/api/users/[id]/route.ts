/**
 * API Routes para operaciones específicas de usuarios
 * GET /api/users/[id] - Obtener usuario por ID
 * PUT /api/users/[id] - Actualizar usuario
 * DELETE /api/users/[id] - Eliminar usuario (soft delete)
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { UserService, UpdateUserSchema } from '../../../../lib/services/user.service';
import { withAuthMiddleware, withAdminMiddleware, ApiResponse, AuthenticatedContext } from '../../../../lib/middleware';

const userService = new UserService();

/**
 * GET /api/users/[id]
 * Obtener usuario por ID
 * Los usuarios pueden ver su propio perfil, STAFF/ADMIN pueden ver cualquier usuario
 */
export const GET = withAuthMiddleware(async (
  req: NextRequest,
  { params, user }: AuthenticatedContext & { params: { id: string } }
) => {
  try {
    const userId = params.id;
    
    // Verificar permisos: usuarios solo pueden ver su propio perfil
    if (user.role === 'USER' && user.id !== userId) {
      return ApiResponse.forbidden('Solo puedes ver tu propio perfil');
    }
    
    const userData = await userService.getUserById(userId);
    
    return ApiResponse.success(userData);
  } catch (error) {
    console.error('Error obteniendo usuario:', error);
    
    if (error instanceof Error && error.message === 'Usuario no encontrado') {
      return ApiResponse.notFound('Usuario');
    }
    
    return ApiResponse.error(
      error instanceof Error ? error.message : 'Error interno del servidor',
      500
    );
  }
});

/**
 * PUT /api/users/[id]
 * Actualizar usuario
 * Los usuarios pueden actualizar su propio perfil, ADMIN puede actualizar cualquier usuario
 */
export const PUT = withAuthMiddleware(async (
  req: NextRequest,
  { params, user }: AuthenticatedContext & { params: { id: string } }
) => {
  try {
    const userId = params.id;
    
    // Verificar permisos: usuarios solo pueden actualizar su propio perfil
    if (user.role === 'USER' && user.id !== userId) {
      return ApiResponse.forbidden('Solo puedes actualizar tu propio perfil');
    }
    
    const body = await req.json();
    
    const updatedUser = await userService.updateUser(userId, body);
    
    return ApiResponse.success(updatedUser);
  } catch (error) {
    console.error('Error actualizando usuario:', error);
    
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
});

/**
 * DELETE /api/users/[id]
 * Eliminar usuario (soft delete)
 * Solo ADMIN puede eliminar usuarios
 */
export const DELETE = withAdminMiddleware(async (
  req: NextRequest,
  { params }: { params: { id: string } }
) => {
  try {
    const userId = params.id;
    
    const result = await userService.deleteUser(userId);
    
    return ApiResponse.success(result);
  } catch (error) {
    console.error('Error eliminando usuario:', error);
    
    if (error instanceof Error) {
      if (error.message === 'Usuario no encontrado') {
        return ApiResponse.notFound('Usuario');
      }
      if (error.message.includes('reservas activas')) {
        return ApiResponse.error(error.message, 409);
      }
    }
    
    return ApiResponse.error(
      error instanceof Error ? error.message : 'Error interno del servidor',
      500
    );
  }
});

/**
 * OPTIONS /api/users/[id]
 * Manejar preflight requests
 */
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}