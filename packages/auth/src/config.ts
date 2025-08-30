import type { NextAuthConfig } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { providers } from './providers';

// Configuración específica para cada aplicación
const getCookieConfig = (appName: string) => {
  const baseConfig = {
    session: {
      strategy: 'jwt' as const,
      maxAge: 30 * 24 * 60 * 60, // 30 días
    },
    cookies: {
      sessionToken: {
        name: `next-auth.session-token-${appName}`,
        options: {
          httpOnly: true,
          sameSite: 'none',
          path: '/',
          secure: true,
          // Para dominios diferentes en Vercel, no podemos usar un dominio compartido
          // Las cookies deben ser específicas de cada dominio
          domain: undefined,
        },
      },
      callbackUrl: {
        name: `next-auth.callback-url-${appName}`,
        options: {
          httpOnly: true,
          sameSite: 'none',
          path: '/',
          secure: true,
          domain: undefined,
        },
      },
      csrfToken: {
        name: `next-auth.csrf-token-${appName}`,
        options: {
          httpOnly: true,
          sameSite: 'none',
          path: '/',
          secure: true,
          domain: undefined,
        },
      },
    },
  };

  return baseConfig;
};

// Configuración base de NextAuth
export const authConfig: NextAuthConfig = {
  providers,
  pages: {
    signIn: '/auth/signin',
    signOut: '/auth/signout',
    error: '/auth/error',
  },
  callbacks: {
    async jwt({ token, user }) {
      // Cuando hay `user`, estamos en el primer login del flujo.
      if (user) {
        // Intentar asegurar/obtener el usuario local (BD) por email para fijar el id correcto de Prisma.
        try {
          const base = (process.env.NEXT_PUBLIC_API_URL || process.env.API_BASE_URL || '/api/backend').replace(/\/$/, '');
          if (user.email) {
            const resp = await fetch(`${base}/api/auth/oauth-sync`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: user.email,
                name: user.name ?? null,
                image: (user as any).image ?? null,
                provider: 'oauth',
              }),
              cache: 'no-store',
            });

            if (resp.ok) {
              const payload: any = await resp.json().catch(() => ({}));
              const data = payload?.data || payload;
              if (data && data.user) {
                token.id = data.user.id as string;
                token.role = (data.user.role as any) ?? user.role;
                return token;
              }
            } else {
              const info = await resp.text().catch(() => '');
              console.log('❌ [AUTH] oauth-sync falló:', resp.status, info);
            }
          }
        } catch (err) {
          console.log('❌ [AUTH] Error llamando a oauth-sync:', err instanceof Error ? err.message : String(err));
        }

        // Fallback: mantener datos entregados por el proveedor
        token.role = (user as any).role;
        token.id = (user as any).id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.role = token.role as string;
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  debug: process.env.NODE_ENV === 'development',
};

// Configuración específica para Admin
export const adminAuthConfig: NextAuthConfig = {
  ...authConfig,
  ...getCookieConfig('admin'),
  cookies: {
    sessionToken: {
      name: 'next-auth.session-token-admin',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        domain: process.env.NODE_ENV === 'development' ? 'localhost' : undefined,
      },
    },
    callbackUrl: {
      name: 'next-auth.callback-url-admin',
      options: {
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        domain: process.env.NODE_ENV === 'development' ? 'localhost' : undefined,
      },
    },
    csrfToken: {
      name: 'next-auth.csrf-token-admin',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        domain: process.env.NODE_ENV === 'development' ? 'localhost' : undefined,
      },
    },
  },
};

// Configuración específica para Web
export const webAuthConfig: NextAuthConfig = {
  ...authConfig,
  ...getCookieConfig('web'),
  cookies: {
    sessionToken: {
      name: 'next-auth.session-token-web',
      options: {
        httpOnly: true,
        sameSite: 'none', // Cambiar a 'none' para permitir cookies cross-site
        path: '/',
        secure: true, // Siempre true para sameSite: 'none'
        domain: process.env.NODE_ENV === 'development' ? 'localhost' : undefined, // Dominio compartido para Vercel
      },
    },
    callbackUrl: {
      name: 'next-auth.callback-url-web',
      options: {
        sameSite: 'none',
        path: '/',
        secure: true,
        domain: process.env.NODE_ENV === 'development' ? 'localhost' : undefined,
      },
    },
    csrfToken: {
      name: 'next-auth.csrf-token-web',
      options: {
        httpOnly: true,
        sameSite: 'none',
        path: '/',
        secure: true,
        domain: process.env.NODE_ENV === 'development' ? 'localhost' : undefined,
      },
    },
  },
};

// Tipos extendidos para la sesión
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string;
      image?: string;
      role: string;
      membershipType?: string;
      creditsBalance: number;
    };
  }
  
  interface User {
    id?: string;
    email?: string | null;
    name?: string | null;
    image?: string | null;
    role?: string;
    membershipType?: string;
    creditsBalance?: number;
    isActive?: boolean;
  }
}

// Declaración de módulo JWT comentada para evitar errores de módulo no encontrado
// declare module '@auth/core/jwt' {
//   interface JWT {
//     id?: string;
//     role?: string;
//     membershipType?: string;
//     creditsBalance?: number;
//   }
// }