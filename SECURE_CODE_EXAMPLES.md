# 🔐 EJEMPLOS DE CÓDIGO SEGURO - GUÍA DE IMPLEMENTACIÓN

Este documento complementa el reporte de auditoría de seguridad con ejemplos concretos de código para remediar las vulnerabilidades encontradas.

---

## 1. CONFIGURACIÓN SEGURA DE RLS EN SUPABASE

### ✅ Habilitar RLS y Crear Políticas

```sql
-- =====================================================
-- CONFIGURACIÓN SEGURA RLS - SUPABASE
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- 1. HABILITAR RLS EN TODAS LAS TABLAS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE courts ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 2. POLÍTICAS PARA TABLA USERS
-- Los usuarios solo pueden ver/modificar sus propios datos
CREATE POLICY "users_select_own" ON users
  FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "users_update_own" ON users
  FOR UPDATE 
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Los admins pueden ver todos los usuarios
CREATE POLICY "users_select_admin" ON users
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('ADMIN', 'STAFF')
    )
  );

-- Solo admins pueden crear usuarios
CREATE POLICY "users_insert_admin" ON users
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'ADMIN'
    )
  );

-- 3. POLÍTICAS PARA RESERVATIONS
-- Los usuarios solo pueden ver sus propias reservas
CREATE POLICY "reservations_select_own" ON reservations
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Los usuarios solo pueden crear sus propias reservas
CREATE POLICY "reservations_insert_own" ON reservations
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Los usuarios solo pueden actualizar sus propias reservas
-- (solo ciertos campos como 'notes')
CREATE POLICY "reservations_update_own" ON reservations
  FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id 
    AND (OLD.status = NEW.status OR NEW.status = 'CANCELLED')
  );

-- Los admins/staff pueden ver todas las reservas
CREATE POLICY "reservations_select_admin" ON reservations
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('ADMIN', 'STAFF')
    )
  );

-- Solo admins pueden modificar cualquier reserva
CREATE POLICY "reservations_update_admin" ON reservations
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'ADMIN'
    )
  );

-- 4. POLÍTICAS PARA WALLET_LEDGER
-- Los usuarios solo pueden ver su propio historial
CREATE POLICY "wallet_ledger_select_own" ON wallet_ledger
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Solo el sistema puede insertar (mediante service role key)
-- No permitir INSERT desde cliente
CREATE POLICY "wallet_ledger_insert_system" ON wallet_ledger
  FOR INSERT 
  WITH CHECK (false); -- Siempre false para clientes

-- Los admins pueden ver todo el ledger
CREATE POLICY "wallet_ledger_select_admin" ON wallet_ledger
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'ADMIN'
    )
  );

-- 5. POLÍTICAS PARA PAYMENTS
-- Similar a wallet_ledger: solo lectura propia, sin escritura
CREATE POLICY "payments_select_own" ON payments
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "payments_insert_system" ON payments
  FOR INSERT 
  WITH CHECK (false);

CREATE POLICY "payments_select_admin" ON payments
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'ADMIN'
    )
  );

-- 6. POLÍTICAS PARA COURTS Y CENTERS (Lectura pública, escritura admin)
CREATE POLICY "courts_select_all" ON courts
  FOR SELECT 
  USING (is_active = true);

CREATE POLICY "courts_all_admin" ON courts
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'ADMIN'
    )
  );

CREATE POLICY "centers_select_all" ON centers
  FOR SELECT 
  USING (true);

CREATE POLICY "centers_all_admin" ON centers
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'ADMIN'
    )
  );

-- 7. POLÍTICAS PARA AUDIT_LOGS (Solo lectura admin)
CREATE POLICY "audit_logs_select_admin" ON audit_logs
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'ADMIN'
    )
  );

-- Solo el sistema puede insertar audit logs
CREATE POLICY "audit_logs_insert_system" ON audit_logs
  FOR INSERT 
  WITH CHECK (false);

-- 8. VERIFICAR QUE RLS ESTÁ HABILITADO
SELECT 
  schemaname,
  tablename,
  CASE 
    WHEN rowsecurity THEN '✅ RLS HABILITADO' 
    ELSE '❌ RLS DESHABILITADO' 
  END as estado_rls
FROM pg_tables 
WHERE schemaname = 'public'
  AND tablename IN (
    'users', 'centers', 'courts', 'reservations', 
    'memberships', 'payments', 'wallet_ledger', 
    'orders', 'audit_logs'
  )
ORDER BY tablename;

-- 9. REVOCAR PERMISOS EXCESIVOS
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM anon;

-- Otorgar permisos SOLO de lectura en tablas públicas
GRANT SELECT ON public.courts TO anon;
GRANT SELECT ON public.centers TO anon;
GRANT SELECT ON public.sports TO anon;

-- authenticated tiene SELECT/INSERT/UPDATE según políticas RLS
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
```

