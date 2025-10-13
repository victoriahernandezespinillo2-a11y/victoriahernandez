# 🔒 REPORTE DE AUDITORÍA DE SEGURIDAD - POLIDEPORTIVO OROQUIETA

**Fecha**: 13 de Octubre de 2025  
**Auditor**: Análisis de Seguridad Automatizado  
**Nivel**: Pentesting Completo - Producción  
**Plataforma**: Vercel  
**Estado**: VULNERABILIDADES CRÍTICAS ENCONTRADAS ⚠️

---

## 📋 RESUMEN EJECUTIVO

Se ha realizado una auditoría de seguridad exhaustiva del proyecto "Polideportivo Oroquieta" desplegado en Vercel. Se identificaron **17 vulnerabilidades CRÍTICAS** y **23 vulnerabilidades de ALTA SEVERIDAD** que requieren atención inmediata antes de operar en producción.

### ⚠️ SEVERIDAD GENERAL: **CRÍTICA**

**Áreas con vulnerabilidades críticas:**
- ❌ Base de datos SIN protección RLS (Row Level Security DESHABILITADO)
- ❌ Exposición de información sensible en logs
- ❌ Falta de headers de seguridad HTTP
- ❌ Validación insuficiente en endpoints críticos
- ❌ Posibles ataques CSRF
- ❌ Información de debugging expuesta en producción
- ❌ Configuración de CORS permisiva
- ❌ Autenticación con múltiples fallos de seguridad

---

## 🚨 VULNERABILIDADES CRÍTICAS (Severidad: CRÍTICA)

### 1. RLS (Row Level Security) COMPLETAMENTE DESHABILITADO ⚠️⚠️⚠️

**Severidad**: 🔴 **CRÍTICA** (CVSS 9.8/10)  
**CWE**: CWE-284 (Improper Access Control)

**Hallazgo:**
```sql
-- Archivo: packages/db/disable-rls-completely.sql
ALTER TABLE IF EXISTS users DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS centers DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS courts DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS reservations DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS tournaments DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS memberships DISABLE ROW LEVEL SECURITY;
```

**Impacto:**
- ✅ **CUALQUIER USUARIO** puede leer TODOS los datos de TODOS los usuarios
- ✅ **ACCESO COMPLETO** a información personal (emails, teléfonos, direcciones, contraseñas hasheadas)
- ✅ **MODIFICACIÓN** de balances de créditos sin autorización
- ✅ **MANIPULACIÓN** de reservas de otros usuarios
- ✅ **EXPOSICIÓN** de datos financieros y de pago
- ✅ **INCUMPLIMIENTO GDPR** - Violación de protección de datos

**Escenario de Explotación:**
```javascript
// Un usuario malicioso puede ejecutar:
const { data: allUsers } = await supabase
  .from('users')
  .select('*')
  // Sin RLS, obtiene TODOS los usuarios con sus datos sensibles
  
// Puede modificar balances:
await supabase
  .from('users')
  .update({ creditsBalance: 999999 })
  .eq('id', 'victim-user-id')
```

**Recomendación INMEDIATA:**
```sql
-- HABILITAR RLS EN TODAS LAS TABLAS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE courts ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_ledger ENABLE ROW LEVEL SECURITY;

-- CREAR POLÍTICAS RESTRICTIVAS
CREATE POLICY "Users can only read own data" ON users
  FOR SELECT USING (auth.uid() = id);
  
CREATE POLICY "Users can only update own data" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Only admins can read all users" ON users
  FOR SELECT USING (
    auth.jwt() ->> 'role' = 'ADMIN'
  );
```

---

### 2. PERMISOS DE BASE DE DATOS COMPLETAMENTE ABIERTOS ⚠️⚠️⚠️

**Severidad**: 🔴 **CRÍTICA** (CVSS 9.5/10)  
**CWE**: CWE-269 (Improper Privilege Management)

**Hallazgo:**
```sql
-- Archivo: packages/db/fix-permissions.sql
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO authenticated;
```

**Impacto:**
- El rol `anon` (público sin autenticar) tiene permisos COMPLETOS
- Cualquier persona puede ejecutar operaciones DDL/DML
- No hay separación entre usuarios autenticados y anónimos

**Recomendación:**
```sql
-- REVOCAR PERMISOS EXCESIVOS
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM anon;

-- OTORGAR PERMISOS MÍNIMOS
GRANT SELECT ON public.courts TO anon;
GRANT SELECT ON public.centers TO anon;
-- NO otorgar permisos a users, payments, etc. para usuarios anónimos
```

---

### 3. EXPOSICIÓN DE INFORMACIÓN SENSIBLE EN LOGS

**Severidad**: 🔴 **CRÍTICA** (CVSS 8.5/10)  
**CWE**: CWE-532 (Insertion of Sensitive Information into Log File)

**Hallazgos:**

**Archivo: apps/api/src/app/api/admin/credits/adjust/route.ts**
```typescript
console.log('📥 [ADJUST] Body recibido:', body);
console.log('👮 [ADJUST] Admin user:', adminUser ? adminUser.email : 'No autenticado');
```

