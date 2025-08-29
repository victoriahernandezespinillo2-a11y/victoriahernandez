/**
 * API Route para sincronización de usuarios OAuth (Google, etc.)
 * POST /api/auth/oauth-sync - Asegura/obtiene el usuario en la BD y devuelve su ID local (Prisma)
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@repo/db';
import { withPublicMiddleware, ApiResponse } from '@/lib/middleware';
import { AuthService } from '@/lib/services/auth.service';

const OAuthSyncSchema = z.object({
  email: z.string().email('Email inválido'),
  name: z.string().nullable().optional(),
  image: z.string().nullable().optional(),
  provider: z.string().optional(),
});

export async function POST(req: NextRequest) {
  return withPublicMiddleware(async (request: NextRequest) => {
    try {
      const body = await request.json();
      const data = OAuthSyncSchema.parse(body);

      const { email, name, image, provider } = data;

      // 1) Buscar usuario por email
      let user = await db.user.findUnique({ where: { email } });

      if (!user) {
        // 2) Si no existe, crearlo de manera segura mediante el AuthService
        const authService = new AuthService();
        const ensured = await authService.ensureUserByEmail(email, name || undefined);
        // Refrescar desde DB para garantizar consistencia y poder actualizar avatar/lastLoginAt
        user = await db.user.update({
          where: { id: ensured.id },
          data: {
            avatar: image || ensured.avatar || null,
            lastLoginAt: new Date(),
          },
        });
      } else {
        // 3) Existe: actualizar metadatos mínimos
        user = await db.user.update({
          where: { id: user.id },
          data: {
            avatar: image || user.avatar,
            lastLoginAt: new Date(),
          },
        });
      }

      // 4) Log de seguridad best-effort
      console.log('SECURITY_EVENT:', {
        type: 'LOGIN_SUCCESS',
        userId: user.id,
        method: 'oauth',
        provider: provider || 'unknown',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date().toISOString(),
      });

      return ApiResponse.success({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.avatar,
          role: user.role,
          membershipType: user.membershipType,
          creditsBalance: user.creditsBalance,
          isActive: user.isActive,
        },
      });
    } catch (error) {
      console.error('Error en oauth-sync:', error);

      if (error instanceof z.ZodError) {
        return ApiResponse.validation(
          error.errors.map((e) => ({ field: e.path.join('.'), message: e.message }))
        );
      }

      return ApiResponse.internalError('Error interno del servidor');
    }
  })(req);
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
