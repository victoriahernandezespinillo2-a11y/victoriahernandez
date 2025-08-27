/**
 * API Routes para gestión de usuarios
 * GET /api/users - Obtener lista de usuarios (ADMIN/STAFF)
 * POST /api/users - Crear nuevo usuario (ADMIN)
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { UserService, CreateUserSchema, GetUsersSchema } from '../../../lib/services/user.service';
import { withAdminMiddleware, withStaffMiddleware, ApiResponse } from '@/lib/middleware';

const userService = new UserService();

/**
 * GET /api/users
 * Obtener lista de usuarios con filtros y paginación
 * Requiere rol STAFF o superior
 */
export async function GET(req: NextRequest) {
  return withStaffMiddleware(async (request: NextRequest) => {
  try {
    const { searchParams } = request.nextUrl;
    const raw = Object.fromEntries(searchParams.entries());
    const params = GetUsersSchema.parse(raw);
    const result = await userService.getUsers(params as any);
    
    return ApiResponse.success(result);
  } catch (error) {
    console.error('Error obteniendo usuarios:', error);
    
    if (error instanceof z.ZodError) {
      return ApiResponse.validation(
        error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        }))
      );
    }
    
    return ApiResponse.error(
      error instanceof Error ? error.message : 'Error interno del servidor',
      500
    );
  }
  })(req);
}

/**
 * POST /api/users
 * Crear un nuevo usuario
 * Requiere rol ADMIN
 */
export async function POST(req: NextRequest) {
  return withAdminMiddleware(async (request: NextRequest) => {
  try {
    const body = await request.json();
    
    const user = await userService.createUser(body);
    
    return ApiResponse.success(user, 201);
  } catch (error) {
    console.error('Error creando usuario:', error);
    
    if (error instanceof z.ZodError) {
      return ApiResponse.validation(
        error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        }))
      );
    }
    
    if (error instanceof Error) {
      if (error.message.includes('ya está registrado')) {
        return ApiResponse.error(error.message, 409);
      }
    }
    
    return ApiResponse.error(
      error instanceof Error ? error.message : 'Error interno del servidor',
      500
    );
  }
  })(req);
}

/**
 * OPTIONS /api/users
 * Manejar preflight requests
 */
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
