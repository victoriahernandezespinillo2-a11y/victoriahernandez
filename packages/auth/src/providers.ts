import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import { db, UserRole } from '@repo/db';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import type { Provider } from 'next-auth/providers';

// Esquema de validación para credenciales
const credentialsSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

const providersList: Provider[] = [];

// Incluir Google solo si hay credenciales configuradas
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providersList.push(
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      profile(profile) {
        if (!profile.email) {
          throw new Error('Email requerido para autenticación con Google');
        }
        const role = determineUserRole(profile.email);
        logSecurityEvent({
          type: 'LOGIN_ATTEMPT',
          email: profile.email,
          role,
          provider: 'google'
        });
        return {
          id: profile.sub,
          email: profile.email,
          name: profile.name,
          image: profile.picture,
          role,
          creditsBalance: role === 'admin' ? 1000 : (role === 'staff' ? 500 : 0),
        };
      },
    })
  );
}

// Proveedor de credenciales (siempre disponible)
providersList.push(
  Credentials({
    name: 'credentials',
    credentials: {
      email: {
        label: 'Email',
        type: 'email',
        placeholder: 'tu@email.com'
      },
      password: {
        label: 'Contraseña',
        type: 'password'
      }
    },
    async authorize(credentials) {
      try {
        console.log('🔐 [AUTH] Iniciando proceso de autenticación...');
        console.log('🔐 [AUTH] Credenciales recibidas:', { email: credentials?.email, hasPassword: !!credentials?.password });
        
        // Validar credenciales
        const validatedCredentials = credentialsSchema.parse(credentials);
        console.log('✅ [AUTH] Credenciales validadas correctamente');
        
        // Buscar usuario en la base de datos
        console.log('🔍 [AUTH] Buscando usuario:', validatedCredentials.email);
        const user = await db.user.findUnique({
          where: { email: validatedCredentials.email }
        });
        
        if (!user) {
          console.log('❌ [AUTH] Usuario no encontrado en la base de datos');
          throw new Error('Usuario no encontrado');
        }
        
        console.log('✅ [AUTH] Usuario encontrado:', {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          isActive: user.isActive,
          hasPassword: !!user.password,
          passwordLength: user.password?.length || 0
        });
        
        // Verificar contraseña
        if (!user.password) {
          console.log('❌ [AUTH] Usuario sin contraseña configurada');
          throw new Error('Usuario sin contraseña configurada');
        }
        
        console.log('🔐 [AUTH] Verificando contraseña...');
        const isValidPassword = await verifyPassword(validatedCredentials.password, user.password);
        console.log('🔐 [AUTH] Resultado de verificación de contraseña:', isValidPassword);
        
        if (!isValidPassword) {
          console.log('❌ [AUTH] Contraseña incorrecta');
          throw new Error('Contraseña incorrecta');
        }
        
        // Verificar si el usuario está activo
        if (!user.isActive) {
          console.log('❌ [AUTH] Usuario inactivo');
          throw new Error('Usuario inactivo');
        }
        
        console.log('✅ [AUTH] Autenticación exitosa');
        
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          membershipType: user.membershipType || 'basic',
          creditsBalance: user.creditsBalance,
          isActive: user.isActive,
        };
      } catch (error) {
        console.error('❌ [AUTH] Error en autenticación:', {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          type: typeof error,
          credentials: credentials ? { email: credentials.email, hasPassword: !!credentials.password } : 'undefined'
        });
        return null;
      }
    },
  }) as unknown as Provider
);

export const providers: Provider[] = providersList;

// Funciones de utilidad para autenticación
export const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
};

export const verifyPassword = async (password: string, hashedPassword: string): Promise<boolean> => {
  return bcrypt.compare(password, hashedPassword);
};

// Función para crear un nuevo usuario
export const createUser = async (userData: {
  email: string;
  password: string;
  name?: string;
  phone?: string;
}) => {
  const hashedPassword = await hashPassword(userData.password);
  
  const user = await db.user.create({
    data: {
      email: userData.email,
      password: hashedPassword,
      name: userData.name || null,
      phone: userData.phone || null,
      role: 'USER',
      isActive: true,
      emailVerified: true,
      emailVerifiedAt: new Date(),
    }
  });
  
  return user;
};

// Función para validar si un email ya existe
export const emailExists = async (email: string): Promise<boolean> => {
  const user = await db.user.findUnique({
    where: { email }
  });
  
  return !!user;
};

// Función para actualizar la última actividad del usuario
export const updateUserActivity = async (userId: string) => {
  await db.user.update({
    where: { id: userId },
    data: { updatedAt: new Date(), lastLoginAt: new Date() }
  });
};

// Configuración de seguridad centralizada
export const SECURITY_CONFIG = {
  adminEmails: [
    'admin@polideportivo.com',
    'director@polideportivo.com',
    'gerente@polideportivo.com'
  ],
  staffDomains: ['@polideportivo.com'],
  allowedProviders: ['google', 'credentials']
};

// Función para validar emails administrativos
export const validateAdminEmail = (email: string): boolean => {
  return SECURITY_CONFIG.adminEmails.includes(email.toLowerCase());
};

// Función para validar dominios de staff
export const validateStaffDomain = (email: string): boolean => {
  return SECURITY_CONFIG.staffDomains.some(domain => 
    email.toLowerCase().endsWith(domain.toLowerCase())
  );
};

// Función para determinar rol basado en email
export const determineUserRole = (email: string): 'admin' | 'staff' | 'user' => {
  if (validateAdminEmail(email)) {
    return 'admin';
  }
  if (validateStaffDomain(email)) {
    return 'staff';
  }
  return 'user';
};

// Función de auditoría para accesos
export const logSecurityEvent = (event: {
  type: 'LOGIN_ATTEMPT' | 'LOGIN_SUCCESS' | 'LOGIN_FAILED' | 'UNAUTHORIZED_ACCESS';
  email: string;
  role?: string;
  provider?: string;
  ip?: string;
  userAgent?: string;
}) => {
  const logEntry = {
    ...event,
    timestamp: new Date().toISOString(),
    severity: event.type.includes('FAILED') || event.type.includes('UNAUTHORIZED') ? 'WARNING' : 'INFO'
  };
  
  console.log('SECURITY_EVENT:', JSON.stringify(logEntry));
  
  // En producción, enviar a sistema de monitoreo
  // await sendToSecurityMonitoring(logEntry);
};

// Middleware para verificar roles
export const requireRole = (allowedRoles: string[]) => {
  return (userRole: string) => {
    return allowedRoles.includes(userRole);
  };
};

// Middleware para verificar membresía activa
export const requireActiveMembership = async (userId: string): Promise<boolean> => {
  const user = await db.user.findUnique({ where: { id: userId } });
  
  if (!user) {
    return false;
  }
  
  // Verificar si tiene membresía activa basándose en membershipExpiresAt
  if (user.membershipExpiresAt && user.membershipExpiresAt > new Date()) {
    return true;
  }
  
  return false;
};