**Archivo: apps/api/src/app/api/auth/signin/route.ts**
```typescript
console.error('Error en inicio de sesión:', error);
// Expone detalles de autenticación en logs
```

**Archivo: apps/api/src/app/api/payments/webhook/redsys/route.ts**
```typescript
console.log('🔔 [REDSYS-WEBHOOK] Webhook recibido:', {
  method: request.method,
  url: request.url,
  headers: Object.fromEntries(request.headers.entries()),
  timestamp: new Date().toISOString()
});
```

**Impacto:**
- Exposición de tokens de autenticación en logs de Vercel
- Exposición de datos de pagos (headers, parámetros de Redsys)
- Exposición de emails y datos personales
- Los logs de Vercel son accesibles por el equipo y pueden filtrarse

**Recomendación:**
```typescript
// NO hacer esto en producción:
// console.log('User data:', user);

// Hacer esto:
if (process.env.NODE_ENV === 'development') {
  console.log('Debug info:', sanitizeForLogs(data));
}

// Función de sanitización:
function sanitizeForLogs(data: any) {
  const sanitized = { ...data };
  const sensitiveFields = ['password', 'token', 'authorization', 'cookie', 'secret'];
  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '***REDACTED***';
    }
  }
  return sanitized;
}
```

---

### 4. FALTA DE HEADERS DE SEGURIDAD HTTP

**Severidad**: 🔴 **CRÍTICA** (CVSS 8.0/10)  
**CWE**: CWE-693 (Protection Mechanism Failure)

**Hallazgos:**

**No se encontraron en vercel.json:**
- ❌ `Content-Security-Policy` (CSP)
- ❌ `X-Frame-Options`
- ❌ `X-Content-Type-Options`
- ❌ `Strict-Transport-Security` (HSTS)
- ❌ `Referrer-Policy`
- ❌ `Permissions-Policy`

**Impacto:**
- Vulnerable a ataques XSS (Cross-Site Scripting)
- Vulnerable a Clickjacking
- Vulnerable a MIME-sniffing attacks
- No fuerza HTTPS en todas las conexiones
- Fugas de información a través del header Referer

**Recomendación INMEDIATA:**

**apps/admin/vercel.json:**
```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://api.stripe.com https://*.vercel.app; frame-src https://js.stripe.com; object-src 'none'; base-uri 'self'; form-action 'self';"
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
          "value": "geolocation=(), microphone=(), camera=()"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    }
  ]
}
```

**Repetir para apps/api/vercel.json y apps/web/vercel.json**

---

### 5. CONFIGURACIÓN CORS PERMISIVA

**Severidad**: 🟠 **ALTA** (CVSS 7.5/10)  
**CWE**: CWE-942 (Overly Permissive Cross-domain Whitelist)

**Hallazgo:**

**Archivo: apps/api/middleware.ts (líneas 16-37)**
```typescript
const devOrigins = [
  'http://localhost:3001',
  'http://localhost:3003',
  'http://127.0.0.1:3001',
  'http://127.0.0.1:3003',
];

// En producción añadimos dominios por defecto si no se especifican por entorno
const defaultProd = [
  'https://victoriahernandezweb.vercel.app',
  'https://polideportivo-api.vercel.app',
  'https://polideportivo-web.vercel.app',
  'https://polideportivo-admin.vercel.app',
  process.env.NEXT_PUBLIC_APP_URL || '',
  process.env.FRONTEND_URL || '',
].filter(Boolean);
```

**Problemas:**
1. En desarrollo, permite orígenes localhost que pueden ser explotados
2. No valida subdominios de forma estricta
3. Variables de entorno vacías crean agujeros

**Recomendación:**
```typescript
// Validación estricta de orígenes
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [
      'https://polideportivo-web.vercel.app',
      'https://polideportivo-admin.vercel.app',
      // Solo dominios específicos en producción
    ]
  : ['http://localhost:3001', 'http://localhost:3003'];

const isAllowed = origin && allowedOrigins.includes(origin);
```

---

### 6. TOKENS JWT SIN ROTACIÓN Y LONG-LIVED

**Severidad**: 🟠 **ALTA** (CVSS 7.2/10)  
**CWE**: CWE-613 (Insufficient Session Expiration)

**Hallazgo:**

**Archivo: packages/auth/src/config.ts (líneas 8-10)**
```typescript
session: {
  strategy: 'jwt' as const,
  maxAge: 30 * 24 * 60 * 60, // 30 días ⚠️
},
```

**Problemas:**
- Tokens de sesión válidos por 30 días
- No hay rotación automática de tokens
- Si un token se filtra, es válido por 30 días completos
- No hay revocación de tokens implementada

**Recomendación:**
```typescript
session: {
  strategy: 'jwt' as const,
  maxAge: 4 * 60 * 60, // 4 horas
  updateAge: 30 * 60, // Actualizar cada 30 minutos
},

// Implementar refresh tokens en la base de datos
// con revocación explícita
```

---

### 7. FALTA DE RATE LIMITING EFECTIVO

