/**
 * API Route para solicitar restablecimiento de contraseña
 * POST /api/auth/forgot-password - Solicitar restablecimiento
 */

import { NextRequest } from 'next/server';
import { AuthService, ForgotPasswordSchema } from '@/lib/services/auth.service';
import { withPublicMiddleware, ApiResponse } from '@/lib/middleware';
import { z } from 'zod';

const authService = new AuthService();

/**
 * POST /api/auth/forgot-password
 * Solicitar restablecimiento de contraseña
 * Acceso: Público
 */
export async function POST(request: NextRequest) {
  return withPublicMiddleware(async (req) => {
    try {
      const body = await req.json();
      
      await authService.forgotPassword(body);
      
      // Por seguridad, siempre devolver el mismo mensaje
      return ApiResponse.success(
        null, 
        'Si el email existe en nuestro sistema, recibirás un enlace para restablecer tu contraseña'
      );
    } catch (error) {
      if (error instanceof z.ZodError) {
        return ApiResponse.validation(
          error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          }))
        );
      }
      
      console.error('Error en solicitud de restablecimiento:', error);
      
      // Por seguridad, no revelar errores específicos
      return ApiResponse.success(
        null, 
        'Si el email existe en nuestro sistema, recibirás un enlace para restablecer tu contraseña'
      );
    }
  })(request);
}

/**
 * OPTIONS /api/auth/forgot-password
 * Manejar preflight requests
 */
export async function OPTIONS() {
  return ApiResponse.success(null);
}