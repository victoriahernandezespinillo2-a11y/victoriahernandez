import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  // Redirigir a la ruta estática del favicon
  return NextResponse.redirect(new URL('/favicon.ico', request.url))
}
