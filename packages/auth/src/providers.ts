import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import type { UserRole } from '@repo/db';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import type { Provider } from 'next-auth/providers';

// Esquema de validación para credenciales
const credentialsSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

// Esquema de validación para Firebase
const firebaseCredentialsSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Password requerido'),
  action: z.enum(['signin', 'signup']).optional(),
});

const providersList: Provider[] = [];

// Incluir Google solo si hay credenciales configuradas
// if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
//   providersList.push(
//     Google({
//       clientId: process.env.GOOGLE_CLIENT_ID,
//       clientSecret: process.env.GOOGLE_CLIENT_SECRET,
//       profile(profile) {
//         if (!profile.email) {
//           throw new Error('Email requerido para autenticación con Google');
//         }
//         const role = determineUserRole(profile.email);
//         logSecurityEvent({
//           type: 'LOGIN_ATTEMPT',
//           email: profile.email,
//           role,
//           provider: 'google'
//         });
//         return {
//           id: profile.sub,
//           email: profile.email,
//           name: profile.name,
//           image: profile.picture,
//           role,
//           creditsBalance: role === 'admin' ? 1000 : (role === 'staff' ? 500 : 0),
//         };
//       },
//     })
//   );
// }

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
        
        // Delegar autenticación a la API central
        // Estrategia robusta:
        // - Si hay URL absoluta configurada (NEXT_PUBLIC_API_URL o API_BASE_URL), usarla.
        // - Si no, usar prefijo local `/api/backend` y dejar que Next.js rewrites lo proxy a la API.
        const base = (process.env.NEXT_PUBLIC_API_URL || process.env.API_BASE_URL || '/api/backend').replace(/\/$/, '');
        const endpoint = `${base}/api/auth/signin`;
        console.log('🌐 [AUTH] Delegando credenciales a API:', endpoint);

        const resp = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: validatedCredentials.email,
            password: validatedCredentials.password,
          }),
          cache: 'no-store',
        });

        if (!resp.ok) {
          const info = await resp.text().catch(() => '');
          console.log('❌ [AUTH] API rechazó credenciales:', resp.status, info);
          return null;
        }

        const payload: any = await resp.json().catch(() => ({}));
        const data = payload?.data || payload;

        if (!data || !data.user) {
          console.log('❌ [AUTH] Respuesta de API inválida');
          return null;
        }

        const u = data.user;
        console.log('✅ [AUTH] API autenticó usuario:', { id: u.id, email: u.email, role: u.role });

        return {
          id: u.id,
          email: u.email,
          name: u.name,
          role: u.role || 'user',
          membershipType: u.membershipType || 'basic',
          creditsBalance: Number(u.creditsBalance || 0),
          isActive: u.isActive !== false,
        } as any;
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

