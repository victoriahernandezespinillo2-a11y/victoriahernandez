import { NextAuthConfig } from 'next-auth';
import { db } from '@repo/db';
import { 
  providers, 
  SECURITY_CONFIG, 
  validateAdminEmail, 
  validateStaffDomain, 
  determineUserRole, 
  logSecurityEvent 
} from './providers';

export const authConfig: NextAuthConfig = {
  // Usamos JWT strategy sin adapter ya que tenemos una clase DB personalizada
  // adapter: PrismaAdapter(db), // Comentado porque db no es un cliente Prisma
  providers,
  trustHost: true,
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
      name: 'next-auth.session-token',
      options: {
        domain: process.env.NODE_ENV === 'development' ? 'localhost' : undefined,
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production'
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
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.membershipType = token.membershipType as string;
        session.user.creditsBalance = token.creditsBalance as number;
      }
      return session;
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
          // Verificar autorización basada en rol
          const expectedRole = determineUserRole(email);
          
          if (user.role === 'admin' && !validateAdminEmail(email)) {
            logSecurityEvent({
              type: 'UNAUTHORIZED_ACCESS',
              email,
              role: user.role,
              provider: account.provider
            });
            return false;
          }
          
          if (user.role === 'staff' && !validateStaffDomain(email) && !validateAdminEmail(email)) {
            logSecurityEvent({
              type: 'UNAUTHORIZED_ACCESS',
              email,
              role: user.role,
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