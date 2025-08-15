import { NextRequest, NextResponse } from 'next/server';

/**
 * Middleware global para manejar CORS y permitir cookies entre puertos
 */
export function middleware(request: NextRequest) {
  // Obtener el origen de la petición
  const origin = request.headers.get('origin');
  
  // Lista de orígenes permitidos en desarrollo
  const allowedOrigins = [
    'http://localhost:3001', // Web app
    'http://localhost:3003', // Docs
    'http://127.0.0.1:3001',
    'http://127.0.0.1:3003',
  ];
  
  // En producción, añadir dominios específicos
  if (process.env.NODE_ENV === 'production') {
    // Añadir aquí los dominios de producción
    // allowedOrigins.push('https://tu-dominio.com');
  }
  
  // Crear respuesta
  const response = NextResponse.next();
  
  // Configurar headers CORS
  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
  }
  
  // Headers CORS esenciales para cookies
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie, Set-Cookie, X-Requested-With');
  response.headers.set('Access-Control-Expose-Headers', 'Set-Cookie');
  
  // Manejar preflight requests
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': origin && allowedOrigins.includes(origin) ? origin : '',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cookie, Set-Cookie, X-Requested-With',
        'Access-Control-Max-Age': '86400', // 24 horas
      },
    });
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