---

## 2. HEADERS DE SEGURIDAD HTTP

### ✅ Configuración en vercel.json (todas las apps)

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https: blob:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https://api.stripe.com https://*.vercel.app https://*.redsys.es; frame-src https://js.stripe.com https://challenges.cloudflare.com; frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self' https://*.redsys.es; upgrade-insecure-requests; block-all-mixed-content;"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "Strict-Transport-Security",
          "value": "max-age=63072000; includeSubDomains; preload"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        },
        {
          "key": "Permissions-Policy",
          "value": "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        },
        {
          "key": "X-DNS-Prefetch-Control",
          "value": "on"
        }
      ]
    },
    {
      "source": "/api/:path*",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "Cache-Control",
          "value": "no-store, no-cache, must-revalidate, proxy-revalidate"
        }
      ]
    }
  ]
}
```

---

## 3. VALIDACIÓN SEGURA DE VARIABLES DE ENTORNO

### ✅ apps/api/src/lib/env.ts (Nuevo archivo)

```typescript
import { z } from 'zod';

/**
 * Schema de validación para variables de entorno
 * Todas las variables críticas deben estar definidas y ser válidas
 */
const EnvSchema = z.object({
  // Node Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // Base de datos
  DATABASE_URL: z.string().url('DATABASE_URL debe ser una URL válida'),
  DIRECT_DATABASE_URL: z.string().url('DIRECT_DATABASE_URL debe ser una URL válida').optional(),
  
  // Autenticación
  AUTH_SECRET: z.string().min(32, 'AUTH_SECRET debe tener al menos 32 caracteres'),
  NEXTAUTH_SECRET: z.string().min(32).optional(),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET debe tener al menos 32 caracteres'),
  NEXTAUTH_URL: z.string().url().optional(),
  
  // APIs
  NEXT_PUBLIC_API_URL: z.string().url('NEXT_PUBLIC_API_URL debe ser una URL válida'),
  NEXT_PUBLIC_WEB_URL: z.string().url().optional(),
  API_BASE_URL: z.string().url().optional(),
  
  // Pagos - Redsys
  REDSYS_MERCHANT_CODE: z.string().min(1, 'REDSYS_MERCHANT_CODE requerido'),
  REDSYS_MERCHANT_KEY: z.string().min(32, 'REDSYS_MERCHANT_KEY debe tener al menos 32 caracteres'),
  REDSYS_TERMINAL: z.string().default('1'),
  REDSYS_ENVIRONMENT: z.enum(['test', 'production']).default('test'),
  REDSYS_ALLOWED_IPS: z.string().optional(), // Comma-separated IPs
  
  // Pagos - Stripe
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  
  // Email
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().email().optional(),
  
  // Firebase (opcional)
  FIREBASE_PROJECT_ID: z.string().optional(),
  FIREBASE_CLIENT_EMAIL: z.string().email().optional(),
  FIREBASE_PRIVATE_KEY: z.string().optional(),
  FIREBASE_SERVICE_ACCOUNT_JSON: z.string().optional(),
  
  // CORS
  ALLOWED_ORIGINS: z.string().optional(), // Comma-separated
  
  // Rate Limiting (si usas Vercel KV)
  KV_URL: z.string().url().optional(),
  KV_REST_API_URL: z.string().url().optional(),
  KV_REST_API_TOKEN: z.string().optional(),
  
  // Cloudflare Turnstile (CAPTCHA)
  TURNSTILE_SECRET_KEY: z.string().optional(),
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().optional(),
});

