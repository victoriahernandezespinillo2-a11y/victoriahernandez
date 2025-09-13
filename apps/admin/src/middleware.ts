import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

export default async function middleware(req: NextRequest) {
  const url = new URL(req.url);

  // Permitimos la mayoría de rutas de auth, pero si ya está autenticado y visita /auth/signin, redirigimos a inicio
  const isSignIn = url.pathname === '/auth/signin';

  const cookieName = process.env.NEXTAUTH_COOKIE_NAME || 'next-auth.session-token-admin';

  // Intentar decodificar el token probando múltiples nombres de cookie (robusto en dev)
  const candidateCookieNames = [
    cookieName,
    process.env.PORT ? `next-auth.session-token-${process.env.PORT}` : undefined,
    'next-auth.session-token-admin',
    'next-auth.session-token',
    '__Secure-next-auth.session-token',
  ].filter(Boolean) as string[];

  // Evitar problema de "crypto" en middleware de Next.js
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) {
    console.error('AUTH_SECRET no definido. La autenticación de middleware no puede continuar.');
    return NextResponse.next();
  }

  let token = null as Awaited<ReturnType<typeof getToken>> | null;
  // 1) Intento genérico (deja que Auth.js detecte el nombre)
  token = await getToken({
    req,
    secret,
    secureCookie: process.env.NODE_ENV === 'production',
  });
  // 2) Intentos específicos por nombre
  if (!token) {
    for (const name of candidateCookieNames) {
      const t = await getToken({
        req,
        secret,
        secureCookie: process.env.NODE_ENV === 'production',
        cookieName: name,
      });
      if (t) { token = t; break; }
    }
  }

  // Fallback por si la cookie tiene otro nombre
  if (!token) {
    const possibleToken = await getToken({
      req,
      cookieName: '__Secure-next-auth.session-token',
      secret,
    });
    if (possibleToken) {
      token = possibleToken;
    }
  }

  // Requerir token válido, pero tolerar cookie de sesión presente en dev
  const hasSessionCookie = !!(req.cookies.get(cookieName)?.value
    || req.cookies.get('next-auth.session-token-admin')?.value
    || req.cookies.get('next-auth.session-token')?.value
    || req.cookies.get('__Secure-next-auth.session-token')?.value);
  if (!token && !hasSessionCookie) {
    return NextResponse.redirect(new URL('/auth/signin', req.url));
  }

  // Validar rol permitido (normalizado en minúsculas)
  const rawRole = (token as any)?.role;
  const role = typeof rawRole === 'string' ? rawRole.toLowerCase() : '';
  const allowedRoles = new Set(['admin','super_admin']);
  if (token && !allowedRoles.has(role)) {
    return NextResponse.redirect(new URL('/auth/unauthorized', req.url));
  }

  // Si ya está autenticado e intenta ir a /auth/signin, enviarlo a inicio
  if (isSignIn) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Excluir cualquier ruta API (toda /api/*) para que sea el backend real quien
    // valide las credenciales y roles. El middleware sólo protege páginas de UI.
    '/((?!api/|_next/static|_next/image|favicon.ico|manifest.json|sw.js|robots.txt|sitemap.xml|icon|icons|apple-touch-icon.png|auth/signin|auth/unauthorized).*)',
  ],
};