// Proveedor de Firebase Credentials
providersList.push(
  Credentials({
    id: 'firebase-credentials',
    name: 'Firebase Credentials',
    credentials: {
      email: {
        label: 'Email',
        type: 'email',
        placeholder: 'tu@email.com'
      },
      password: {
        label: 'Contraseña',
        type: 'password'
      },
      action: {
        label: 'Action',
        type: 'text'
      }
    },
    async authorize(credentials) {
      try {
        console.log('🔥 [FIREBASE-AUTH] Iniciando proceso de autenticación Firebase...');
        console.log('🔥 [FIREBASE-AUTH] Credenciales recibidas:', { 
          email: credentials?.email, 
          hasPassword: !!credentials?.password,
          action: credentials?.action 
        });
        
        // Validar credenciales
        const validatedCredentials = firebaseCredentialsSchema.parse(credentials);
        console.log('✅ [FIREBASE-AUTH] Credenciales validadas correctamente');
        
        // Sincronizar con la base de datos local a través del endpoint Firebase en la API
        const apiBase = process.env.NEXT_PUBLIC_API_URL || process.env.API_BASE_URL || 'http://localhost:3002';
        const endpoint = `${apiBase.replace(/\/$/, '')}/api/auth/firebase-sync`;
        console.log('🌐 [FIREBASE-AUTH] Sincronizando con base de datos:', endpoint);

        const resp = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: validatedCredentials.email,
            firebaseUid: validatedCredentials.password, // El password es el UID de Firebase
            action: validatedCredentials.action || 'signin',
          }),
          cache: 'no-store',
        });

        if (!resp.ok) {
          const info = await resp.text().catch(() => '');
          console.log('❌ [FIREBASE-AUTH] API rechazó sincronización:', resp.status, info);
          return null;
        }

        const payload: any = await resp.json().catch(() => ({}));
        const data = payload?.data || payload;

        if (!data || !data.user) {
          console.log('❌ [FIREBASE-AUTH] Respuesta de API inválida');
          return null;
        }

        const u = data.user;
        console.log('✅ [FIREBASE-AUTH] Usuario sincronizado:', { id: u.id, email: u.email, role: u.role });

        return {
          id: u.id,
          email: u.email,
          name: u.name,
          role: u.role || 'user',
          membershipType: u.membershipType || 'basic',
          creditsBalance: Number(u.creditsBalance || 0),
          isActive: u.isActive !== false,
        } as any;
      } catch (error) {
        console.error('❌ [FIREBASE-AUTH] Error en autenticación Firebase:', {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          type: typeof error,
          credentials: credentials ? { 
            email: credentials.email, 
            hasPassword: !!credentials.password,
            action: credentials.action 
          } : 'undefined'
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
  const base = process.env.NEXT_PUBLIC_API_URL || process.env.API_BASE_URL || '';
  const endpoint = `${base}/api/auth/signup`;
  const resp = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      firstName: userData.name?.split(' ')[0] || userData.name || 'Usuario',
      lastName: userData.name?.split(' ').slice(1).join(' ') || '',
      email: userData.email,
      phone: userData.phone,
      password: userData.password,
      acceptTerms: true,
    }),
    cache: 'no-store',
  });
  if (!resp.ok) {
    const info = await resp.text().catch(() => '');
    throw new Error(`Signup failed: ${resp.status} ${info}`);
  }
  const payload: any = await resp.json().catch(() => ({}));
  return payload?.data || payload;
};

// Función para validar si un email ya existe
export const emailExists = async (email: string): Promise<boolean> => {
  const base = process.env.NEXT_PUBLIC_API_URL || process.env.API_BASE_URL || '';
  const endpoint = `${base}/api/auth/verify-email`;
  try {
    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
      cache: 'no-store',
    });
    if (!resp.ok) return false;
    const result: any = await resp.json().catch(() => ({}));
    const data = result?.data || result;
    return Boolean(data?.exists ?? data?.valid === false); // si endpoint devuelve exists
  } catch {
    return false;
  }
};

// Función para actualizar la última actividad del usuario
export const updateUserActivity = async (userId: string) => {
  const base = process.env.NEXT_PUBLIC_API_URL || process.env.API_BASE_URL || '';
  try {
    await fetch(`${base}/api/users/${userId}/activity`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'login' }),
      cache: 'no-store',
    });
  } catch {
    // no-op: telemetría best-effort
  }
};

// Configuración de seguridad centralizada
export const SECURITY_CONFIG = {
  adminEmails: [
    'admin@polideportivovictoriahernandez.es',
    'director@polideportivovictoriahernandez.es',
    'gerente@polideportivovictoriahernandez.es'
  ],
  staffDomains: ['@polideportivovictoriahernandez.es'],
  allowedProviders: ['google', 'credentials', 'firebase-credentials']
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
  const base = process.env.NEXT_PUBLIC_API_URL || process.env.API_BASE_URL || '';
  try {
    const resp = await fetch(`${base}/api/users/${userId}`, { cache: 'no-store' });
    if (!resp.ok) return false;
    const payload: any = await resp.json().catch(() => ({}));
    const u = payload?.data || payload;
    if (!u) return false;
    const exp = u.membershipExpiresAt ? new Date(u.membershipExpiresAt) : null;
    return Boolean(exp && exp > new Date());
  } catch {
    return false;
  }
};