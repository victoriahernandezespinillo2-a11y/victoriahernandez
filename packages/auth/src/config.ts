import { NextAuthConfig } from 'next-auth';
import { 
  providers, 
  SECURITY_CONFIG, 
  validateAdminEmail, 
  validateStaffDomain, 
  determineUserRole, 
  logSecurityEvent 
} from './providers';

export const authConfig: NextAuthConfig = {
  // Usamos JWT strategy, sin adapter (delegamos a la API para credenciales)
  providers,
  trustHost: true,
  // Aceptar tanto AUTH_SECRET (v5) como NEXTAUTH_SECRET (compat) con fallback seguro en dev
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || 'dev-secret-change-in-prod',
  basePath: '/api/auth',
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 días
  },
  cookies: {
    sessionToken: {
      // Nombre consistente para compartir entre puertos en desarrollo
      name: process.env.NEXTAUTH_COOKIE_NAME || 'next-auth.session-token',
      options: {
        domain: process.env.NODE_ENV === 'development' ? undefined : undefined,
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production' ? true : false,
      }
    }
  },
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.role = user.role || 'user';
        token.membershipType = user.membershipType;
        token.creditsBalance = user.creditsBalance;
      }
      return token;
    },
    async session({ session, token }) {
      // Proteger cuando no hay sesión o usuario aún (no autenticado)
      if (token && session?.user) {
        session.user.id = (token.id as string) ?? session.user.id;
        session.user.role = (token.role as string) ?? session.user.role ?? 'user';
        session.user.membershipType = (token.membershipType as string) ?? session.user.membershipType;
        session.user.creditsBalance = Number((token.creditsBalance as number) ?? session.user.creditsBalance ?? 0);
      }
      return session ?? null;
    },
    async redirect({ url, baseUrl }) {
      try {
        const target = new URL(url, baseUrl);
        const base = new URL(baseUrl);
        // Forzar redirección al mismo origen (evita salto a 3001 desde 3003)
        if (target.origin !== base.origin) {
          return base.origin + '/';
        }
        return target.toString();
      } catch {
        return baseUrl + '/';
      }
    },
    async signIn({ user, account, profile }) {
      try {
        const email = user.email || profile?.email;
        
        if (!email) {
          logSecurityEvent({
            type: 'LOGIN_FAILED',
            email: 'unknown',
            provider: account?.provider
          });
          return false;
        }
        
        // Validar proveedor autorizado
        if (account?.provider && !SECURITY_CONFIG.allowedProviders.includes(account.provider)) {
          logSecurityEvent({
            type: 'UNAUTHORIZED_ACCESS',
            email,
            provider: account.provider
          });
          return false;
        }
        
        // Validaciones específicas para OAuth
        if (account?.provider === 'google') {
          // Determinar el rol basado en el email
          const expectedRole = determineUserRole(email);
          
          // Asignar el rol determinado al usuario
          user.role = expectedRole;
          
          // Verificar autorización basada en rol determinado
          if (expectedRole === 'admin' && !validateAdminEmail(email)) {
            logSecurityEvent({
              type: 'UNAUTHORIZED_ACCESS',
              email,
              role: expectedRole,
              provider: account.provider
            });
            return false;
          }
          
          if (expectedRole === 'staff' && !validateStaffDomain(email) && !validateAdminEmail(email)) {
            logSecurityEvent({
              type: 'UNAUTHORIZED_ACCESS',
              email,
              role: expectedRole,
              provider: account.provider
            });
            return false;
          }
        }
        
        // Log de acceso exitoso
        logSecurityEvent({
          type: 'LOGIN_SUCCESS',
          email,
          role: user.role,
          provider: account?.provider
        });
        
        return true;
      } catch (error) {
        console.error('Error en validación de signIn:', error);
        logSecurityEvent({
          type: 'LOGIN_FAILED',
          email: user.email || 'unknown',
          provider: account?.provider
        });
        return false;
      }
    },
  },
  // Comentamos los eventos que usan la base de datos
  // events: {
  //   async signIn({ user, account, profile, isNewUser }) {
  //     if (isNewUser && user.email) {
  //       // Crear evento de nuevo usuario
  //       await db.outboxEvent.create({
  //         data: {
  //           eventType: 'USER_REGISTERED',
  //           eventData: {
  //             userId: user.id,
  //             email: user.email,
  //             name: user.name,
  //             provider: account?.provider
  //           }
  //         }
  //       });
  //     }
  //   },
  // },
  debug: process.env.NODE_ENV === 'development',
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