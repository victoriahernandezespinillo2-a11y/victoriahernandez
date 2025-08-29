import { NextRequest, NextResponse } from 'next/server';

/**
 * Middleware global para manejar CORS y permitir cookies entre puertos
 */
export function middleware(request: NextRequest) {
  // Obtener el origen de la petición
  const origin = request.headers.get('origin');

  // Construir lista de orígenes permitidos a partir de variables de entorno
  const envAllowed = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  // En desarrollo añadimos orígenes locales por conveniencia
  const devOrigins = [
    'http://localhost:3001', // Web app
    'http://localhost:3003', // Admin/Docs
    'http://127.0.0.1:3001',
    'http://127.0.0.1:3003',
  ];

  const allowedOrigins = new Set<string>([
    ...envAllowed,
    ...(process.env.NODE_ENV === 'production' ? [] : devOrigins),
  ]);

  const isAllowed = origin ? allowedOrigins.has(origin) : false;

  // Crear respuesta
  const response = NextResponse.next();

  // Configurar headers CORS
  if (isAllowed && origin) {
    response.headers.set('Access-Control-Allow-Origin', origin);
  }

  // Headers CORS esenciales para cookies
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie, Set-Cookie, X-Requested-With');
  response.headers.set('Access-Control-Expose-Headers', 'Set-Cookie');

  // Manejar preflight requests
  if (request.method === 'OPTIONS') {
    const headers: Record<string, string> = {
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cookie, Set-Cookie, X-Requested-With',
      'Access-Control-Max-Age': '86400', // 24 horas
    };

    if (isAllowed && origin) {
      headers['Access-Control-Allow-Origin'] = origin;
    }

    return new Response(null, { status: 204, headers });
  }

  return response;
}

// Configurar en qué rutas aplicar el middleware
export const config = {
  matcher: [
    // Aplicar a todas las rutas de la API
    '/api/:path*',
    // Excluir archivos estáticos y _next
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};