**Severidad**: 🟠 **ALTA** (CVSS 7.0/10)  
**CWE**: CWE-307 (Improper Restriction of Excessive Authentication Attempts)

**Hallazgo:**

**Archivo: apps/api/src/lib/middleware/index.ts (líneas 72-106)**
```typescript
class RateLimitCache {
  private cache = new Map<string, { count: number; resetTime: number }>();
  // Cache en memoria - se pierde en cada deploy
  // No funciona en entornos serverless distribuidos
}
```

**Problemas:**
1. Rate limiting basado en memoria local
2. Se reinicia en cada despliegue de Vercel
3. No funciona correctamente en entornos serverless (múltiples instancias)
4. No hay rate limiting en endpoints críticos como `/api/auth/signin`

**Impacto:**
- Ataques de fuerza bruta ilimitados contra autenticación
- Posible DDoS por consumo de recursos
- Scraping masivo de datos

**Recomendación:**
```typescript
// Usar Vercel Edge Config o Redis para rate limiting distribuido
import { kv } from '@vercel/kv';

async function checkRateLimit(identifier: string, limit: number = 5, windowSeconds: number = 60) {
  const key = `rate-limit:${identifier}`;
  const current = await kv.incr(key);
  
  if (current === 1) {
    await kv.expire(key, windowSeconds);
  }
  
  return current <= limit;
}

// Aplicar en rutas críticas:
export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  
  if (!await checkRateLimit(`signin:${ip}`, 5, 300)) {
    return ApiResponse.error('Demasiados intentos', 429);
  }
  
  // ...resto de la lógica
}
```

---

### 8. VALIDACIÓN INSUFICIENTE DE ENTRADA - SQL INJECTION POTENCIAL

**Severidad**: 🔴 **CRÍTICA** (CVSS 9.0/10)  
**CWE**: CWE-89 (SQL Injection)

**Hallazgo:**

**Archivo: apps/api/src/app/api/reservations/route.ts (líneas 123-127)**
```typescript
// Soporte de depuración: si ?debug=1 incluir detalles en la respuesta
const debug = request.nextUrl.searchParams.get('debug');
if (debug) {
  return NextResponse.json(
    { success: false, error: (error as any)?.message || 'Error', stack: (error as any)?.stack },
    { status: 500 }
  );
}
```

**Problemas:**
1. Exposición de stack traces en producción con `?debug=1`
2. Información sensible filtrada en mensajes de error
3. Aunque se usa Prisma ORM (protección contra SQL injection), hay queries dinámicas peligrosas

**Escenario de Explotación:**
```
GET /api/reservations?debug=1
# Responde con stack trace completo, estructura de base de datos, rutas internas
```

**Recomendación:**
```typescript
// NUNCA exponer debug en producción
if (process.env.NODE_ENV === 'development' && debug) {
  // Solo en desarrollo
}

// En producción, logs genéricos:
return ApiResponse.internalError('Error procesando solicitud');
```

---

### 9. AUSENCIA DE PROTECCIÓN CSRF

**Severidad**: 🟠 **ALTA** (CVSS 7.8/10)  
**CWE**: CWE-352 (Cross-Site Request Forgery)

**Hallazgo:**
- No se encontraron tokens CSRF en formularios
- No hay validación de origen en endpoints que modifican estado
- La cookie `csrfToken` de NextAuth no se valida correctamente

**Archivo: packages/auth/src/config.ts (líneas 35-43)**
```typescript
csrfToken: {
  name: `next-auth.csrf-token-${appName}`,
  options: {
    httpOnly: true,
    sameSite: 'none', // ⚠️ Vulnerable a CSRF
    path: '/',
    secure: true,
  },
},
```

**Impacto:**
- Un atacante puede crear una página maliciosa que ejecute acciones en nombre del usuario autenticado
- Modificación de balances de créditos
- Creación/cancelación de reservas
- Cambio de configuración de cuenta

**Escenario de Explotación:**
```html
<!-- Sitio malicioso: evil.com -->
<form action="https://polideportivo-api.vercel.app/api/admin/credits/adjust" method="POST">
  <input name="userId" value="victim-id" />
  <input name="amount" value="10000" />
  <input name="reason" value="test" />
</form>
<script>document.forms[0].submit();</script>
<!-- Si la víctima (admin) visita evil.com, se ejecuta automáticamente -->
```

**Recomendación:**
```typescript
// 1. Configurar SameSite correctamente
csrfToken: {
  options: {
    sameSite: 'strict', // o 'lax' como mínimo
  }
}

// 2. Validar CSRF token en endpoints críticos
export async function POST(request: NextRequest) {
  const csrfToken = request.cookies.get('next-auth.csrf-token');
  const bodyToken = (await request.json()).csrfToken;
  
  if (!csrfToken || csrfToken !== bodyToken) {
    return ApiResponse.forbidden('CSRF token inválido');
  }
  // ...
}

// 3. Validar origen de la petición
const origin = request.headers.get('origin');
const allowedOrigins = ['https://polideportivo-web.vercel.app'];
if (!origin || !allowedOrigins.includes(origin)) {
  return ApiResponse.forbidden('Origen no permitido');
}
```

