/**
 * API Route para establecer contraseña inicial (activación de cuenta)
 * POST /api/auth/set-password - Establecer contraseña con token de activación
 * 
 * Este endpoint se usa cuando un administrador crea un usuario USER sin contraseña.
 * El usuario recibe un email con un token de activación y debe establecer su contraseña.
 */

import { NextRequest } from 'next/server';
import { AuthService, ResetPasswordSchema } from '@/lib/services/auth.service';
import { withPublicMiddleware, ApiResponse } from '@/lib/middleware';
import { z } from 'zod';

const authService = new AuthService();

/**
 * POST /api/auth/set-password
 * Establecer contraseña inicial usando token de activación
 * Acceso: Público (pero requiere token válido)
 */
export async function POST(request: NextRequest) {
  return withPublicMiddleware(async (req) => {
    try {
      const body = await req.json();
      
      // Validar datos de entrada
      const validatedData = ResetPasswordSchema.parse(body);
      
      // Establecer contraseña inicial (activa la cuenta)
      await authService.setInitialPassword(validatedData);
      
      return ApiResponse.success({ 
        message: 'Contraseña establecida exitosamente. Tu cuenta ha sido activada.',
        ok: true 
      });
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
        // Mensajes de error específicos y seguros
        if (error.message.includes('inválido') || error.message.includes('expirado')) {
          return ApiResponse.badRequest('Token de activación inválido o expirado. Solicita un nuevo enlace de activación.');
        }
        if (error.message.includes('ya tiene una contraseña')) {
          return ApiResponse.badRequest('Esta cuenta ya está activada. Usa "Olvidé mi contraseña" si necesitas restablecerla.');
        }
        if (error.message.includes('al menos 8 caracteres')) {
          return ApiResponse.badRequest('La contraseña debe tener al menos 8 caracteres');
        }
        
        // Log del error para debugging (sin exponer detalles sensibles)
        console.error('[SET_PASSWORD] Error estableciendo contraseña:', {
          error: error.message,
          timestamp: new Date().toISOString()
        });
        
        return ApiResponse.badRequest(error.message);
      }
      
      console.error('[SET_PASSWORD] Error inesperado estableciendo contraseña:', error);
      return ApiResponse.internalError('Error interno del servidor al establecer la contraseña');
    }
  })(request);
}

/**
 * GET /api/auth/set-password?token=xxx
 * Validar token de activación (para verificar si es válido antes de mostrar el formulario)
 * Acceso: Público
 */
export async function GET(request: NextRequest) {
  return withPublicMiddleware(async (req) => {
    try {
      const { searchParams } = req.nextUrl;
      const token = searchParams.get('token');
      
      if (!token) {
        return ApiResponse.badRequest('Token de activación requerido');
      }
      
      // Verificar si el token es válido
      const { db } = await import('@repo/db');
      const activationToken = await db.passwordResetToken.findFirst({
        where: {
          token: token,
          expiresAt: {
            gt: new Date()
          },
          usedAt: null
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              name: true,
              password: true, // Para verificar si ya tiene contraseña
              isActive: true
            }
          }
        }
      });
      
      if (!activationToken) {
        return ApiResponse.badRequest('Token de activación inválido o expirado');
      }
      
      // Verificar que el usuario no tenga contraseña ya establecida
      if (activationToken.user.password) {
        return ApiResponse.badRequest('Esta cuenta ya está activada');
      }
      
      return ApiResponse.success({
        valid: true,
        email: activationToken.user.email,
        expiresAt: activationToken.expiresAt
      });
    } catch (error) {
      console.error('[SET_PASSWORD] Error validando token:', error);
      return ApiResponse.internalError('Error interno del servidor');
    }
  })(request);
}

/**
 * OPTIONS /api/auth/set-password
 * Manejar preflight requests
 */
export async function OPTIONS() {
  return ApiResponse.success(null);
}

