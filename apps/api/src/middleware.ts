import { NextRequest, NextResponse } from 'next/server';

// ----------- CORS CONFIG CENTRAL -------------
// Lista dinámica de orígenes permitidos obtenida de la env-var ALLOWED_ORIGINS
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

/**
 * Middleware global que responde a todas las solicitudes OPTIONS en /api/*
 * inyectando los encabezados CORS correctos.  
 * Se ejecuta antes de que Next resuelva los archivos de ruta, garantizando
 * una política coherente para todos los endpoints (antiguos y nuevos).
 */
export function middleware(req: NextRequest) {
  // Solo interceptamos pre-flights CORS
  if (req.method !== 'OPTIONS') return;

  const origin = req.headers.get('origin');
  const res = new NextResponse(null, { status: 204 });

  // Origin permitido
  if (origin && allowedOrigins.includes(origin)) {
    res.headers.set('Access-Control-Allow-Origin', origin);
  }

  // Cabeceras estándar
  res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.headers.set('Access-Control-Allow-Credentials', 'true');

  return res;
}

// Aplicar solo a rutas de la API
export const config = {
  matcher: '/api/:path*',
};
