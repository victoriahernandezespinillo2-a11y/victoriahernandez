import { NextRequest, NextResponse } from 'next/server';
import { withAuthMiddleware } from '../../../../lib/middleware';
import { auth } from '@repo/auth';
import * as jwt from 'jsonwebtoken';
import { getToken } from 'next-auth/jwt';

export async function POST(
  req: NextRequest,
  context: { params: Promise<Record<string, string>> }
) {
  const params = await context.params;
  return withAuthMiddleware(async (r, c) => {
    try {
      const token = await getToken({ req });
      
      if (!token) {
        return NextResponse.json(
          { error: 'No autorizado - Token no válido' },
          { status: 401 }
        );
      }

      // Generar JWT para comunicación cross-domain
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        console.error('JWT_SECRET no está configurado');
        return NextResponse.json(
          { error: 'Error de configuración del servidor' },
          { status: 500 }
        );
      }

      const payload = {
        userId: token.sub,
        email: token.email,
        name: token.name,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24), // 24 horas
      };

      const jwtToken = jwt.sign(payload, jwtSecret, { algorithm: 'HS256' });

      return NextResponse.json({ token: jwtToken });
    } catch (error) {
      console.error('Error generando JWT:', error);
      return NextResponse.json(
        { error: 'Error interno del servidor' },
        { status: 500 }
      );
    }
  })(req, { params });
}

export const OPTIONS = () => new NextResponse(null, { status: 204 });
