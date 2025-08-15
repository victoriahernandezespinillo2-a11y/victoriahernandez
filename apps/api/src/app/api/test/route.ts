import { NextRequest, NextResponse } from 'next/server';

// Endpoint de prueba sin autenticación
export async function GET() {
  console.log('🧪 [TEST] Endpoint de prueba llamado');
  
  const response = NextResponse.json({
    message: 'Endpoint de prueba funcionando',
    timestamp: new Date().toISOString(),
    port: 3002
  });
  
  // Añadir headers CORS manualmente para este endpoint de prueba
  response.headers.set('Access-Control-Allow-Origin', 'http://localhost:3001');
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie');
  
  return response;
}

export async function OPTIONS() {
  console.log('🧪 [TEST] OPTIONS preflight para endpoint de prueba');
  
  const response = new NextResponse(null, { status: 200 });
  
  // Headers CORS para preflight
  response.headers.set('Access-Control-Allow-Origin', 'http://localhost:3001');
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie');
  
  return response;
}