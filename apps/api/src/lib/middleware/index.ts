/**
 * Middleware centralizado para la API
 * Maneja autenticación, autorización, rate limiting y validación
 */

import { NextRequest, NextResponse } from 'next/server';
import { AppError, formatErrorResponse, ValidationAppError } from '../errors';
import { AuthService } from '../services/auth.service';

const authService = new AuthService();
import { RouteUtils, RATE_LIMITS } from '../routes';
import { z } from 'zod';
import { getToken } from 'next-auth/jwt';
import { db } from '@repo/db';

/**
 * Interfaz para el contexto de middleware
 */
export interface MiddlewareContext {
  req: NextRequest;
  params?: Record<string, string>;
  user?: {
    id: string;
    email: string;
    role: 'USER' | 'STAFF' | 'ADMIN';
    centerId?: string;
  };
}

/**
 * Tipo para handlers de middleware
 */
export type MiddlewareHandler = (
  context: MiddlewareContext
) => Promise<NextResponse | void>;

/**
 * Tipo para handlers de API
 */
export type ApiHandler = (
  req: NextRequest,
  context?: { params?: Record<string, string> }
) => Promise<NextResponse>;

/**
 * Cache simple para rate limiting
 */
class RateLimitCache {
  private cache = new Map<string, { count: number; resetTime: number }>();

  check(key: string, limit: number, windowMs: number): boolean {
    const now = Date.now();
    const entry = this.cache.get(key);

    if (!entry || now > entry.resetTime) {
      this.cache.set(key, { count: 1, resetTime: now + windowMs });
      return true;
    }

    if (entry.count >= limit) {
      return false;
    }

    entry.count++;
    return true;
  }

  cleanup(): void {
    const now = Date.now();
    const entries = Array.from(this.cache.entries());
    for (const [key, entry] of entries) {
      if (entry.resetTime <= now) {
        this.cache.delete(key);
      }
    }
  }
}

const rateLimitCache = new RateLimitCache();

// Limpiar cache cada 5 minutos
setInterval(() => rateLimitCache.cleanup(), 5 * 60 * 1000);

/**
 * Función auxiliar para añadir headers CORS
 */
const addCorsHeaders = (response: NextResponse, origin?: string | null): NextResponse => {
  // Orígenes permitidos configurables por entorno (unificado con withCors)
  const envAllowed = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const defaultProd = [
    'https://polideportivo.com',
    'https://admin.polideportivo.com',
    'https://victoriahernandezweb.vercel.app',
    'https://polideportivo-api.vercel.app',
    'https://polideportivo-web.vercel.app',
    'https://polideportivo-admin.vercel.app',
    process.env.NEXT_PUBLIC_APP_URL || '',
    process.env.FRONTEND_URL || '',
  ].filter(Boolean) as string[];
  const defaultDev = ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3003'];
  const allowedOrigins = envAllowed.length > 0
    ? envAllowed
    : (process.env.NODE_ENV === 'production' ? defaultProd : defaultDev);
  
  // Configurar headers CORS solo si no existen ya
  if (!response.headers.has('Access-Control-Allow-Origin') && origin && allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
  }
  if (!response.headers.has('Access-Control-Allow-Credentials')) {
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }
  if (!response.headers.has('Access-Control-Allow-Methods')) {
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  }
  if (!response.headers.has('Access-Control-Allow-Headers')) {
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie, Set-Cookie, X-Requested-With');
  }
  if (!response.headers.has('Access-Control-Expose-Headers')) {
    response.headers.set('Access-Control-Expose-Headers', 'Set-Cookie');
  }
  
  return response;
};

/**
 * Middleware de autenticación híbrido
 * Soporta tanto tokens JWT como cookies de NextAuth
 */
