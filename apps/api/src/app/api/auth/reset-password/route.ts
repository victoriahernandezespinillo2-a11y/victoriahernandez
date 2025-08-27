/**
 * API Route para restablecer contraseña
 * POST /api/auth/reset-password - Restablecer contraseña con token
 */

import { NextRequest } from 'next/server';
import { AuthService, ResetPasswordSchema } from '@/lib/services/auth.service';
import { withPublicMiddleware, ApiResponse } from '@/lib/middleware';
import { z } from 'zod';

const authService = new AuthService();

/**
 * POST /api/auth/reset-password
 * Restablecer contraseña usando token
 * Acceso: Público
 */
export async function POST(request: NextRequest) {
  return withPublicMiddleware(async (req) => {
    try {
      const body = await req.json();
      
      await authService.resetPassword(body);
      
      return ApiResponse.success({ ok: true });
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
        if (error.message.includes('inválido') || error.message.includes('expirado')) {
          return ApiResponse.badRequest('Token de restablecimiento inválido o expirado');
        }
      }
      
      console.error('Error restableciendo contraseña:', error);
      return ApiResponse.internalError('Error interno del servidor');
    }
  })(request);
}

/**
 * OPTIONS /api/auth/reset-password
 * Manejar preflight requests
 */
export async function OPTIONS() {
  return ApiResponse.success(null);
}
