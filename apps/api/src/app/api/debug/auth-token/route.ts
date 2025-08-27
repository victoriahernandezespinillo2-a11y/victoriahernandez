import { NextRequest } from 'next/server';
import { z } from 'zod';
import * as jwt from 'jsonwebtoken';
import { ApiResponse, withPublicMiddleware } from '@/lib/middleware';
import { AuthService } from '@/lib/services/auth.service';

const authService = new AuthService();

const MintTokenSchema = z.object({
  email: z.string().email('Email inválido'),
  name: z.string().optional(),
  role: z.enum(['USER', 'STAFF', 'ADMIN']).optional().default('USER'),
  expiresIn: z.string().optional().default(process.env.JWT_EXPIRES_IN || '15m'),
});

/**
 * POST /api/debug/auth-token
 * Dev-only: Crea/asegura un usuario y genera un JWT Bearer para pruebas E2E
 */
export async function POST(request: NextRequest) {
  return withPublicMiddleware(async (req) => {
    try {
      if (process.env.NODE_ENV === 'production') {
        return ApiResponse.forbidden('Endpoint no disponible en producción');
      }

      const body = await req.json().catch(() => ({}));
      const data = MintTokenSchema.parse(body);

      // Asegurar usuario (crea si no existe y aplica roleHint de forma segura)
      const user = await authService.ensureUserByEmail(data.email, data.name, data.role);

      // Construir payload acorde al AuthService
      const payload = {
        userId: user.id,
        email: user.email,
        role: user.role,
      } as const;

      const secret = process.env.JWT_SECRET || 'your-secret-key';
      const token = jwt.sign(payload, secret as jwt.Secret, {
        expiresIn: (data.expiresIn || '15m') as jwt.SignOptions['expiresIn'],
      });

      return ApiResponse.success({
        token,
        tokenType: 'Bearer',
        expiresIn: data.expiresIn,
        user,
      });
    } catch (error: any) {
      if (error?.issues) {
        // Zod error
        return ApiResponse.validation(
          error.issues.map((issue: any) => ({
            field: issue.path.join('.'),
            message: issue.message,
          }))
        );
      }
      console.error('Error generando token de prueba:', error);
      return ApiResponse.internalError('No se pudo generar el token de prueba');
    }
  })(request, {} as any);
}
