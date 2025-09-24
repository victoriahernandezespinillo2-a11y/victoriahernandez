import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/debug/test-endpoint
 * Endpoint de prueba simple para verificar que la API funciona
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    message: 'Endpoint de prueba funcionando',
    timestamp: new Date().toISOString(),
    path: '/api/debug/test-endpoint'
  });
}

/**
 * POST /api/debug/test-endpoint
 * Endpoint de prueba simple para verificar que la API funciona
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  
  return NextResponse.json({
    success: true,
    message: 'Endpoint de prueba POST funcionando',
    timestamp: new Date().toISOString(),
    path: '/api/debug/test-endpoint',
    receivedData: body
  });
}










