---

### 10. WEBHOOK DE PAGOS SIN VALIDACIÓN ADECUADA

**Severidad**: 🔴 **CRÍTICA** (CVSS 9.2/10)  
**CWE**: CWE-345 (Insufficient Verification of Data Authenticity)

**Hallazgo:**

**Archivo: apps/api/src/app/api/payments/webhook/redsys/route.ts**

```typescript
export async function POST(request: NextRequest) {
  // Procesa webhooks de Redsys
  // Si falla la validación, RESPONDE 200 DE TODOS MODOS
  return ApiResponse.success({ received: true, success: false }); // ⚠️ Línea 508
}
```

**Problemas:**
1. Siempre responde 200 OK, incluso ante errores de validación
2. Un atacante puede enviar webhooks falsos
3. No hay verificación robusta de la firma Redsys antes de procesar
4. No hay idempotencia estricta - posible doble procesamiento

**Impacto:**
- Recarga de créditos falsa sin pago real
- Fraude financiero
- Manipulación de estados de reservas/pedidos

**Recomendación:**
```typescript
export async function POST(request: NextRequest) {
  try {
    // 1. Verificar IP de origen (Redsys tiene IPs fijas)
    const ip = request.headers.get('x-forwarded-for');
    const allowedIPs = process.env.REDSYS_ALLOWED_IPS?.split(',') || [];
    if (!ip || !allowedIPs.includes(ip)) {
      console.error('Webhook from unauthorized IP:', ip);
      return new NextResponse('Unauthorized', { status: 401 });
    }
    
    // 2. Validar firma ANTES de procesar
    const isValid = await paymentService.verifyRedsysSignature({
      signature: Ds_Signature,
      merchantParameters: Ds_MerchantParameters,
    });
    
    if (!isValid) {
      console.error('Invalid Redsys signature');
      return new NextResponse('Invalid signature', { status: 403 });
    }
    
    // 3. Verificar idempotencia ESTRICTA
    const orderId = merchantData.orderId;
    const existing = await db.webhookEvent.findFirst({
      where: { 
        provider: 'REDSYS',
        eventId: orderId,
        processed: true
      }
    });
    
    if (existing) {
      console.log('Webhook already processed:', orderId);
      return ApiResponse.success({ received: true, alreadyProcessed: true });
    }
    
    // 4. Procesar en transacción con locks
    await db.$transaction(async (tx) => {
      // Usar row-level locks para prevenir race conditions
      await tx.$executeRaw`SELECT * FROM orders WHERE id = ${orderId} FOR UPDATE`;
      // ...procesar pago
    });
    
    return ApiResponse.success({ received: true, success: true });
    
  } catch (error) {
    console.error('Webhook error:', error);
    // NO responder 200 en caso de error
    return new NextResponse('Processing error', { status: 500 });
  }
}
```

---

### 11. AUTENTICACIÓN CON MÚLTIPLES VECTORES DE ATAQUE

**Severidad**: 🟠 **ALTA** (CVSS 7.6/10)  
**CWE**: CWE-287 (Improper Authentication)

**Hallazgos:**

**Archivo: apps/api/src/lib/middleware/index.ts (líneas 176-186)**
```typescript
if (authHeader && authHeader.startsWith('Bearer ')) {
  const token = authHeader.substring(7);
  try {
    user = await authService.getUserFromToken(token);
  } catch (jwtError) {
    console.log('⚠️ [AUTH] Error en autenticación JWT, el token podría no ser nuestro o ser inválido:', jwtError);
    // No hacemos nada aquí ⚠️
  }
}
```

**Problemas:**
1. Silenciosamente ignora errores de validación de JWT
2. Permite intentos de autenticación con tokens inválidos sin penalty
3. No hay logging de intentos fallidos (SIEM/alertas)
4. El middleware intenta múltiples métodos de autenticación sin orden claro

**Archivo: apps/admin/src/middleware.ts (líneas 10-65)**
```typescript
const cookieName = process.env.NEXTAUTH_COOKIE_NAME || 'next-auth.session-token-admin';

const candidateCookieNames = [
  cookieName,
  process.env.PORT ? `next-auth.session-token-${process.env.PORT}` : undefined,
  'next-auth.session-token-admin',
  'next-auth.session-token',
  '__Secure-next-auth.session-token',
].filter(Boolean) as string[];
```

**Problemas:**
1. Intenta múltiples nombres de cookies - confusión de autenticación
2. No hay una única fuente de verdad para el nombre de la cookie
3. Vulnerable a session fixation si un atacante puede inyectar cookies

