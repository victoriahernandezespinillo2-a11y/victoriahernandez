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
 * Middleware de autenticación híbrido
 * Soporta tanto tokens JWT como cookies de NextAuth
 */
export const withAuth = (handler: ApiHandler): ApiHandler => {
  return async (req: NextRequest, context) => {
    try {
      let user = null;
      
      console.log('🔍 [AUTH] Iniciando autenticación híbrida');
      
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
      }
      
      // Si no hay token JWT, intentar con cookies de NextAuth
      if (!user) {
        console.log('🍪 [AUTH] Intentando autenticación con NextAuth cookies');
        try {
          const cookies = req.cookies;
          const configuredCookieName = process.env.NEXTAUTH_COOKIE_NAME;

          // Construir lista de nombres candidatos
          const candidateNames = [
            configuredCookieName,
            'next-auth.session-token',
            '__Secure-next-auth.session-token',
          ].filter(Boolean) as string[];

          // Buscar cookie por nombres conocidos
          let sessionToken: string | undefined;
          for (const name of candidateNames) {
            const val = cookies.get(name)?.value;
            if (val) { sessionToken = val; break; }
          }

          // Si no se encontró, escanear cualquier cookie que empiece por next-auth.session-token
          if (!sessionToken) {
            const all = (cookies as any).getAll?.() || [];
            for (const c of all) {
              if (typeof c?.name === 'string' && (c.name.startsWith('next-auth.session-token') || c.name.startsWith('__Secure-next-auth.session-token'))) {
                sessionToken = c.value;
                break;
              }
            }
          }

          console.log('🍪 [AUTH] Session token:', sessionToken ? 'Presente' : 'Ausente');

          if (sessionToken) {
            // Para desarrollo, usar usuarios de prueba basados en el token
            // En producción, esto debería validar el JWT token
            const testUsers = [
              {
                id: '1',
                email: 'admin@polideportivo.com',
                firstName: 'Administrador',
                lastName: 'Principal',
                role: 'ADMIN' as const,
                isActive: true,
                emailVerified: true
              },
              {
                id: '2',
                email: 'superadmin@polideportivo.com',
                firstName: 'Super',
                lastName: 'Administrador',
                role: 'ADMIN' as const,
                isActive: true,
                emailVerified: true
              }
            ];

            // Por simplicidad en desarrollo, usar el primer usuario admin
            user = testUsers[0];
            console.log('✅ [AUTH] Usuario de prueba asignado:', user.email, 'Rol:', user.role);
          }
        } catch (authError) {
          console.log('❌ [AUTH] Error NextAuth:', authError);
        }
      }
      
      if (!user) {
        console.log('🚫 [AUTH] Autenticación fallida - No se encontró usuario válido');
        return NextResponse.json(
          { error: 'No autorizado - Autenticación requerida' },
          { status: 401 }
        );
      }
      
      console.log('🎉 [AUTH] Autenticación exitosa para:', user.email);

      // Convertir rol a formato esperado
      const userRole = user.role?.toUpperCase() as 'USER' | 'STAFF' | 'ADMIN';
      
      // Agregar usuario al contexto
      const userContext = {
        ...context,
        user: {
          id: user.id,
          email: user.email,
          role: userRole,
          centerId: undefined
        },
      };

      return handler(req, userContext);
    } catch (error) {
      console.error('Error en middleware de autenticación:', error);
      return NextResponse.json(
        { error: 'Error interno del servidor' },
        { status: 500 }
      );
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
      const pre = new NextResponse(null, { status: 200 });
      const origin = req.headers.get('origin');
      const allowedOrigins = process.env.NODE_ENV === 'production'
        ? ['https://polideportivo.com', 'https://admin.polideportivo.com']
        : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3003'];
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
    const allowedOrigins = process.env.NODE_ENV === 'production'
      ? ['https://polideportivo.com', 'https://admin.polideportivo.com']
      : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3003'];

    if (origin && allowedOrigins.includes(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin);
    }
    
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    response.headers.set('Access-Control-Allow-Credentials', 'true');

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
 * Utilidades para respuestas HTTP
 */
export const ApiResponse = {
  success: <T>(data: T, status = 200) => {
    return NextResponse.json({ success: true, data }, { status });
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