/**
 * Variables de entorno validadas y tipadas
 * Si falla la validación, la aplicación no inicia
 */
export const env = (() => {
  try {
    const parsed = EnvSchema.parse(process.env);
    console.log('✅ Variables de entorno validadas correctamente');
    return parsed;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ ERROR: Variables de entorno inválidas o faltantes:');
      console.error(JSON.stringify(error.format(), null, 2));
      
      // En producción, no iniciar la app
      if (process.env.NODE_ENV === 'production') {
        console.error('FATAL: La aplicación no puede iniciar sin variables de entorno válidas');
        process.exit(1);
      }
      
      // En desarrollo, lanzar el error para debug
      throw new Error('Variables de entorno inválidas. Ver logs arriba.');
    }
    throw error;
  }
})();

// Tipo para autocompletado
export type Env = z.infer<typeof EnvSchema>;
```

### ✅ Uso en el código

```typescript
// ANTES (inseguro):
const secret = process.env.JWT_SECRET || '';

// DESPUÉS (seguro):
import { env } from '@/lib/env';
const secret = env.JWT_SECRET; // Garantizado que existe y es válido
```

---

## 4. RATE LIMITING DISTRIBUIDO CON VERCEL KV

### ✅ apps/api/src/lib/rate-limit.ts (Nuevo archivo)

```typescript
import { kv } from '@vercel/kv';
import { NextRequest } from 'next/server';

interface RateLimitConfig {
  identifier: string;
  limit: number;
  windowSeconds: number;
}

/**
 * Rate limiting distribuido usando Vercel KV (Redis)
 * Funciona correctamente en entornos serverless
 */
export async function rateLimit(config: RateLimitConfig): Promise<{
  success: boolean;
  remaining: number;
  resetAt: number;
}> {
  const { identifier, limit, windowSeconds } = config;
  const key = `rate-limit:${identifier}`;
  
  try {
    // Usar pipeline de Redis para operaciones atómicas
    const pipeline = kv.pipeline();
    pipeline.incr(key);
    pipeline.expire(key, windowSeconds);
    pipeline.ttl(key);
    
    const results = await pipeline.exec();
    const current = results[0] as number;
    const ttl = results[2] as number;
    
    const remaining = Math.max(0, limit - current);
    const resetAt = Date.now() + (ttl * 1000);
    
    return {
      success: current <= limit,
      remaining,
      resetAt,
    };
  } catch (error) {
    console.error('[RATE-LIMIT] Error:', error);
    // En caso de error con Redis, permitir la petición (fail-open)
    // pero loggear para investigación
    return { success: true, remaining: limit, resetAt: Date.now() + windowSeconds * 1000 };
  }
}

/**
 * Helper para extraer identificador único de la request
 */
export function getClientIdentifier(request: NextRequest): string {
  // Preferir IP real
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  
  let ip = 'unknown';
  if (forwarded) {
    ip = forwarded.split(',')[0].trim();
  } else if (realIp) {
    ip = realIp;
  }
  
  return ip;
}

/**
 * Middleware de rate limiting para rutas específicas
 */
export async function withRateLimit(
  request: NextRequest,
  options: {
    prefix: string;
    limit: number;
    windowSeconds: number;
  }
): Promise<{ allowed: boolean; headers: Record<string, string> }> {
  const identifier = getClientIdentifier(request);
  const key = `${options.prefix}:${identifier}`;
  
  const result = await rateLimit({
    identifier: key,
    limit: options.limit,
    windowSeconds: options.windowSeconds,
  });
  
  const headers = {
    'X-RateLimit-Limit': options.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.resetAt.toString(),
  };
  
  if (!result.success) {
    headers['Retry-After'] = Math.ceil((result.resetAt - Date.now()) / 1000).toString();
  }
  
  return {
    allowed: result.success,
    headers,
  };
}
```

### ✅ Uso en endpoints

```typescript
// apps/api/src/app/api/auth/signin/route.ts
import { withRateLimit } from '@/lib/rate-limit';
import { ApiResponse } from '@/lib/middleware';

