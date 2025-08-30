import { NextRequest, NextResponse } from 'next/server';
import * as jwt from 'jsonwebtoken';
import { db } from '@repo/db';

export interface JwtUser {
  id: string;
  email: string;
  name: string;
  role: string;
  firebaseUid: string;
  iat: number;
  exp: number;
}

/**
 * Middleware para autenticación JWT
 * Verifica tokens JWT propios sin depender de cookies
 */
export function withJwtAuth(handler: (req: NextRequest, user: JwtUser) => Promise<NextResponse>) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      // Obtener token del header Authorization
      const authHeader = req.headers.get('authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json(
          { error: 'No autorizado - Token JWT requerido' },
          { status: 401 }
        );
      }

      const token = authHeader.replace('Bearer ', '');
      const jwtSecret = process.env.JWT_SECRET;
      
      if (!jwtSecret) {
        console.error('❌ [JWT-AUTH] JWT_SECRET no configurado');
        return NextResponse.json(
          { error: 'Error de configuración del servidor' },
          { status: 500 }
        );
      }

      // Verificar y decodificar el token
      let decoded: JwtUser;
      try {
        decoded = jwt.verify(token, jwtSecret, { algorithms: ['HS256'] }) as JwtUser;
      } catch (jwtError: any) {
        if (jwtError.name === 'TokenExpiredError') {
          return NextResponse.json(
            { error: 'No autorizado - Token expirado' },
            { status: 401 }
          );
        }
        if (jwtError.name === 'JsonWebTokenError') {
          return NextResponse.json(
            { error: 'No autorizado - Token inválido' },
            { status: 401 }
          );
        }
        throw jwtError;
      }

      // Verificar que el usuario existe y está activo
      const user = await db.user.findUnique({
        where: { id: decoded.id },
        select: { id: true, email: true, name: true, role: true, isActive: true }
      });

      if (!user || !user.isActive) {
        return NextResponse.json(
          { error: 'No autorizado - Usuario no encontrado o inactivo' },
          { status: 401 }
        );
      }

      // Verificar que el email coincida (seguridad adicional)
      if (user.email !== decoded.email) {
        console.warn('⚠️ [JWT-AUTH] Email no coincide:', { token: decoded.email, db: user.email });
        return NextResponse.json(
          { error: 'No autorizado - Token inválido' },
          { status: 401 }
        );
      }

      console.log('✅ [JWT-AUTH] Usuario autenticado:', user.email, 'Rol:', user.role);

      // Ejecutar el handler con el usuario autenticado
      return await handler(req, decoded);
    } catch (error) {
      console.error('❌ [JWT-AUTH] Error de autenticación:', error);
      return NextResponse.json(
        { error: 'Error interno del servidor' },
        { status: 500 }
      );
    }
  };
}

/**
 * Middleware para verificar roles específicos
 */
export function withRoleAuth(
  handler: (req: NextRequest, user: JwtUser) => Promise<NextResponse>,
  allowedRoles: string[]
) {
  return withJwtAuth(async (req, user) => {
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json(
        { error: 'No autorizado - Rol insuficiente' },
        { status: 403 }
      );
    }
    
    return await handler(req, user);
  });
}

/**
 * Middleware para verificar que el usuario sea propietario del recurso
 */
export function withOwnershipAuth(
  handler: (req: NextRequest, user: JwtUser) => Promise<NextResponse>,
  resourceOwnerId: string
) {
  return withJwtAuth(async (req, user) => {
    if (user.role === 'ADMIN' || user.role === 'STAFF') {
      return await handler(req, user);
    }
    
    if (user.id !== resourceOwnerId) {
      return NextResponse.json(
        { error: 'No autorizado - No puedes acceder a este recurso' },
        { status: 403 }
      );
    }
    
    return await handler(req, user);
  });
}
