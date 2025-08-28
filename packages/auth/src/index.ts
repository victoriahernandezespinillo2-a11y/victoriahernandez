import NextAuth from 'next-auth';
import type { NextAuthConfig, Session, User } from 'next-auth';
import type { JWT } from 'next-auth/jwt';
import { authConfig, webAuthConfig } from './config';

// Exportar la configuración de NextAuth
const nextAuth = NextAuth(authConfig);
// Evitar fuga de tipos de Next.js en el paquete (TS2742)
type AnyRouteHandler = (...args: any[]) => any;
type Handlers = { GET: AnyRouteHandler; POST: AnyRouteHandler };
export const handlers: Handlers = nextAuth.handlers as unknown as Handlers;
export const auth: typeof nextAuth.auth = nextAuth.auth;
export const signIn = nextAuth.signIn;
export const signOut = nextAuth.signOut;

// Instancia específica para la aplicación Web (usa cookies *_web)
const nextAuthWeb = NextAuth(webAuthConfig);
export const authWeb = nextAuthWeb.auth;
export const handlersWeb = nextAuthWeb.handlers as any;

// Alias de uso para la API pública (misma cookie que la Web)
export const authApi = authWeb;

// Instancia específica para la aplicación Admin (por si se requiere a futuro)
// const nextAuthAdmin = NextAuth(adminAuthConfig);
// export const authAdmin = nextAuthAdmin.auth;

// Exportar configuración y proveedores
export { authConfig, adminAuthConfig, webAuthConfig } from './config';
export {
  providers,
  hashPassword,
  verifyPassword,
  createUser,
  emailExists,
  updateUserActivity,
  requireRole,
  requireActiveMembership,
} from './providers';

// Exportar tipos útiles
export type { Session, User } from 'next-auth';

// Middleware para proteger rutas
export const withAuth = (handler: any) => {
  return async (req: any, res: any) => {
    const session = await auth();
    
    if (!session) {
      return res.status(401).json({ error: 'No autorizado' });
    }
    
    return handler(req, res, session);
  };
};

// Middleware para proteger rutas con roles específicos
export const withRole = (allowedRoles: Role[]) => {
  return (handler: any) => {
    return async (req: any, res: any) => {
      const session = await auth();
      
      if (!session) {
        return res.status(401).json({ error: 'No autorizado' });
      }
      
      if (!allowedRoles.includes(session.user.role as Role)) {
        return res.status(403).json({ error: 'Acceso denegado' });
      }
      
      return handler(req, res, session);
    };
  };
};

// Función para obtener la sesión del servidor
export const getServerSession: typeof auth = auth;

// Hook personalizado para verificar permisos
export const usePermissions = () => {
  return {
    canManageReservations: (userRole: string) => ['admin', 'staff'].includes(userRole),
    canManageCourts: (userRole: string) => ['admin'].includes(userRole),
    canViewAnalytics: (userRole: string) => ['admin', 'staff'].includes(userRole),
    canManageUsers: (userRole: string) => ['admin'].includes(userRole),
    canManageTournaments: (userRole: string) => ['admin', 'staff'].includes(userRole),
    canManagePricing: (userRole: string) => ['admin'].includes(userRole),
  };
};

// Constantes de roles
export const ROLES = {
  ADMIN: 'admin',
  STAFF: 'staff',
  USER: 'user',
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

// Función para verificar si un usuario tiene permisos específicos
export const hasPermission = (userRole: string, requiredRoles: string[]): boolean => {
  return requiredRoles.includes(userRole);
};

// Función para obtener información del usuario actual
export const getCurrentUser = async () => {
  const session = await auth();
  return session?.user || null;
};

// Función para verificar si el usuario está autenticado
export const isAuthenticated = async (): Promise<boolean> => {
  const session = await auth();
  return !!session;
};

// Función para verificar si el usuario es administrador
export const isAdmin = async (): Promise<boolean> => {
  const session = await auth();
  return session?.user?.role === ROLES.ADMIN;
};

// Función para verificar si el usuario es staff
export const isStaff = async (): Promise<boolean> => {
  const session = await auth();
  return [ROLES.ADMIN, ROLES.STAFF].includes(session?.user?.role as 'admin' | 'staff');
};