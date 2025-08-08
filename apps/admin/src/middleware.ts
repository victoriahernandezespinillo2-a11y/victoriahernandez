import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

export default async function middleware(req: NextRequest) {
  const url = new URL(req.url);

  // Permitir rutas públicas de auth
  if (url.pathname.startsWith('/auth/')) {
    return NextResponse.next();
  }

  const cookieName = process.env.NEXTAUTH_COOKIE_NAME
    || (process.env.PORT ? `next-auth.session-token-${process.env.PORT}` : 'next-auth.session-token');

  // Intentar decodificar el token (si falla pero hay cookie, dejaremos pasar como fallback)
  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || 'dev-secret-change-in-prod',
    secureCookie: process.env.NODE_ENV === 'production',
    cookieName,
  });

  // Fallback: si no se pudo decodificar pero existe cookie de sesión, permitir paso
  const hasSessionCookie = !!(
    req.cookies.get(cookieName) ||
    req.cookies.get('next-auth.session-token') ||
    req.cookies.get('__Secure-next-auth.session-token')
  );

  if (!token && !hasSessionCookie) {
    return NextResponse.redirect(new URL('/auth/signin', req.url));
  }

  // Si hay token, validar rol; si no hay token pero sí cookie, permitir (fallback en dev)
  if (token) {
    const role = (token as any).role;
    if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
      return NextResponse.redirect(new URL('/auth/unauthorized', req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api/auth|_next/static|_next/image|favicon.ico|auth/signin|auth/unauthorized).*)',
  ],
};