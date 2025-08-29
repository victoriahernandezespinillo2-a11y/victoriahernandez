/**
 * API Route para generar tokens JWT para comunicación cross-domain
 * POST /api/auth/token - Genera un JWT Bearer token usando la sesión de NextAuth
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@repo/auth';
import * as jwt from 'jsonwebtoken';

export async function POST(request: NextRequest) {
  try {
    // Obtener la sesión actual de NextAuth
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No hay sesión activa' },
        { status: 401 }
      );
    }

    // Construir payload del JWT
    const payload = {
      userId: session.user.id,
      email: session.user.email,
      role: (session.user as any).role || 'USER',
      iat: Math.floor(Date.now() / 1000),
    };

    // Generar token JWT
    const secret = process.env.JWT_SECRET || process.env.AUTH_SECRET || 'dev-secret-change-in-prod';
    const token = jwt.sign(payload, secret, {
      expiresIn: '1h', // Token válido por 1 hora
    });

    return NextResponse.json({
      token,
      tokenType: 'Bearer',
      expiresIn: '1h',
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        role: (session.user as any).role || 'USER',
      },
    });
  } catch (error) {
    console.error('Error generando token JWT:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}