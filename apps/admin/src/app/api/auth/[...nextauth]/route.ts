import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import type { NextAuthConfig } from 'next-auth';

const authConfig: NextAuthConfig = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        try {
          // Delegar autenticación a la API principal
          const baseUrl = (process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');
          const signinUrl = baseUrl ? `${baseUrl}/api/auth/signin` : '/api/auth/signin';
          const response = await fetch(signinUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(credentials),
          });

          if (!response.ok) {
            return null;
          }

          // La API responde con { success: true, data: { user, tokens } }
          const payload = await response.json().catch(() => null);
          const user = payload?.data?.user ?? payload?.user ?? null;

          // Validar que tenemos un usuario válido para NextAuth
          if (user && user.id) {
            return user as any;
          }
          return null;
        } catch (error) {
          console.error('Auth error:', error);
          return null;
        }
      }
    })
  ],
  session: {
    strategy: 'jwt' as const,
    maxAge: 30 * 24 * 60 * 60, // 30 días
  },
  // Alinear el nombre de la cookie de sesión con lo configurado en .env y el middleware
  cookies: {
    sessionToken: {
      name: process.env.NEXTAUTH_COOKIE_NAME || 'next-auth.session-token-admin',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        // Nota: para localhost normalmente no se especifica domain
      },
    },
  },
  callbacks: {
    async jwt({ token, user }: any) {
      if (user) {
        token.role = (user as any).role;
        token.id = (user as any).id;
      }
      // Asegurar persistencia de role e id si ya estaban en el token
      token.role = token.role ?? (token as any)?.user?.role ?? undefined;
      token.id = token.id ?? (token as any)?.user?.id ?? undefined;
      return token;
    },
    async session({ session, token }: any) {
      if (token && session?.user) {
        session.user.role = token.role as string;
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
    signOut: '/auth/signout',
    error: '/auth/error',
  },
  debug: process.env.NODE_ENV === 'development',
  // Asegurar secreto y confianza del host para evitar respuestas inconsistentes en /api/auth/session
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  trustHost: true,
  // Log sencillo para detectar causas del 500 en /api/auth/session
  logger: {
    error(error: Error) {
      // Evitar volcar datos sensibles; registrar nombre y mensaje del error
      console.error('[NextAuth][error]', error.name || 'Error', (error as any)?.code, error.message);
    },
    warn(code: string) {
      console.warn('[NextAuth][warn]', code);
    },
  },
};

// En Auth.js v5, NextAuth retorna { handlers, auth, signIn, signOut }
// En route handler, solo exportamos los handlers HTTP
const { handlers: { GET, POST } } = NextAuth(authConfig);
export { GET, POST };

export const runtime = 'nodejs';