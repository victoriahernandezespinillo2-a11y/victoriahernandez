import { NextRequest, NextResponse } from 'next/server';

// Configurar para usar Node.js Runtime en lugar de Edge Runtime
export const runtime = 'nodejs';

export async function GET() {
  console.log('=== TEST ENDPOINT LLAMADO ===');
  return NextResponse.json({ message: 'Test endpoint funcionando' });
}

export async function POST(request: NextRequest) {
  console.log('=== TEST POST ENDPOINT LLAMADO ===');
  try {
    const body = await request.json();
    console.log('Body recibido en test:', body);
    return NextResponse.json({ message: 'Test POST funcionando', data: body });
  } catch (error) {
    console.error('Error en test endpoint:', error);
    return NextResponse.json({ error: 'Error en test' }, { status: 500 });
  }
}