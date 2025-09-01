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
  'https://polideportivo.com',
  'https://admin.polideportivo.com',
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
    const secretKey = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(token, secretKey, { algorithms: ['HS256'] });
    
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set('x-user-data', JSON.stringify(payload));

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
