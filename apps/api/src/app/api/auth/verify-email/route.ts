/**
 * API Route para verificación de email
 * POST /api/auth/verify-email - Verificar email con token
 * PUT /api/auth/verify-email - Reenviar email de verificación
 */

import { NextRequest } from 'next/server';
import { AuthService } from '@/lib/services/auth.service';
import { withPublicMiddleware, ApiResponse } from '@/lib/middleware';
import { z } from 'zod';

const authService = new AuthService();

// Schema para verificación de email
const VerifyEmailSchema = z.object({
  token: z.string().min(1, 'Token requerido')
});

// Schema para reenvío de verificación
const ResendVerificationSchema = z.object({
  email: z.string().email('Email inválido')
});

/**
 * POST /api/auth/verify-email
 * Verificar email usando token
 * Acceso: Público
 */
export async function POST(request: NextRequest) {
  return withPublicMiddleware(async (req) => {
    try {
      const body = await req.json();
      const { token } = VerifyEmailSchema.parse(body);
      
      await authService.verifyEmail(token);
      
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
          return ApiResponse.badRequest('Token de verificación inválido o expirado');
        }
      }
      
      console.error('Error verificando email:', error);
      return ApiResponse.internalError('Error interno del servidor');
    }
  })(request);
}

/**
 * PUT /api/auth/verify-email
 * Reenviar email de verificación
 * Acceso: Público
 */
export async function PUT(request: NextRequest) {
  return withPublicMiddleware(async (req) => {
    try {
      const body = await req.json();
      const { email } = ResendVerificationSchema.parse(body);
      
      await authService.resendVerificationEmail(email);
      
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
        if (error.message.includes('no encontrado')) {
          return ApiResponse.notFound('Usuario no encontrado');
        }
        if (error.message.includes('ya está verificado')) {
          return ApiResponse.badRequest('El email ya está verificado');
        }
      }
      
      console.error('Error reenviando verificación:', error);
      return ApiResponse.internalError('Error interno del servidor');
    }
  })(request);
}

/**
 * OPTIONS /api/auth/verify-email
 * Manejar preflight requests
 */
export async function OPTIONS() {
  return ApiResponse.success(null);
}