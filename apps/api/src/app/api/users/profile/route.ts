/**
 * API Routes para perfil del usuario autenticado
 * GET /api/users/profile - Obtener perfil del usuario actual
 * PUT /api/users/profile - Actualizar perfil del usuario actual
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { UserService, UpdateUserSchema } from '../../../../lib/services/user.service';
import { withAuthMiddleware, ApiResponse } from '@/lib/middleware';
import { db } from '@repo/db';

const userService = new UserService();

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/users/profile
 * Obtener perfil del usuario autenticado
 */
export async function GET(req: NextRequest) {
  return withAuthMiddleware(async (_request: NextRequest, context: any) => {
  try {
    const user = (context as any).user;
    // Tocar DB para asegurar inicialización y surfacing de errores de prisma
    await (db as any).$connect();
    const userData = await userService.getUserById(user.id);
    
    return ApiResponse.success(userData);
  } catch (error) {
    console.error('Error obteniendo perfil:', error);
    
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
 * PUT /api/users/profile
 * Actualizar perfil del usuario autenticado
 */
export async function PUT(req: NextRequest) {
  return withAuthMiddleware(async (request: NextRequest, context: any) => {
  try {
    const body = await request.json();
    const user = (context as any).user;
    await (db as any).$connect();
    const updatedUser = await userService.updateUser(user.id, body);
    
    return ApiResponse.success(updatedUser);
  } catch (error) {
    console.error('Error actualizando perfil:', error);
    
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
 * OPTIONS /api/users/profile
 * Manejar preflight requests
 */
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
