import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Permitir acceso a páginas públicas
  if (!pathname.startsWith('/dashboard')) {
    return NextResponse.next();
  }

  // Verificar autenticación usando cookies de NextAuth
  // NextAuth usa diferentes nombres de cookies según la configuración
  const sessionToken = request.cookies.get('next-auth.session-token')?.value ||
                      request.cookies.get('__Secure-next-auth.session-token')?.value ||
                      request.cookies.get('authjs.session-token')?.value;
  
  if (!sessionToken) {
    const signInUrl = new URL('/auth/signin', request.url);
    signInUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match only dashboard routes that need authentication
     */
    '/dashboard/:path*',
  ],
};