// Firebase Admin (carga perezosa para evitar fallos si no hay credenciales)
let firebaseAdmin: typeof import('firebase-admin') | null = null;
let firebaseInitialized = false;
const ensureFirebaseAdmin = () => {
  if (firebaseInitialized) return;
  try {
    // Import dinámico para evitar carga en entornos sin credenciales
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    firebaseAdmin = require('firebase-admin');

    if (!firebaseAdmin?.apps?.length) {
      // Soportar dos formas de credenciales: JSON completo o vars separadas
      const credJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
      if (credJson) {
        const parsed = JSON.parse(credJson);
        firebaseAdmin!.initializeApp({
          credential: firebaseAdmin!.credential.cert(parsed),
        });
      } else if (
        process.env.FIREBASE_PROJECT_ID &&
        process.env.FIREBASE_CLIENT_EMAIL &&
        process.env.FIREBASE_PRIVATE_KEY
      ) {
        // Reemplazar \n escapados en la private key
        const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
        firebaseAdmin!.initializeApp({
          credential: firebaseAdmin!.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey,
          }),
        });
      }
    }
    firebaseInitialized = true;
  } catch (e) {
    console.warn('⚠️ Firebase Admin no inicializado:', e);
    firebaseInitialized = false;
  }
};
export const withAuth = (handler: ApiHandler): ApiHandler => {
  return async (req: NextRequest, context) => {
    const origin = req.headers.get('origin');
    
    // Manejar preflight requests
    if (req.method === 'OPTIONS') {
      const response = new NextResponse(null, { status: 204 });
      return addCorsHeaders(response, origin);
    }
    
    try {
      let user = null;
      
      console.log('🔍 [AUTH] Iniciando autenticación híbrida');
      console.log('🔍 [AUTH] Origin:', origin);
      console.log('🔍 [AUTH] Method:', req.method);
      console.log('🔍 [AUTH] URL:', req.nextUrl.pathname);
      
      // Intentar autenticación con token JWT primero
      const authHeader = req.headers.get('authorization');
      console.log('🔑 [AUTH] Authorization header:', authHeader ? 'Presente' : 'Ausente');
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        console.log('🎫 [AUTH] Intentando autenticación JWT');
        try {
          user = await authService.getUserFromToken(token);
          console.log('✅ [AUTH] Usuario autenticado con JWT:', user?.email);
        } catch (jwtError) {
          console.log('❌ [AUTH] Error en autenticación JWT:', jwtError);
        }

        // Si no es un JWT propio, intentar como Firebase ID Token
        if (!user) {
          ensureFirebaseAdmin();
          if (firebaseInitialized && firebaseAdmin) {
            try {
              console.log('🔥 [AUTH] Intentando verificar Firebase ID Token');
              const decoded = await firebaseAdmin.auth().verifyIdToken(token, true);
              const email = decoded.email || undefined;
              const name = decoded.name || undefined;
              const firebaseUid = decoded.uid;

              // Buscar usuario por firebaseUid o email
              let local = null as any;
              if (firebaseUid) {
                local = await db.user.findFirst({ where: { firebaseUid } });
              }
              if (!local && email) {
                local = await db.user.findUnique({ where: { email } });
              }

              if (!local && email) {
                // Auto-provisionar vía ensureUserByEmail
                const ensured = await authService.ensureUserByEmail(email, name);
                // Persistir el uid de Firebase
                await db.user.update({ where: { id: ensured.id }, data: { firebaseUid } });
                local = await db.user.findUnique({ where: { id: ensured.id } });
              }

              if (local && local.isActive) {
                user = {
                  id: local.id,
                  email: local.email,
                  role: (local.role || 'USER').toUpperCase(),
                  centerId: undefined,
                } as any;
                console.log('✅ [AUTH] Usuario autenticado con Firebase:', user.email);
              } else {
                console.log('❌ [AUTH] Usuario local no encontrado o inactivo tras verificar Firebase');
              }
            } catch (fbErr) {
              console.log('❌ [AUTH] Error verificando Firebase ID Token:', fbErr);
            }
          }
        }
      }
      
      // Si no hay token JWT/Firebase, intentar con cookies de NextAuth (Auth.js v5 - JWE)
      if (!user) {
        console.log('🍪 [AUTH] Intentando autenticación con NextAuth (getToken)');
        try {
          const baseOpts = {
            req,
            secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || 'dev-secret-change-in-prod',
            secureCookie: process.env.NODE_ENV === 'production',
          } as const;

          const configuredCookieName = process.env.NEXTAUTH_COOKIE_NAME;
          const candidateNames = [
            configuredCookieName,
            // Cookies específicas por app (añadimos explícitamente las de la Web)
            'next-auth.session-token-web',
            '__Secure-next-auth.session-token-web',
            // Otras variantes comunes
            'next-auth.session-token-admin',
            'next-auth.session-token',
            '__Secure-next-auth.session-token',
            'authjs.session-token',
          ].filter(Boolean) as string[];

          let token: any = await getToken(baseOpts as any);
          if (!token) {
            for (const name of candidateNames) {
              token = await getToken({ ...(baseOpts as any), cookieName: name });
              if (token) break;
            }
          }

          // Último recurso: detectar cualquier cookie next-auth.session-token-<sufijo>
          if (!token) {
            const all = (req.cookies as any).getAll?.() || [];
            const candidate = all.find((c: any) => typeof c?.name === 'string' && c.name.startsWith('next-auth.session-token'))?.name;
            if (candidate) {
              token = await getToken({ ...(baseOpts as any), cookieName: candidate });
            }
          }

          if (token) {
            const userId = (token as any).sub || (token as any).id;
            const email = (token as any).email;
            const roleFromToken = (token as any).role || (token as any).user?.role;
            if (userId) {
              user = await authService.getUserById(userId);
            }
            // Fallback: si no hay userId o no existe, usar email del token y auto-provisionar
            if (!user && email) {
              user = await authService.ensureUserByEmail(email, (token as any).name, roleFromToken);
            }
            if (user) {
              console.log('✅ [AUTH] Usuario autenticado con NextAuth (getToken):', user.email, 'Rol:', user.role);
            } else {
              console.log('❌ [AUTH] Usuario no encontrado/inactivo para token NextAuth');
            }
          } else {
            console.log('❌ [AUTH] No se pudo decodificar token NextAuth con ningún nombre de cookie');
          }
        } catch (authError) {
          console.log('❌ [AUTH] Error usando getToken de NextAuth:', authError);
        }
      }
      
      if (!user) {
        console.log('🚫 [AUTH] Autenticación fallida - No se encontró usuario válido');
        const unauthorizedResponse = NextResponse.json(
          { error: 'No autorizado - Autenticación requerida' },
          { status: 401 }
        );
        return addCorsHeaders(unauthorizedResponse, origin);
      }
      
      console.log('🎉 [AUTH] Autenticación exitosa para:', (user as any).email);

      // Convertir rol a formato esperado
      const userRole = (user as any).role?.toUpperCase() as 'USER' | 'STAFF' | 'ADMIN';
      
      // Agregar usuario al contexto
      const userContext = {
        ...context,
        user: {
          id: (user as any).id,
          email: (user as any).email,
          role: userRole,
          centerId: undefined
        },
      };

      const response = await handler(req, userContext);
      return addCorsHeaders(response, origin);
    } catch (error) {
      console.error('Error en middleware de autenticación:', error);
      const errorResponse = NextResponse.json(
        { error: 'Error interno del servidor' },
        { status: 500 }
      );
      return addCorsHeaders(errorResponse, origin);
    }
  };
};

