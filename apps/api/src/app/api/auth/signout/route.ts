/**
 * API Route para cierre de sesiÃ³n
 * POST /api/auth/signout - Cerrar sesiÃ³n
 */

import { NextRequest } from 'next/server';
import { AuthService, RefreshTokenSchema } from '@/lib/services/auth.service';
import { withAuthMiddleware, ApiResponse } from '@/lib/middleware';
import { z } from 'zod';

const authService = new AuthService();

/**
 * POST /api/auth/signout
 * Cerrar sesiÃ³n
 * Acceso: Usuario autenticado
 */
export async function POST(request: NextRequest) {
  return withAuthMiddleware(async (req) => {
    try {
      const user = (req as any).user;
      const body = await req.json();
      
      // Validar que se proporcione el refresh token
      const { refreshToken } = RefreshTokenSchema.parse(body);
      
      await authService.signOut(refreshToken);
      
      return ApiResponse.success(null);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return ApiResponse.validation(
          error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          }))
        );
      }
      
      console.error('Error en cierre de sesiÃ³n:', error);
      return ApiResponse.internalError('Error interno del servidor');
    }
  })(request);
}

/**
 * OPTIONS /api/auth/signout
 * Manejar preflight requests
 */
export async function OPTIONS() {
  return ApiResponse.success(null);
}
