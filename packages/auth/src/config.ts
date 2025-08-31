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
      // Al iniciar sesión (cuando 'user' está disponible), persistimos el ID y el rol en el token.
      // Este token cifrado (JWE) se almacena en una cookie HttpOnly.
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      // Hacemos que los datos del token (id y rol) estén disponibles en el objeto de sesión.
      // Esto es lo que se obtiene al usar `auth()` o `useSession()`.
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
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
        sameSite: process.env.NODE_ENV === 'development' ? 'lax' : 'none',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        domain: process.env.NODE_ENV === 'development' ? 'localhost' : undefined,
      },
    },
    callbackUrl: {
      name: 'next-auth.callback-url-web',
      options: {
        sameSite: process.env.NODE_ENV === 'development' ? 'lax' : 'none',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        domain: process.env.NODE_ENV === 'development' ? 'localhost' : undefined,
      },
    },
    csrfToken: {
      name: `next-auth.csrf-token-web`,
      options: {
        httpOnly: true,
        sameSite: process.env.NODE_ENV === 'development' ? 'lax' : 'none',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
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

// Declaración de módulo JWT para extender el token
declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: string;
    membershipType?: string;
    creditsBalance?: number;
  }
}