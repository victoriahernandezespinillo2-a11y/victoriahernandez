import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

// ----------- CONFIGURACIÓN CENTRAL ------------
const JWT_SECRET = process.env.JWT_SECRET;

// Orígenes permitidos: usar env si existe; si no, fallback sensato según entorno
const envAllowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const defaultProdOrigins = [
  'https://polideportivovictoriahernandez.es',
  'https://admin.polideportivovictoriahernandez.es',
  'https://api.polideportivovictoriahernandez.es',
  'https://victoriahernandezweb.vercel.app',
  'https://polideportivo-api.vercel.app',
  'https://polideportivo-web.vercel.app',
  'https://polideportivo-admin.vercel.app',
  process.env.NEXT_PUBLIC_APP_URL || '',
  process.env.FRONTEND_URL || '',
].filter(Boolean);

const defaultDevOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://localhost:3003',
];

const allowedOrigins = envAllowedOrigins.length > 0
  ? envAllowedOrigins
  : (process.env.NODE_ENV === 'production' ? defaultProdOrigins : defaultDevOrigins);

const publicRoutes = ['/api/auth/token', '/api/auth/firebase-sync', '/api/health'];

/**
 * Función auxiliar para crear una respuesta y añadirle siempre las cabeceras CORS.
 */
function createCorsResponse(
  req: NextRequest,
  body: any,
  status: number
): NextResponse {
  // Para un status 204, el cuerpo DEBE ser nulo. Para otros, lo convertimos a JSON.
  const responseBody = status === 204 ? null : JSON.stringify(body);
  const headers = { 'Content-Type': 'application/json' };

  // Las respuestas 204 no deben llevar Content-Type.
  if (status === 204) {
    delete (headers as any)['Content-Type'];
  }

  const origin = req.headers.get('origin');
  const response = new NextResponse(responseBody, { status, headers });

  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
  }
  
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, Idempotency-Key');
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

  // --- 3. INTENTO OPCIONAL DE VERIFICACIÓN JWT (NO BLOQUEANTE) ---
  const authHeader = req.headers.get('authorization');
  const origin = req.headers.get('origin');

  // Preparar respuesta por defecto (passthrough) con CORS
  const passResponse = NextResponse.next();
  if (origin && allowedOrigins.includes(origin)) {
    passResponse.headers.set('Access-Control-Allow-Origin', origin);
  }
  passResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  passResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, Idempotency-Key');
  passResponse.headers.set('Access-Control-Allow-Credentials', 'true');

  // Si no hay Authorization o no hay secreto, dejar que las rutas manejen la auth (Node runtime)
  if (!authHeader || !authHeader.startsWith('Bearer ') || !JWT_SECRET) {
    if (!JWT_SECRET) {
      console.error('❌ [MIDDLEWARE] JWT_SECRET no configurado (se delega verificación a la ruta)');
    }
    return passResponse;
  }

  const token = authHeader.replace('Bearer ', '');

  try {
    const secretKey = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(token, secretKey, { algorithms: ['HS256'] });

    const requestHeaders = new Headers(req.headers);
    requestHeaders.set('x-user-data', JSON.stringify(payload));

    const response = NextResponse.next({ request: { headers: requestHeaders } });
    if (origin && allowedOrigins.includes(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin);
    }
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, Idempotency-Key');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    return response;

  } catch (error: any) {
    // No bloquear desde middleware; la ruta devolverá 401 detallado si corresponde
    return passResponse;
  }
}

// El matcher asegura que este middleware se ejecute para TODAS las rutas de la API
export const config = {
  matcher: '/api/:path*',
};
