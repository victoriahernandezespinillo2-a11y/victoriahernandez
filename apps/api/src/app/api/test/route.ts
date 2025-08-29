import { NextRequest, NextResponse } from 'next/server';

// Endpoint de prueba sin autenticación
export async function GET() {
  console.log('🧪 [TEST] Endpoint de prueba llamado');
  return NextResponse.json({
    message: 'Endpoint de prueba funcionando',
    timestamp: new Date().toISOString(),
    port: 3002
  });
}

export async function OPTIONS() {
  console.log('🧪 [TEST] OPTIONS preflight para endpoint de prueba');
  return new NextResponse(null, { status: 204 });
}
