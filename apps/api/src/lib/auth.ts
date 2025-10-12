import { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { db } from '@repo/db';
import AuthService from './services/auth.service';

const authService = new AuthService();

interface AuthUser {
  id: string;
  email: string;
  role: string;
}

export async function getAuthUser(req: NextRequest): Promise<AuthUser | null> {
  try {
    console.log('🔍 [getAuthUser] Iniciando autenticación');
    
    // 1. Intentar con JWT Bearer Token
    const authHeader = req.headers.get('authorization');
    console.log('📋 [getAuthUser] Authorization header:', authHeader ? 'Presente' : 'Ausente');
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      console.log('🎫 [getAuthUser] Intentando autenticación con JWT Bearer');
      try {
        const user = await authService.getUserFromToken(token);
        if (user) {
          console.log('✅ [getAuthUser] Usuario autenticado con JWT:', user.email);
          return user;
        }
      } catch (jwtError) {
        console.log('⚠️ [getAuthUser] Error con JWT Bearer:', (jwtError as Error)?.message);
      }
    }

    // 2. Intentar con cookie de NextAuth
    console.log('🍪 [getAuthUser] Intentando autenticación con cookie NextAuth');
    const token = await getToken({ req, secret: process.env.AUTH_SECRET });
    
    if (token) {
      console.log('🎫 [getAuthUser] Token encontrado:', { sub: token.sub, id: token.id, email: token.email });
      
      // Intentar obtener userId de diferentes propiedades
      const userId = (token.sub || token.id) as string;
      const email = token.email as string;
      
      if (userId) {
        console.log('🔍 [getAuthUser] Buscando usuario por ID:', userId);
        const user = await db.user.findUnique({ 
          where: { id: userId },
          select: {
            id: true,
            email: true,
            role: true,
            isActive: true
          }
        });
        
        if (user && user.isActive) {
          console.log('✅ [getAuthUser] Usuario encontrado por ID:', user.email);
          return {
            id: user.id,
            email: user.email,
            role: user.role
          };
        }
      }
      
      // Fallback: buscar por email
      if (email) {
        console.log('🔍 [getAuthUser] Buscando usuario por email:', email);
        const user = await db.user.findUnique({ 
          where: { email },
          select: {
            id: true,
            email: true,
            role: true,
            isActive: true
          }
        });
        
        if (user && user.isActive) {
          console.log('✅ [getAuthUser] Usuario encontrado por email:', user.email);
          return {
            id: user.id,
            email: user.email,
            role: user.role
          };
        }
      }
    } else {
      console.log('⚠️ [getAuthUser] No se pudo obtener token de NextAuth');
    }

    console.log('❌ [getAuthUser] Autenticación fallida');
    return null;
  } catch (error) {
    console.error('❌ [getAuthUser] Error:', error);
    return null;
  }
}