/**
 * Middleware de autorización por rol
 */
export const withRole = (requiredRole: 'USER' | 'STAFF' | 'ADMIN') => {
  return (handler: ApiHandler): ApiHandler => {
    return withAuth(async (req: NextRequest, context) => {
      const user = (context as any)?.user as { role: 'USER' | 'STAFF' | 'ADMIN' } | undefined;
      
      if (!user) {
        return NextResponse.json(
          { error: 'No autorizado' },
          { status: 401 }
        );
      }

      // Verificar jerarquía de roles
      const roleHierarchy = { USER: 0, STAFF: 1, ADMIN: 2 } as const;
      const userRole = (user.role as keyof typeof roleHierarchy);
      const userLevel = roleHierarchy[userRole];
      const requiredLevel = roleHierarchy[requiredRole];

      if (userLevel < requiredLevel) {
        return NextResponse.json(
          { error: 'Permisos insuficientes' },
          { status: 403 }
        );
      }

      return handler(req, context);
    });
  };
};

/**
 * Middleware de rate limiting
 */
export const withRateLimit = (handler: ApiHandler): ApiHandler => {
  return async (req: NextRequest, context) => {
    try {
      const pathname = req.nextUrl.pathname;
      const rateLimit = RouteUtils.getRateLimit(pathname);
      
      // Usar IP como identificador (en producción usar algo más robusto)
      const identifier = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
      const key = `${identifier}:${pathname}`;
      
      const allowed = rateLimitCache.check(
        key,
        rateLimit.max,
        rateLimit.windowMs
      );

      if (!allowed) {
        return NextResponse.json(
          { 
            error: 'Demasiadas solicitudes',
            retryAfter: Math.ceil(rateLimit.windowMs / 1000)
          },
          { 
            status: 429,
            headers: {
              'Retry-After': Math.ceil(rateLimit.windowMs / 1000).toString(),
              'X-RateLimit-Limit': rateLimit.max.toString(),
              'X-RateLimit-Remaining': '0',
            }
          }
        );
      }

      return handler(req, context);
    } catch (error) {
      console.error('Error en middleware de rate limiting:', error);
      return handler(req, context); // Continuar sin rate limiting en caso de error
    }
  };
};

