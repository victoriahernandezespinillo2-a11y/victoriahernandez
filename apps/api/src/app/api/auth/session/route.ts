/**
 * API Route para gestión de sesión
 * GET /api/auth/session - Obtener sesión actual
 * POST /api/auth/session - Renovar tokens
 */

import { NextRequest } from 'next/server';
import { AuthService, RefreshTokenSchema } from '@/lib/services/auth.service';
import { withAuthMiddleware, withPublicMiddleware, ApiResponse } from '@/lib/middleware';
import { z } from 'zod';

const authService = new AuthService();

/**
 * GET /api/auth/session
 * Obtener información de la sesión actual
 * Acceso: Usuario autenticado
 */
export async function GET(request: NextRequest) {
  return withAuthMiddleware(async (req, context) => {
    try {
      const user = (context as any)?.user;
      return ApiResponse.success({
        user,
        isAuthenticated: true
      });
    } catch (error) {
      console.error('Error obteniendo sesión:', error);
      return ApiResponse.internalError('Error interno del servidor');
    }
  })(request);
}

/**
 * POST /api/auth/session
 * Renovar tokens de acceso
 * Acceso: Público (requiere refresh token válido)
 */
export async function POST(request: NextRequest) {
  return withPublicMiddleware(async (req) => {
    try {
      const body = await req.json();
      
      const tokens = await authService.refreshTokens(body);
      
      return ApiResponse.success(tokens);
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
          return ApiResponse.unauthorized('Token de renovación inválido o expirado');
        }
        if (error.message.includes('desactivado')) {
          return ApiResponse.forbidden('Usuario desactivado');
        }
      }
      
      console.error('Error renovando tokens:', error);
      return ApiResponse.internalError('Error interno del servidor');
    }
  })(request);
}

/**
 * OPTIONS /api/auth/session
 * Manejar preflight requests
 */
export async function OPTIONS() {
  return ApiResponse.success(null);
}