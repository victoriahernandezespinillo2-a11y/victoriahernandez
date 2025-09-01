import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { UserService } from '../../../../lib/services/user.service';
import { db } from '@repo/db';
import { getToken } from 'next-auth/jwt';
import { AuthService } from '../../../../lib/services/auth.service';

const userService = new UserService();
const authService = new AuthService();

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Helper para obtener usuario autenticado
async function getAuthenticatedUser(req: NextRequest) {
  // 1. Intentar con JWT Bearer Token
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const user = await authService.getUserFromToken(token);
    if (user) return user;
  }

  // 2. Intentar con cookie de NextAuth
  const token = await getToken({ req, secret: process.env.AUTH_SECRET });
  if (token && token.id) {
    const user = await db.user.findUnique({ 
      where: { id: token.id as string },
      select: { id: true, email: true, role: true, isActive: true }
    });
    if (user && user.isActive) return user;
  }

  return null;
}

// Helper para añadir headers CORS
function addCorsHeaders(response: NextResponse, origin?: string | null): NextResponse {
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001', 
    'http://localhost:3002',
    'https://polideportivo-web.vercel.app',
    'https://polideportivo-admin.vercel.app'
  ];
  
  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
  }
  
  response.headers.set('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  
  return response;
}

export async function GET(req: NextRequest) {
  const origin = req.headers.get('origin');
  
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      const response = NextResponse.json(
        { error: 'No autorizado - Autenticación requerida' }, 
        { status: 401 }
      );
      return addCorsHeaders(response, origin);
    }

    await (db as any).$connect();
    const userData = await userService.getUserById(user.id);
    
    const response = NextResponse.json({ 
      success: true, 
      data: userData 
    });
    return addCorsHeaders(response, origin);

  } catch (error) {
    console.error('Error obteniendo perfil:', error);
    
    let errorResponse;
    if (error instanceof Error && error.message === 'Usuario no encontrado') {
      errorResponse = NextResponse.json(
        { success: false, error: 'Usuario no encontrado' }, 
        { status: 404 }
      );
    } else {
      errorResponse = NextResponse.json(
        { 
          success: false, 
          error: error instanceof Error ? error.message : 'Error interno del servidor' 
        }, 
        { status: 500 }
      );
    }
    
    return addCorsHeaders(errorResponse, origin);
  }
}

export async function PUT(req: NextRequest) {
  const origin = req.headers.get('origin');
  
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      const response = NextResponse.json(
        { error: 'No autorizado - Autenticación requerida' }, 
        { status: 401 }
      );
      return addCorsHeaders(response, origin);
    }

    const body = await req.json();
    await (db as any).$connect();
    const updatedUser = await userService.updateUser(user.id, body);
    
    const response = NextResponse.json({ 
      success: true, 
      data: updatedUser 
    });
    return addCorsHeaders(response, origin);

  } catch (error) {
    console.error('Error actualizando perfil:', error);
    
    let errorResponse;
    if (error instanceof z.ZodError) {
      errorResponse = NextResponse.json(
        {
          success: false,
          error: 'Datos de entrada inválidos',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        },
        { status: 400 }
      );
    } else if (error instanceof Error && error.message === 'Usuario no encontrado') {
      errorResponse = NextResponse.json(
        { success: false, error: 'Usuario no encontrado' }, 
        { status: 404 }
      );
    } else {
      errorResponse = NextResponse.json(
        { 
          success: false, 
          error: error instanceof Error ? error.message : 'Error interno del servidor' 
        }, 
        { status: 500 }
      );
    }
    
    return addCorsHeaders(errorResponse, origin);
  }
}

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin');
  const response = new NextResponse(null, { status: 204 });
  return addCorsHeaders(response, origin);
}