/**
 * Middleware de validación de esquemas Zod
 */
export const withValidation = <T>(
  schema: z.ZodSchema<T>,
  source: 'body' | 'query' | 'params' = 'body'
) => {
  return (handler: ApiHandler): ApiHandler => {
    return async (req: NextRequest, context) => {
      try {
        let data: any;
        
        switch (source) {
          case 'body':
            data = await req.json();
            break;
          case 'query':
            data = Object.fromEntries(req.nextUrl.searchParams.entries());
            break;
          case 'params':
            data = (context as any)?.params || {};
            break;
        }

        const result = schema.safeParse(data);
        
        if (!result.success) {
          return NextResponse.json(
            {
              error: 'Datos de entrada inválidos',
              details: result.error.errors.map(err => ({
                field: err.path.join('.'),
                message: err.message,
              })),
            },
            { status: 400 }
          );
        }

        // Agregar datos validados al contexto
        const validatedContext = {
          ...context,
          validatedData: result.data,
        };

        return handler(req, validatedContext);
      } catch (error) {
        console.error('Error en middleware de validación:', error);
        return NextResponse.json(
          { error: 'Error al procesar los datos de entrada' },
          { status: 400 }
        );
      }
    };
  };
};

/**
 * Middleware de manejo de errores
 */
export const withErrorHandling = (handler: ApiHandler): ApiHandler => {
  return async (req: NextRequest, context) => {
    try {
      return await handler(req, context);
    } catch (error) {
      console.error('Error no manejado en API:', error);
      if (error instanceof z.ZodError) {
        return formatErrorResponse(new ValidationAppError('Datos de entrada inválidos', error.errors));
      }
      if (error instanceof AppError) {
        return formatErrorResponse(error);
      }
      return formatErrorResponse(error as any);
    }
  };
};

/**
 * Middleware de CORS
 */
