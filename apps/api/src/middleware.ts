import { NextRequest, NextResponse } from 'next/server';
import * as jwt from 'jsonwebtoken';

// ----------- CONFIGURACIÓN CENTRAL ------------
const JWT_SECRET = process.env.JWT_SECRET;

const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const publicRoutes = ['/api/auth/token', '/api/auth/firebase-sync', '/api/health'];

/**
 * Función auxiliar para crear una respuesta y añadirle siempre las cabeceras CORS.
 * Esto asegura que tanto las respuestas exitosas como las de error sean compatibles con CORS.
 */
function createCorsResponse(
  req: NextRequest,
  body: any,
  status: number
): NextResponse {
  const origin = req.headers.get('origin');
  const response = new NextResponse(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
  }
  
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  
  return response;
}

/**
 * Middleware global para la API.
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // --- 1. MANEJO DE PRE-FLIGHTS CORS ---
  if (req.method === 'OPTIONS') {
    // Para OPTIONS, devolvemos una respuesta vacía pero con todas las cabeceras CORS
    return createCorsResponse(req, null, 204);
  }

  // --- 2. VERIFICACIÓN DE RUTAS PÚBLICAS ---
  if (publicRoutes.some(path => pathname.startsWith(path))) {
    // Aunque sea pública, las respuestas de esta ruta necesitan cabeceras CORS
    const response = NextResponse.next();
    const origin = req.headers.get('origin');
    if (origin && allowedOrigins.includes(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin);
    }
    return response;
  }

  // --- 3. VERIFICACIÓN DE JWT PARA RUTAS PROTEGIDAS ---
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return createCorsResponse(req, { error: 'No autorizado - Token JWT requerido' }, 401);
  }

  const token = authHeader.replace('Bearer ', '');
  
  if (!JWT_SECRET) {
    console.error('❌ [MIDDLEWARE] JWT_SECRET no configurado');
    return createCorsResponse(req, { error: 'Error de configuración del servidor' }, 500);
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
    
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set('x-user-data', JSON.stringify(decoded));

    // Dejamos pasar la petición, pero añadimos el header CORS a la respuesta final
    const response = NextResponse.next({ request: { headers: requestHeaders } });
    const origin = req.headers.get('origin');
    if (origin && allowedOrigins.includes(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin);
    }
    return response;

  } catch (error: any) {
    let errorMessage = 'No autorizado - Token inválido';
    if (error.name === 'TokenExpiredError') {
      errorMessage = 'No autorizado - Token expirado';
    }
    return createCorsResponse(req, { error: errorMessage }, 401);
  }
}

// El matcher asegura que este middleware se ejecute para TODAS las rutas de la API
export const config = {
  matcher: '/api/:path*',
};
