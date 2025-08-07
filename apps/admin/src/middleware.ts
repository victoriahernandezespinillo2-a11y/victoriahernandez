import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    // Verificar si el usuario tiene permisos de administrador
    const token = req.nextauth.token;
    
    // Si no hay token, redirigir al login
    if (!token) {
      return NextResponse.redirect(new URL('/auth/signin', req.url));
    }

    // Verificar rol de administrador
    if (token.role !== 'ADMIN' && token.role !== 'SUPER_ADMIN') {
      return NextResponse.redirect(new URL('/auth/unauthorized', req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => {
        // Permitir acceso a las páginas de auth sin token
        return true;
      },
    },
  }
);

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (NextAuth.js routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - auth/signin (login page)
     * - auth/unauthorized (unauthorized page)
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico|auth/signin|auth/unauthorized).*)',
  ],
};