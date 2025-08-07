/**
 * API Route para inicio de sesión
 * POST /api/auth/signin - Iniciar sesión
 */

import { NextRequest } from 'next/server';
import { AuthService, SignInSchema } from '@/lib/services/auth.service';
import { withPublicMiddleware, ApiResponse } from '@/lib/middleware';
import { z } from 'zod';

const authService = new AuthService();

/**
 * POST /api/auth/signin
 * Iniciar sesión
 * Acceso: Público
 */
export async function POST(request: NextRequest) {
  return withPublicMiddleware(async (req) => {
    try {
      const body = await req.json();
      
      const result = await authService.signIn(body);
      
      return ApiResponse.success(result, 'Inicio de sesión exitoso');
    } catch (error) {
      if (error instanceof z.ZodError) {
        return ApiResponse.validation(
          error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          }))
        );
      }
      
      if (error instanceof Error) {
        if (error.message.includes('Credenciales inválidas')) {
          return ApiResponse.unauthorized('Credenciales inválidas');
        }
        if (error.message.includes('desactivada')) {
          return ApiResponse.forbidden('Cuenta desactivada. Contacte al administrador');
        }
      }
      
      console.error('Error en inicio de sesión:', error);
      return ApiResponse.internalError('Error interno del servidor');
    }
  })(request);
}

/**
 * OPTIONS /api/auth/signin
 * Manejar preflight requests
 */
export async function OPTIONS() {
  return ApiResponse.success(null);
}