import { NextRequest, NextResponse } from 'next/server';

// Lista de orígenes permitidos
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001', 
  'http://localhost:3002',
  'https://polideportivo-web.vercel.app',
  'https://polideportivo-admin.vercel.app'
];

// Función reutilizable para añadir headers CORS
function addCorsHeaders(response: NextResponse, origin?: string | null): NextResponse {
  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
  }
  
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  
  return response;
}

type ApiHandler = (req: NextRequest, params: { params: any }) => Promise<NextResponse>;

type RouteHandlers = {
  GET?: ApiHandler;
  POST?: ApiHandler;
  PUT?: ApiHandler;
  DELETE?: ApiHandler;
};

export function createApiRoute(handlers: RouteHandlers) {
  const handler = async (req: NextRequest, params: { params: any }): Promise<NextResponse> => {
    const origin = req.headers.get('origin');
    
    if (req.method === 'OPTIONS') {
      const response = new NextResponse(null, { status: 204 });
      return addCorsHeaders(response, origin);
    }

    const method = req.method as keyof RouteHandlers;
    const methodHandler = handlers[method];

    if (methodHandler) {
      try {
        const response = await methodHandler(req, params);
        return addCorsHeaders(response, origin);
      } catch (error: any) {
        console.error(`❌ Error en ${method} ${req.nextUrl.pathname}:`, error);
        const response = NextResponse.json(
          { error: 'Error interno del servidor', message: error.message }, 
          { status: 500 }
        );
        return addCorsHeaders(response, origin);
      }
    }

    const response = NextResponse.json({ error: 'Método no permitido' }, { status: 405 });
    return addCorsHeaders(response, origin);
  };

  const route: any = {};
  if (handlers.GET) route.GET = handler;
  if (handlers.POST) route.POST = handler;
  if (handlers.PUT) route.PUT = handler;
  if (handlers.DELETE) route.DELETE = handler;
  
  // Siempre exportamos un manejador OPTIONS
  route.OPTIONS = async (req: NextRequest) => {
    const origin = req.headers.get('origin');
    const response = new NextResponse(null, { status: 204 });
    return addCorsHeaders(response, origin);
  };

  return route;
}
