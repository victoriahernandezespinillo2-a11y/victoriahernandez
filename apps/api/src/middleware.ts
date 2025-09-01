import { NextRequest, NextResponse } from 'next/server';
import * as jwt from 'jsonwebtoken';

// ----------- CONFIGURACIÓN CENTRAL ------------
const JWT_SECRET = process.env.JWT_SECRET;

const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

// Rutas públicas que no requieren autenticación JWT
const publicRoutes = [
  '/api/auth/token', 
  '/api/auth/firebase-sync',
  '/api/health'
];

/**
 * Middleware global para la API.
 * 1. Maneja pre-flights CORS (OPTIONS) para TODAS las rutas /api/*.
 * 2. Verifica el token JWT para todas las rutas protegidas.
 * 3. Si el token es válido, inyecta los datos del usuario en los headers
 *    para que los Route Handlers puedan acceder a ellos.
 */
export async function middleware(req: NextRequest) {
  const origin = req.headers.get('origin');
  const { pathname } = req.nextUrl;

  // --- 1. MANEJO DE PRE-FLIGHTS CORS ---
  if (req.method === 'OPTIONS') {
    const res = new NextResponse(null, { status: 204 });
    
    if (origin && allowedOrigins.includes(origin)) {
      res.headers.set('Access-Control-Allow-Origin', origin);
    }
    
    res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.headers.set('Access-Control-Allow-Credentials', 'true');
    
    return res;
  }

  // --- 2. VERIFICACIÓN DE RUTAS PÚBLICAS ---
  if (publicRoutes.some(path => pathname.startsWith(path))) {
    return NextResponse.next(); // No requiere JWT, continuar
  }

  // --- 3. VERIFICACIÓN DE JWT PARA RUTAS PROTEGIDAS ---
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new NextResponse(
      JSON.stringify({ error: 'No autorizado - Token JWT requerido' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const token = authHeader.replace('Bearer ', '');
  
  if (!JWT_SECRET) {
    console.error('❌ [MIDDLEWARE] JWT_SECRET no configurado');
    return new NextResponse(
      JSON.stringify({ error: 'Error de configuración del servidor' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
    
    // El token es válido. Inyectamos los datos del usuario en los headers
    // para que el siguiente eslabón (el Route Handler) los pueda leer.
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set('x-user-data', JSON.stringify(decoded));

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });

  } catch (error: any) {
    let errorMessage = 'No autorizado - Token inválido';
    if (error.name === 'TokenExpiredError') {
      errorMessage = 'No autorizado - Token expirado';
    }
    return new NextResponse(
      JSON.stringify({ error: errorMessage }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// El matcher asegura que este middleware se ejecute para TODAS las rutas de la API
export const config = {
  matcher: '/api/:path*',
};