export async function POST(request: NextRequest) {
  // Rate limiting: 5 intentos por 5 minutos
  const rateLimit = await withRateLimit(request, {
    prefix: 'auth-signin',
    limit: 5,
    windowSeconds: 300,
  });
  
  if (!rateLimit.allowed) {
    return new NextResponse(
      JSON.stringify({
        error: 'Demasiados intentos de inicio de sesión. Intente más tarde.',
        retryAfter: rateLimit.headers['Retry-After'],
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          ...rateLimit.headers,
        },
      }
    );
  }
  
  // ... resto de la lógica de autenticación
}
```

---

## 5. CSRF PROTECTION

### ✅ apps/api/src/lib/csrf.ts (Nuevo archivo)

```typescript
import { NextRequest } from 'next/server';
import { randomBytes } from 'crypto';

/**
 * Generar token CSRF único
 */
export function generateCsrfToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Validar token CSRF desde cookie y body/header
 */
export function validateCsrfToken(request: NextRequest): boolean {
  // Obtener token de la cookie
  const cookieToken = request.cookies.get('csrf-token')?.value;
  
  // Obtener token del body o header
  const headerToken = request.headers.get('x-csrf-token');
  
  // Ambos deben existir y coincidir
  if (!cookieToken || !headerToken) {
    return false;
  }
  
  return cookieToken === headerToken;
}

/**
 * Middleware de protección CSRF
 */
export function withCsrfProtection(handler: (req: NextRequest) => Promise<Response>) {
  return async (req: NextRequest) => {
    // Solo validar en métodos que modifican estado
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      if (!validateCsrfToken(req)) {
        return new Response(
          JSON.stringify({ error: 'Token CSRF inválido o faltante' }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }
    
    return handler(req);
  };
}
```

### ✅ Uso en el cliente

```typescript
// En el cliente (Next.js app router)
'use client';

import { useEffect, useState } from 'react';

export function useCsrfToken() {
  const [csrfToken, setCsrfToken] = useState<string>('');
  
  useEffect(() => {
    // Obtener token CSRF del servidor
    fetch('/api/csrf-token')
      .then(res => res.json())
      .then(data => setCsrfToken(data.token));
  }, []);
  
  return csrfToken;
}

// En una petición:
const csrfToken = useCsrfToken();

await fetch('/api/admin/credits/adjust', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': csrfToken, // Incluir token
  },
  body: JSON.stringify(data),
  credentials: 'include', // Enviar cookies
});
```

---

## 6. SANITIZACIÓN DE LOGS

### ✅ apps/api/src/lib/logger.ts (Actualizado)

```typescript
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  userId?: string;
  endpoint?: string;
  ip?: string;
  [key: string]: any;
}

/**
 * Campos sensibles que NUNCA deben aparecer en logs
 */
const SENSITIVE_FIELDS = [
  'password',
  'token',
  'authorization',
  'cookie',
  'secret',
  'api_key',
  'apiKey',
  'privateKey',
  'private_key',
  'credit_card',
  'creditCard',
  'cvv',
  'ssn',
  'cardNumber',
];

/**
 * Sanitizar objetos para logs
 */
function sanitizeForLogs(data: any, depth = 0): any {
  // Evitar recursión infinita
  if (depth > 5) return '[REDACTED - TOO DEEP]';
  
  if (data === null || data === undefined) {
    return data;
  }
  
  if (typeof data === 'string') {
    // Redactar si parece un token o clave
    if (data.length > 20 && /^[A-Za-z0-9_\-\.]+$/.test(data)) {
      return data.substring(0, 8) + '...' + data.substring(data.length - 4);
    }
    return data;
  }
  
  if (Array.isArray(data)) {
    return data.map(item => sanitizeForLogs(item, depth + 1));
  }
  
  if (typeof data === 'object') {
    const sanitized: any = {};
    
    for (const [key, value] of Object.entries(data)) {
      const keyLower = key.toLowerCase();
      
      // Redactar campos sensibles
      if (SENSITIVE_FIELDS.some(field => keyLower.includes(field))) {
        sanitized[key] = '***REDACTED***';
        continue;
      }
      
      sanitized[key] = sanitizeForLogs(value, depth + 1);
    }
    
    return sanitized;
  }
  
  return data;
}

