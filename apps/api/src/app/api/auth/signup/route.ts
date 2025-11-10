/**
 * API Routes para autenticación - Registro de usuarios (signup)
 * POST /api/auth/signup
 */

import { NextRequest } from 'next/server';
import { AuthService } from '@/lib/services/auth.service';
import { withPublicMiddleware, ApiResponse } from '@/lib/middleware';
import { z } from 'zod';

const authService = new AuthService();

/**
 * POST /api/auth/signup
 * Registro de nuevo usuario
 * Acceso: Público
 */
export async function POST(request: NextRequest) {
  return withPublicMiddleware(async (req) => {
    try {
      const body = await req.json();

      const result = await authService.signUp(body);

      return ApiResponse.success(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return ApiResponse.validation(
          error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          }))
        );
      }

      if (error instanceof Error && error.message.includes('ya existe')) {
        return ApiResponse.conflict(error.message);
      }

      console.error('Error en registro:', error);
      return ApiResponse.internalError('Error interno del servidor');
    }
  })(request);
}

/**
 * OPTIONS /api/auth/signup
 * Manejar preflight requests
 */
export async function OPTIONS() {
  return ApiResponse.success(null);
}