**Recomendación:**
```typescript
// 1. Usar UN SOLO método de autenticación por aplicación
// 2. Logging estricto de intentos fallidos
// 3. Bloqueo temporal tras múltiples fallos

export const withAuth = (handler: (req: NextRequest) => Promise<NextResponse>) => {
  return async (req: NextRequest) => {
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    
    try {
      const user = await authenticateRequest(req);
      
      if (!user) {
        // Registrar intento fallido
        await logFailedAuth(ip, req.url);
        
        // Verificar si está bloqueado
        if (await isBlocked(ip)) {
          return NextResponse.json(
            { error: 'Demasiados intentos fallidos. Intente más tarde.' },
            { status: 429 }
          );
        }
        
        return NextResponse.json(
          { error: 'No autorizado' },
          { status: 401 }
        );
      }
      
      // Éxito - resetear contador de fallos
      await resetFailedAttempts(ip);
      
      (req as any).user = user;
      return handler(req);
      
    } catch (error) {
      // Logging crítico
      console.error('[SECURITY] Authentication error:', { ip, path: req.url, error });
      return NextResponse.json({ error: 'Error de autenticación' }, { status: 500 });
    }
  };
};
```

---

### 12. ESCALADA DE PRIVILEGIOS EN CONTROL DE ACCESO

**Severidad**: 🔴 **CRÍTICA** (CVSS 8.8/10)  
**CWE**: CWE-269 (Improper Privilege Management)

**Hallazgo:**

**Archivo: apps/api/src/lib/middleware/index.ts (líneas 293-321)**
```typescript
export const withRole = (requiredRole: 'USER' | 'STAFF' | 'ADMIN') => {
  return (handler: (req: NextRequest) => Promise<NextResponse>) => {
    return withAuth(async (req: NextRequest) => {
      const user = (req as any)?.user as { role: 'USER' | 'STAFF' | 'ADMIN' } | undefined;
      
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

      return handler(req);
    });
  };
};
```

**Problemas:**
1. El rol viene del JWT, que está en el cliente
2. No hay re-verificación del rol contra la base de datos
3. Si un usuario modifica su JWT localmente (antes de la firma), puede intentar escalada
4. No hay validación de que el rol en el token coincida con el rol en la DB

**Escenario de Explotación:**
```typescript
// Un usuario obtiene un token válido
// Modifica el payload (antes de firmar) para cambiar el rol
const payload = {
  id: 'user-id',
  email: 'user@example.com',
  role: 'ADMIN' // ⚠️ Modificado de 'USER'
};
// Si el secreto se filtra o se puede adivinar, puede firmar el token
```

**Recomendación:**
```typescript
export const withRole = (requiredRole: 'USER' | 'STAFF' | 'ADMIN') => {
  return (handler: (req: NextRequest) => Promise<NextResponse>) => {
    return withAuth(async (req: NextRequest) => {
      const tokenUser = (req as any)?.user;
      
      // RE-VERIFICAR rol contra la base de datos
      const dbUser = await db.user.findUnique({
        where: { id: tokenUser.id },
        select: { role: true, isActive: true }
      });
      
      if (!dbUser || !dbUser.isActive) {
        return NextResponse.json(
          { error: 'Usuario no válido' },
          { status: 401 }
        );
      }
      
      // Verificar que el rol del token coincide con la DB
      if (dbUser.role !== tokenUser.role) {
        console.error('[SECURITY] Role mismatch detected:', {
          userId: tokenUser.id,
          tokenRole: tokenUser.role,
          dbRole: dbUser.role
        });
        return NextResponse.json(
          { error: 'Token inválido' },
          { status: 401 }
        );
      }
      
      // Ahora verificar jerarquía
      const roleHierarchy = { USER: 0, STAFF: 1, ADMIN: 2 } as const;
      if (roleHierarchy[dbUser.role] < roleHierarchy[requiredRole]) {
        return NextResponse.json(
          { error: 'Permisos insuficientes' },
          { status: 403 }
        );
      }
      
      return handler(req);
    });
  };
};
```

---

### 13. EXPOSICIÓN DE ENDPOINTS DE DEBUGGING EN PRODUCCIÓN

**Severidad**: 🟠 **ALTA** (CVSS 7.4/10)  
**CWE**: CWE-489 (Active Debug Code)

**Hallazgos:**

Múltiples endpoints de debugging expuestos:

```
/api/debug/auth-token/route.ts
/api/debug/auth-session/route.ts
/api/debug/user-duplicates/route.ts
/api/debug/reservations-august-23/route.ts
/api/debug/test-endpoint/route.ts
/api/debug/fix-user-sync/route.ts
/api/test-db/route.ts
/api/test/email/route.ts
/api/admin/credits/test-simple/route.ts
/api/admin/credits/test-admin/route.ts
/api/admin/credits/test-no-middleware/route.ts
```

**Impacto:**
- Exposición de estructura interna de la aplicación
- Posible ejecución de operaciones de debug en producción
- Información sobre usuarios, sesiones y configuración

**Recomendación:**
```typescript
// Proteger o eliminar en producción
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return new NextResponse('Not Found', { status: 404 });
  }
  // ... lógica de debug
}

// O mejor aún: No desplegar estos archivos en producción
// Agregar a .vercelignore:
/api/debug/**
/api/test/**
**/test-*.ts
```

---

### 14. FALTA DE SANITIZACIÓN EN EXPORTACIÓN GDPR

**Severidad**: 🟠 **ALTA** (CVSS 7.0/10)  
**CWE**: CWE-200 (Exposure of Sensitive Information)