/**
 * Logger seguro para producción
 */
export const logger = {
  debug(message: string, context?: LogContext) {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[DEBUG] ${message}`, sanitizeForLogs(context));
    }
  },
  
  info(message: string, context?: LogContext) {
    console.log(`[INFO] ${message}`, sanitizeForLogs(context));
  },
  
  warn(message: string, context?: LogContext) {
    console.warn(`[WARN] ${message}`, sanitizeForLogs(context));
  },
  
  error(message: string, error?: Error, context?: LogContext) {
    console.error(`[ERROR] ${message}`, {
      error: {
        name: error?.name,
        message: error?.message,
        // NO incluir stack en producción por defecto
        ...(process.env.NODE_ENV !== 'production' && { stack: error?.stack }),
      },
      ...sanitizeForLogs(context),
    });
  },
  
  /**
   * Logs de seguridad - siempre se registran
   */
  security(message: string, context?: LogContext) {
    console.warn(`[SECURITY] ${message}`, {
      timestamp: new Date().toISOString(),
      ...sanitizeForLogs(context),
    });
    
    // En producción, enviar a servicio de monitoreo
    if (process.env.NODE_ENV === 'production') {
      // TODO: Integrar con servicio de logging (Datadog, Sentry, etc.)
    }
  },
};
```

### ✅ Uso en el código

```typescript
// ANTES (inseguro):
console.log('User data:', user);
console.log('Payment webhook:', request.body);

// DESPUÉS (seguro):
import { logger } from '@/lib/logger';

logger.info('User authenticated', { userId: user.id, email: user.email });
logger.debug('Payment webhook received', { orderId: order.id }); // NO incluir headers completos
```

---

## 7. VALIDACIÓN ROBUSTA DE WEBHOOKS

### ✅ apps/api/src/app/api/payments/webhook/redsys/route.ts (Actualizado)

```typescript
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';

// IPs permitidas de Redsys (actualizar según documentación oficial)
const REDSYS_ALLOWED_IPS = env.REDSYS_ALLOWED_IPS?.split(',') || [
  '194.224.79.36',
  '194.224.79.38',
  // Agregar todas las IPs oficiales de Redsys
];

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = crypto.randomUUID();
  
  try {
    // 1. Validar IP de origen
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';
    
    if (!REDSYS_ALLOWED_IPS.includes(ip)) {
      logger.security('Webhook from unauthorized IP', {
        requestId,
        ip,
        endpoint: '/api/payments/webhook/redsys',
      });
      
      return new NextResponse('Unauthorized', { status: 401 });
    }
    
    // 2. Extraer parámetros
    const contentType = request.headers.get('content-type') || '';
    let Ds_Signature = '';
    let Ds_MerchantParameters = '';
    
    if (contentType.includes('application/json')) {
      const body = await request.json().catch(() => null);
      if (!body) {
        logger.warn('Invalid JSON in webhook', { requestId });
        return new NextResponse('Invalid JSON', { status: 400 });
      }
      Ds_Signature = body.Ds_Signature || '';
      Ds_MerchantParameters = body.Ds_MerchantParameters || '';
    } else {
      const form = await request.formData();
      Ds_Signature = (form.get('Ds_Signature') as string) || '';
      Ds_MerchantParameters = (form.get('Ds_MerchantParameters') as string) || '';
    }
    
    if (!Ds_Signature || !Ds_MerchantParameters) {
      logger.warn('Missing required parameters', { requestId });
      return new NextResponse('Missing parameters', { status: 400 });
    }
    
    // 3. Validar firma ANTES de procesar
    const isValidSignature = await paymentService.verifyRedsysSignature({
      signature: Ds_Signature,
      merchantParameters: Ds_MerchantParameters,
    });
    
    if (!isValidSignature) {
      logger.security('Invalid Redsys signature', {
        requestId,
        ip,
        signatureLength: Ds_Signature.length,
      });
      
      return new NextResponse('Invalid signature', { status: 403 });
    }
    
    // 4. Decodificar parámetros
    const decoded = Buffer.from(Ds_MerchantParameters, 'base64').toString('utf8');
    const params = JSON.parse(decoded);
    const merchantData = parseMerchantData(params.Ds_MerchantData);
    
    if (!merchantData?.orderId) {
      logger.warn('Missing orderId in merchant data', { requestId });
      return new NextResponse('Invalid merchant data', { status: 400 });
    }
    
    // 5. Verificar idempotencia ESTRICTA
    const idempotencyKey = `redsys:${params.Ds_Order}:${params.Ds_AuthorisationCode}`;
    
    const existing = await db.webhookEvent.findFirst({
      where: {
        provider: 'REDSYS',
        eventId: idempotencyKey,
        processed: true,
      },
    });
    
    if (existing) {
      logger.info('Webhook already processed (idempotent)', {
        requestId,
        orderId: merchantData.orderId,
        idempotencyKey,
      });
      
      return new NextResponse(
        JSON.stringify({ received: true, alreadyProcessed: true }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // 6. Procesar en transacción con row-level locks
    const result = await db.$transaction(async (tx) => {
      // Lock de la orden para prevenir race conditions
      await tx.$executeRaw`
        SELECT * FROM "orders" 
        WHERE id = ${merchantData.orderId} 
        FOR UPDATE NOWAIT
      `;
      
      const order = await tx.order.findUnique({
        where: { id: merchantData.orderId },
      });
      
      if (!order) {
        throw new Error('Order not found');
      }
      
      if (order.paymentStatus === 'PAID') {
        // Ya procesado previamente
        return { alreadyPaid: true };
      }
      
      // Actualizar orden
      await tx.order.update({
        where: { id: merchantData.orderId },
        data: {
          paymentStatus: 'PAID',
          paidAt: new Date(),
        },
      });
      
      // Registrar webhook event
      await tx.webhookEvent.create({
        data: {
          provider: 'REDSYS',
          eventType: 'PAYMENT_SUCCESS',
          eventId: idempotencyKey,
          eventData: {
            orderId: merchantData.orderId,
            dsOrder: params.Ds_Order,
            dsAuth: params.Ds_AuthorisationCode,
          },
          processed: true,
        },
      });
      
      // Procesar lógica de negocio (topup, etc.)
      if (merchantData.type === 'wallet_topup') {
        const creditsToAdd = Number(order.creditsUsed || 0);
        await walletService.credit({
          userId: order.userId,
          credits: creditsToAdd,
          reason: 'TOPUP',
          metadata: {
            orderId: order.id,
            provider: 'REDSYS',
          },
          idempotencyKey: `redsys-topup:${order.id}`,
        });
      }
      
      return { success: true };
    });
    
    logger.info('Webhook processed successfully', {
      requestId,
      orderId: merchantData.orderId,
      duration: Date.now() - startTime,
    });
    
    return new NextResponse(
      JSON.stringify({ received: true, success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    logger.error('Webhook processing error', error as Error, {
      requestId,
      duration: Date.now() - startTime,
    });
    
    // NO responder 200 OK en caso de error real
    return new NextResponse(
      JSON.stringify({ received: true, success: false, error: 'Processing error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
```

---

## 8. RESUMEN DE IMPLEMENTACIÓN

### ✅ Prioridad 1 (24-48 horas):
1. ✅ Habilitar RLS en Supabase
2. ✅ Implementar headers de seguridad
3. ✅ Validar variables de entorno
4. ✅ Sanitizar logs

### ✅ Prioridad 2 (1 semana):
5. ✅ Rate limiting distribuido
6. ✅ CSRF protection
7. ✅ Validación robusta de webhooks
8. ✅ Deshabilitar endpoints de debug

### ✅ Testing de Seguridad

```bash
# Ejecutar tests de seguridad
npm run test:security

# Escanear dependencias
npm audit --production
npm audit fix

# Verificar RLS
npm run db:verify-rls
```

---

**Documento generado**: 13 de Octubre de 2025  
**Versión**: 1.0  
**Para uso con**: SECURITY_AUDIT_REPORT_2025.md

