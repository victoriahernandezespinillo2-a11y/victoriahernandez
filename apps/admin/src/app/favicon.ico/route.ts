import { NextResponse } from 'next/server';

// Responder al favicon para evitar 404 en desarrollo/prototipos
export async function GET() {
  // 204 No Content es suficiente para que el navegador deje de pedirlo como error
  return new NextResponse(null, { status: 204, headers: { 'Cache-Control': 'public, max-age=86400' } });
}