export const withCors = (handler: ApiHandler): ApiHandler => {
  return async (req: NextRequest, context) => {
    // Manejo de preflight: responder antes de pasar al handler
    if (req.method === 'OPTIONS') {
      const pre = new NextResponse(null, { status: 204 });
      const origin = req.headers.get('origin');
      // Orígenes permitidos configurables por entorno
      const envAllowed = (process.env.ALLOWED_ORIGINS || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const defaultProd = [
        'https://polideportivo.com',
        'https://admin.polideportivo.com',
        'https://victoriahernandezweb.vercel.app',
        'https://polideportivo-api.vercel.app',
        'https://polideportivo-web.vercel.app',
        'https://polideportivo-admin.vercel.app',
        process.env.NEXT_PUBLIC_APP_URL || '',
        process.env.FRONTEND_URL || '',
      ].filter(Boolean) as string[];
      const defaultDev = ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3003'];
      const allowedOrigins = envAllowed.length > 0
        ? envAllowed
        : (process.env.NODE_ENV === 'production' ? defaultProd : defaultDev);
      if (origin && allowedOrigins.includes(origin)) {
        pre.headers.set('Access-Control-Allow-Origin', origin);
      }
      pre.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      pre.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      pre.headers.set('Access-Control-Allow-Credentials', 'true');
      return pre;
    }

    const response = await handler(req, context);
    
    // Configurar headers CORS
    const origin = req.headers.get('origin');
    const envAllowed = (process.env.ALLOWED_ORIGINS || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const defaultProd = [
      'https://polideportivo.com',
      'https://admin.polideportivo.com',
      'https://victoriahernandezweb.vercel.app',
      'https://polideportivo-api.vercel.app',
      'https://polideportivo-web.vercel.app',
      'https://polideportivo-admin.vercel.app',
      process.env.NEXT_PUBLIC_APP_URL || '',
      process.env.FRONTEND_URL || '',
    ].filter(Boolean) as string[];
    const defaultDev = ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3003'];
    const allowedOrigins = envAllowed.length > 0
      ? envAllowed
      : (process.env.NODE_ENV === 'production' ? defaultProd : defaultDev);

    if (origin && allowedOrigins.includes(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin);
    }
    
    if (!response.headers.has('Access-Control-Allow-Methods')) {
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    }
    if (!response.headers.has('Access-Control-Allow-Headers')) {
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    }
    if (!response.headers.has('Access-Control-Allow-Credentials')) {
      response.headers.set('Access-Control-Allow-Credentials', 'true');
    }

    return response;
  };
};

/**
 * Middleware de logging
 */
export const withLogging = (handler: ApiHandler): ApiHandler => {
  return async (req: NextRequest, context) => {
    const start = Date.now();
    const method = req.method;
    const url = req.nextUrl.pathname;
    
    console.log(`[${new Date().toISOString()}] ${method} ${url} - Iniciado`);
    
    try {
      const response = await handler(req, context);
      const duration = Date.now() - start;
      
      console.log(
        `[${new Date().toISOString()}] ${method} ${url} - ${response.status} (${duration}ms)`
      );
      
      return response;
    } catch (error) {
      const duration = Date.now() - start;
      console.error(
        `[${new Date().toISOString()}] ${method} ${url} - ERROR (${duration}ms):`,
        error
      );
      throw error;
    }
  };
};

/**
 * Composición de middlewares
 */
export const compose = (...middlewares: Array<(handler: ApiHandler) => ApiHandler>) => {
  return (handler: ApiHandler): ApiHandler => {
    return middlewares.reduceRight(
      (acc, middleware) => middleware(acc),
      handler
    );
  };
};

/**
 * Middleware completo para rutas públicas
 */
export const withPublicMiddleware = compose(
  withErrorHandling,
  withLogging,
  withCors,
  withRateLimit
);

/**
 * Middleware completo para rutas autenticadas
 */
export const withAuthMiddleware = compose(
  withErrorHandling,
  withLogging,
  withCors,
  withRateLimit,
  withAuth
);

/**
 * Middleware completo para rutas de staff
 */
export const withStaffMiddleware = compose(
  withErrorHandling,
  withLogging,
  withCors,
  withRateLimit,
  withAuth,
  withRole('STAFF')
);

/**
 * Middleware de limpieza automática de reservas expiradas
 */
export const withReservationCleanup = (handler: ApiHandler): ApiHandler => {
  return async (req: NextRequest, context?: { params?: Record<string, string> }) => {
    // Solo ejecutar limpieza en rutas de reservas
    const isReservationRoute = req.nextUrl.pathname.includes('/reservations') || 
                              req.nextUrl.pathname.includes('/availability');
    
    if (isReservationRoute) {
      try {
        // Limpiar reservas PENDING expiradas de forma asíncrona
        const now = new Date();
        const expiredReservations = await db.reservation.findMany({
          where: {
            status: 'PENDING',
            expiresAt: {
              lt: now
            }
          },
          select: { id: true, createdAt: true }
        });
        
        if (expiredReservations.length > 0) {
          // Ejecutar limpieza en background sin bloquear el request
          setImmediate(async () => {
            try {
              await db.$transaction(async (tx) => {
                for (const reservation of expiredReservations) {
                  await tx.reservation.update({
                    where: { id: reservation.id },
                    data: {
                      status: 'CANCELLED',
                      notes: 'Auto-cancelada por timeout'
                    }
                  });
                  
                  await tx.outboxEvent.create({
                    data: {
                      eventType: 'RESERVATION_EXPIRED',
                      eventData: {
                        reservationId: reservation.id,
                        expiredAt: now.toISOString()
                      }
                    }
                  });
                }
              });
              
              console.log(`🧹 [AUTO-CLEANUP] Canceladas ${expiredReservations.length} reservas expiradas`);
            } catch (error) {
              console.error('❌ [AUTO-CLEANUP] Error:', error);
            }
          });
        }
      } catch (error) {
        // No fallar el request si hay error en la limpieza
        console.error('❌ [AUTO-CLEANUP] Error verificando reservas expiradas:', error);
      }
    }
    
    return handler(req, context);
  };
};

/**
 * Middleware completo para rutas de admin
 */
export const withAdminMiddleware = compose(
  withErrorHandling,
  withLogging,
  withCors,
  withRateLimit,
  withAuth,
  withRole('ADMIN')
);

/**
 * Middleware completo para rutas de reservas (con limpieza automática)
 */
export const withReservationMiddleware = compose(
  withErrorHandling,
  withLogging,
  withCors,
  withRateLimit,
  withAuth,
  withReservationCleanup
);

/**
 * Utilidades para respuestas HTTP
 */
/**
 * Serializador personalizado para tipos de Prisma
 */
const serializeData = (data: any): any => {
  if (data === null || data === undefined) {
    return data;
  }
  
  if (data instanceof Date) {
    return data.toISOString();
  }
  
  // Manejar Prisma Decimal
  if (data && typeof data === 'object' && 'toNumber' in data) {
    return data.toNumber();
  }
  
  if (Array.isArray(data)) {
    return data.map(serializeData);
  }
  
  if (typeof data === 'object') {
    const serialized: any = {};
    for (const [key, value] of Object.entries(data)) {
      serialized[key] = serializeData(value);
    }
    return serialized;
  }
  
  return data;
};

export const ApiResponse = {
  success: <T>(data: T, status = 200) => {
    const serializedData = serializeData(data);
    return NextResponse.json({ success: true, data: serializedData }, { status });
  },
  
  error: (message: string, status = 400, details?: any) => {
    return NextResponse.json(
      { success: false, error: message, details },
      { status }
    );
  },
  
  notFound: (resource = 'Recurso') => {
    return NextResponse.json(
      { success: false, error: `${resource} no encontrado` },
      { status: 404 }
    );
  },
  
  unauthorized: (message = 'No autorizado') => {
    return NextResponse.json(
      { success: false, error: message },
      { status: 401 }
    );
  },
  
  forbidden: (message = 'Permisos insuficientes') => {
    return NextResponse.json(
      { success: false, error: message },
      { status: 403 }
    );
  },
  
  validation: (errors: Array<{ field: string; message: string }>) => {
    return NextResponse.json(
      {
        success: false,
        error: 'Datos de entrada inválidos',
        details: errors,
      },
      { status: 400 }
    );
  },
  
  badRequest: (message: string) => {
    return NextResponse.json(
      { success: false, error: message },
      { status: 400 }
    );
  },
  
  internalError: (message = 'Error interno del servidor') => {
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  },
  
  conflict: (message: string) => {
    return NextResponse.json(
      { success: false, error: message },
      { status: 409 }
    );
  },
};

/**
 * Tipos exportados
 */
export type ValidatedContext<T = any> = MiddlewareContext & {
  validatedData: T;
};

export type AuthenticatedContext = MiddlewareContext & {
  user: {
    id: string;
    email: string;
    role: 'USER' | 'STAFF' | 'ADMIN';
    centerId?: string;
  };
};