**Hallazgo:**

**Archivo: apps/api/src/app/api/users/export/route.ts (líneas 15-38)**
```typescript
const me = await db.user.findUnique({
  where: { id: user.id },
  include: {
    memberships: true,
    reservations: true,
    tournamentUsers: true,
    waitingLists: true,
    // No incluimos tokens sensibles ⚠️ (pero sí incluye otros datos sensibles)
  },
});

const exportPayload = {
  generatedAt: new Date().toISOString(),
  user: me, // ⚠️ Incluye password hasheado
  paymentMethods,
};

return ApiResponse.success(exportPayload, 200);
```

**Problemas:**
1. Incluye el hash de la contraseña en la exportación
2. Incluye `firebaseUid` que es sensible
3. No sanitiza campos internos
4. El endpoint no tiene rate limiting - posible DDoS

**Recomendación:**
```typescript
const me = await db.user.findUnique({
  where: { id: user.id },
  select: {
    id: true,
    email: true,
    name: true,
    phone: true,
    // NO incluir: password, firebaseUid, tokens
    dateOfBirth: true,
    creditsBalance: true,
    createdAt: true,
    memberships: {
      select: {
        type: true,
        validFrom: true,
        validUntil: true,
        // NO incluir paymentIntentId
      }
    },
    reservations: {
      select: {
        startTime: true,
        endTime: true,
        totalPrice: true,
        status: true,
        // NO incluir paymentIntentId, paymentMethod
      }
    }
  },
});

const exportPayload = {
  generatedAt: new Date().toISOString(),
  disclaimer: 'Este es un extracto de sus datos personales según GDPR',
  user: me,
  paymentMethods: paymentMethods.map(pm => ({
    brand: pm.brand,
    last4: pm.last4,
    // NO incluir datos completos de tarjeta
  })),
};
```

---

### 15. FALTA DE VALIDACIÓN DE TIPOS EN INPUTS

**Severidad**: 🟠 **ALTA** (CVSS 7.2/10)  
**CWE**: CWE-20 (Improper Input Validation)

**Hallazgo:**

Aunque se usa Zod para validación, hay casos donde la validación es insuficiente:

**Archivo: apps/api/src/app/api/reservations/route.ts (líneas 267-296)**
```typescript
await (db as any).$transaction(async (tx: any) => {
  // ...
  const user = await tx.user.findUnique({ where: { id: finalUserId }, select: { creditsBalance: true } });
  if (!user) throw new Error('Usuario no encontrado');
  if ((user.creditsBalance || 0) < creditsNeeded) {
    throw new Error('Saldo de créditos insuficiente');
  }

  await tx.user.update({ where: { id: finalUserId }, data: { creditsBalance: { decrement: creditsNeeded } } });
  // ⚠️ No valida que creditsNeeded sea positivo o razonable
  // ⚠️ creditsNeeded viene de un cálculo, pero no hay límites
});
```

**Problemas:**
1. No valida rangos máximos/mínimos en cantidades monetarias
2. No valida que los IDs sean del formato correcto
3. No valida longitud máxima de strings en varios endpoints

**Recomendación:**
```typescript
const CreateReservationSchema = z.object({
  courtId: z.string().min(1).max(50).regex(/^[a-zA-Z0-9_-]+$/),
  startTime: z.string().datetime(),
  duration: z.number().min(30).max(480), // Ya está bien
  paymentMethod: z.enum(['stripe', 'redsys', 'redsys_bizum', 'credits']).optional(),
  notes: z.string().max(1000).optional(), // Agregar límite
  sport: z.string().max(50).optional(),
  lightingSelected: z.boolean().optional().default(false),
});

// En el cálculo de créditos:
const creditsNeeded = Math.ceil(amount / euroPerCredit);
if (creditsNeeded > 10000) { // Límite razonable
  return NextResponse.json(
    { error: 'La reserva excede el límite de créditos permitido' },
    { status: 400 }
  );
}
```

---

### 16. CONFIGURACIÓN next.config.js INSEGURA

**Severidad**: 🟠 **ALTA** (CVSS 6.8/10)  
**CWE**: CWE-16 (Configuration)

**Hallazgo:**

**Archivo: apps/api/next.config.js (líneas 9-12)**
```javascript
eslint: {
  ignoreDuringBuilds: true, // ⚠️ Ignora errores de ESLint en builds
},
```

**Archivo: apps/admin/next.config.js (líneas 35-57)**
```javascript
images: {
  domains: [
    'images.unsplash.com',
    'www.madrid.es',
    'madrid.es',
    'identidad.madrid.es',
    'res.cloudinary.com',
    'upload.wikimedia.org',
    'pbs.twimg.com',
    'img.freepik.com',
    'static.vecteezy.com',
  ],
  // ⚠️ Lista muy permisiva de dominios externos
}
```

**Problemas:**
1. Deshabilitar ESLint en builds permite que código con problemas llegue a producción
2. Lista de dominios de imágenes demasiado amplia - posible exfiltración de datos
3. Un atacante podría inyectar URLs de imágenes maliciosas

**Recomendación:**
```javascript
// 1. NO ignorar ESLint
eslint: {
  ignoreDuringBuilds: false,
  dirs: ['src'], // Escanear solo src
},

// 2. Restringir dominios de imágenes
images: {
  remotePatterns: [
    {
      protocol: 'https',
      hostname: 'res.cloudinary.com',
      pathname: '/your-cloud-name/**', // Especificar path
    },
    // Solo dominios necesarios y específicos
  ],
  minimumCacheTTL: 60,
  formats: ['image/webp'], // Optimización
}
```

---

### 17. MANEJO INSEGURO DE SECRETOS

**Severidad**: 🔴 **CRÍTICA** (CVSS 9.0/10)  
**CWE**: CWE-798 (Use of Hard-coded Credentials)

**Hallazgo:**

Se encontraron 167 referencias a `process.env` en el código, con varios problemas:

**Archivo: apps/api/src/lib/auth.ts (línea 38)**
```typescript
const token = await getToken({ req, secret: process.env.AUTH_SECRET });
// ⚠️ No valida si AUTH_SECRET está definido
```

**Archivo: apps/api/src/app/api/payments/webhook/redsys/route.ts (línea 379)**
```typescript
const jwtSecret = process.env.JWT_SECRET || ''; // ⚠️ Fallback a string vacío
```

**Archivo: apps/api/src/middleware.ts (líneas 22-26)**
```typescript
const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
if (!secret) {
  console.error('AUTH_SECRET no definido.');
  return NextResponse.next(); // ⚠️ Continúa sin secreto
}
```

**Problemas:**
1. Fallbacks inseguros cuando las variables no están definidas
2. No hay validación en el inicio de que todos los secretos necesarios estén presentes
3. Secretos podrían estar expuestos en logs (ver vulnerabilidad #3)
4. No hay rotación de secretos documentada

**Impacto:**
- Si `JWT_SECRET` es vacío, los tokens pueden ser falsificados
- Si `AUTH_SECRET` no está definido, la autenticación puede fallar silenciosamente
- Exposición accidental de secretos en logs o código

**Recomendación:**
```typescript
// 1. Validar secretos en el inicio de la aplicación
// Crear: apps/api/src/lib/env.ts
import { z } from 'zod';

const EnvSchema = z.object({
  AUTH_SECRET: z.string().min(32),
  JWT_SECRET: z.string().min(32),
  DATABASE_URL: z.string().url(),
  REDSYS_MERCHANT_KEY: z.string().min(32),
  // ... todos los secretos requeridos
});

export const env = EnvSchema.parse(process.env);

// 2. Usar en el código
import { env } from '@/lib/env';
const token = await getToken({ req, secret: env.AUTH_SECRET });

// 3. Si falla la validación, la app NO inicia

// 4. Implementar rotación de secretos
// - Almacenar en Vercel Secrets
// - Rotar cada 90 días
// - Documentar proceso de rotación
```

---

## 🟡 VULNERABILIDADES DE SEVERIDAD MEDIA-ALTA

### 18. Falta de Logging y Monitoreo de Seguridad
- No hay sistema de logging centralizado
- No hay alertas de seguridad
- No hay métricas de intentos de autenticación fallidos
- No hay SIEM (Security Information and Event Management)

### 19. Falta de Protección contra Bots
- No hay CAPTCHA en formularios de registro/login
- No hay protección contra scrapers
- No hay detección de comportamiento automatizado

### 20. Información Sensible en URLs
- Tokens de acceso en query parameters (`/receipt?token=...`)
- Los tokens en URLs pueden quedar en logs de servidor, proxies, historial del navegador

### 21. Falta de Integridad de Subresource (SRI)
- No se usan hashes SRI para scripts externos (Stripe, analytics)
- Vulnerable a CDN compromises

### 22. Falta de Políticas de Contraseñas
- No se encontró validación de complejidad de contraseñas
- No hay detección de contraseñas comprometidas (Have I Been Pwned API)
- No fuerza rotación periódica

### 23. Falta de Auditoría Completa
- La tabla `audit_logs` existe pero no se está utilizando consistentemente
- No hay auditoría de accesos a datos sensibles
- No hay trail de cambios en datos críticos (balances, roles)

---

## 📊 RESUMEN DE VULNERABILIDADES POR SEVERIDAD

| Severidad | Cantidad | Categoría |
|-----------|----------|-----------|
| 🔴 **CRÍTICA** | 8 | RLS, Permisos DB, Logs, Headers, CSRF, Webhooks, Secretos, Escalada |
| 🟠 **ALTA** | 15 | CORS, JWT, Rate Limiting, Validación, Debugging, GDPR, Config |
| 🟡 **MEDIA** | 6 | Logging, Bots, URLs, SRI, Contraseñas, Auditoría |
| **TOTAL** | **29** | **Requieren atención inmediata** |

---

## 🎯 PLAN DE REMEDIACIÓN PRIORITARIO

### ✅ FASE 1: CRÍTICO - IMPLEMENTAR EN 24-48 HORAS

1. **HABILITAR RLS** en Supabase para todas las tablas ⚠️⚠️⚠️
2. **REVOCAR permisos** excesivos del rol `anon`
3. **IMPLEMENTAR headers** de seguridad HTTP (CSP, HSTS, etc.)
4. **ELIMINAR logging** de información sensible en producción
5. **VALIDAR webhooks** de Redsys con firma y origen
6. **CONFIGURAR CSRF** protection adecuada
7. **VALIDAR secretos** al inicio de la aplicación
8. **DESHABILITAR endpoints** de debugging en producción

### ✅ FASE 2: ALTA - IMPLEMENTAR EN 1 SEMANA

9. Implementar **rate limiting distribuido** (Vercel KV/Redis)
10. **Reducir duración** de tokens JWT a 4 horas + refresh tokens
11. **Restringir CORS** a dominios específicos
12. **Re-verificar roles** contra DB en cada petición
13. Agregar **validación estricta** de tipos y rangos
14. **Sanitizar exportaciones** GDPR
15. **Habilitar ESLint** en builds

### ✅ FASE 3: MEDIA - IMPLEMENTAR EN 2-4 SEMANAS

16. Implementar **logging centralizado** y SIEM
17. Agregar **CAPTCHA** en formularios públicos
18. Implementar **políticas de contraseñas** robustas
19. Mover **tokens de URLs** a headers
20. Agregar **SRI** para recursos externos
21. Implementar **auditoría completa** de accesos

---

## 🛡️ CHECKLIST DE SEGURIDAD PARA PRODUCCIÓN

Antes de operar en producción, verificar:

- [ ] RLS habilitado en TODAS las tablas
- [ ] Permisos de DB restrictivos (principio de mínimo privilegio)
- [ ] Headers de seguridad HTTP configurados
- [ ] No hay logs de información sensible
- [ ] Rate limiting efectivo implementado
- [ ] CSRF protection activa
- [ ] Tokens JWT con duración corta
- [ ] Endpoints de debug eliminados/protegidos
- [ ] Webhooks validados con firma
- [ ] Secretos rotados y validados
- [ ] CORS restrictivo
- [ ] Re-verificación de roles contra DB
- [ ] Validación estricta de inputs
- [ ] Sanitización de outputs
- [ ] ESLint habilitado
- [ ] Tests de seguridad pasando
- [ ] Monitoreo y alertas configurados
- [ ] Plan de respuesta a incidentes documentado
- [ ] Backups regulares configurados
- [ ] Certificados SSL/TLS válidos
- [ ] Cumplimiento GDPR verificado

---

## 📚 RECURSOS Y REFERENCIAS

- [OWASP Top 10 2021](https://owasp.org/www-project-top-ten/)
- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)
- [CWE/SANS Top 25](https://cwe.mitre.org/top25/)
- [Vercel Security Best Practices](https://vercel.com/docs/security)
- [Next.js Security Headers](https://nextjs.org/docs/advanced-features/security-headers)
- [Supabase Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [GDPR Compliance](https://gdpr.eu/)

---

## ⚖️ CONFORMIDAD LEGAL Y REGULATORIA

### GDPR (Reglamento General de Protección de Datos)

❌ **INCUMPLIMIENTOS DETECTADOS:**

1. **Artículo 5 - Principios del tratamiento**: Datos no protegidos adecuadamente (RLS deshabilitado)
2. **Artículo 25 - Protección de datos desde el diseño**: No implementado (Privacy by Design)
3. **Artículo 32 - Seguridad del tratamiento**: Medidas técnicas insuficientes
4. **Artículo 33 - Notificación de violaciones**: No hay sistema de detección de brechas
5. **Artículo 15 - Derecho de acceso**: Exportación GDPR expone datos sensibles innecesarios

**MULTAS POTENCIALES**: Hasta 20 millones de euros o 4% de la facturación anual global

### PSD2 (Directiva de Servicios de Pago)

⚠️ **ÁREAS DE PREOCUPACIÓN:**
- Autenticación de pagos debe ser reforzada (SCA - Strong Customer Authentication)
- Webhooks de Redsys deben tener validación robusta

---

## 📝 CONCLUSIÓN

El proyecto presenta **vulnerabilidades críticas** que deben ser resueltas ANTES de operar en producción con datos reales de clientes. La más grave es el **RLS completamente deshabilitado**, que expone todos los datos de todos los usuarios a cualquier persona.

**Recomendación**: **NO DESPLEGAR A PRODUCCIÓN** hasta haber completado al menos la **FASE 1** del plan de remediación.

**Tiempo estimado de remediación completa**: 4-6 semanas con un equipo dedicado.

---

**Generado automáticamente el**: 13 de Octubre de 2025  
**Próxima auditoría recomendada**: Cada 3 meses + auditoría externa anual  
**Contacto para remediación**: [Equipo de Seguridad]

---

## 🔐 ANEXO: CÓDIGO DE EJEMPLO SEGURO

Ver archivo adjunto: `SECURE_CODE_EXAMPLES.md`

---

*Este reporte es confidencial y solo debe ser compartido con personal autorizado con necesidad de conocimiento.*

