import { NextRequest } from 'next/server';
import { ApiResponse, withAdminMiddleware } from '@/lib/middleware';
import { db } from '@repo/db';

/**
 * Sincronización mínima de BD para desbloquear autenticación y tareas básicas.
 *
 * - Crea la tabla public.users si no existe con las columnas esperadas por Prisma
 * - Asegura índices/constraints clave (email único, firebase_uid único)
 * - (Opcional) Normaliza valores de status en reservations a UPPERCASE
 * - (Opcional) Asegura columna expires_at en reservations
 * - (Opcional) Crea tabla outbox_events si no existe
 *
 * Seguridad:
 * - Si se define CRON_SECRET en el entorno y el query param ?secret= coincide,
 *   se ejecuta SIN pasar por el middleware (para bootstrap cuando no existe users).
 * - Si no hay secreto válido, requiere sesión ADMIN mediante withAdminMiddleware.
 */
async function runSync() {
  const actions: string[] = [];

  // Extensiones recomendadas para UUID
  try {
    await db.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');
    actions.push('EXTENSION pgcrypto asegurada');
  } catch (e) {
    // fallback no fatal
  }
  try {
    await db.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
    actions.push('EXTENSION uuid-ossp asegurada');
  } catch (e) {
    // noop
  }

  // 1) Tabla users (alineada al modelo Prisma @@map("users"))
  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS public.users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      name TEXT,
      first_name TEXT,
      last_name TEXT,
      phone TEXT,
      password TEXT,
      firebase_uid TEXT,
      role VARCHAR(20) DEFAULT 'USER' CHECK (role IN ('USER','STAFF','ADMIN')),
      date_of_birth TIMESTAMPTZ,
      membership_type TEXT,
      membership_expires_at TIMESTAMPTZ,
      credits_balance INTEGER DEFAULT 0,
      is_active BOOLEAN DEFAULT TRUE,
      avatar TEXT,
      last_login_at TIMESTAMPTZ,
      email_verified BOOLEAN DEFAULT FALSE,
      email_verified_at TIMESTAMPTZ,
      gdpr_consent BOOLEAN DEFAULT FALSE,
      gdpr_consent_date TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  actions.push('Tabla users creada si no existía');

  // Unicidad e índices clave
  await db.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS users_email_key ON public.users(email);`);
  actions.push('Índice único en users.email asegurado');
  await db.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS users_firebase_uid_key ON public.users(firebase_uid);`);
  actions.push('Índice único en users.firebase_uid asegurado');

  // Asegurar columnas faltantes si la tabla users ya existía con un esquema mínimo
  const addCol = async (sql: string, note: string) => {
    try { await db.$executeRawUnsafe(sql); actions.push(note); } catch { /* noop */ }
  };
  await addCol(`ALTER TABLE public.users ADD COLUMN IF NOT EXISTS first_name TEXT;`, 'users.first_name asegurado');
  await addCol(`ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_name TEXT;`, 'users.last_name asegurado');
  await addCol(`ALTER TABLE public.users ADD COLUMN IF NOT EXISTS firebase_uid TEXT;`, 'users.firebase_uid asegurado');
  await addCol(`ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avatar TEXT;`, 'users.avatar asegurado');
  await addCol(`ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;`, 'users.last_login_at asegurado');
  await addCol(`ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;`, 'users.email_verified asegurado');
  await addCol(`ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;`, 'users.email_verified_at asegurado');
  await addCol(`ALTER TABLE public.users ADD COLUMN IF NOT EXISTS date_of_birth TIMESTAMPTZ;`, 'users.date_of_birth asegurado');
  await addCol(`ALTER TABLE public.users ADD COLUMN IF NOT EXISTS membership_type TEXT;`, 'users.membership_type asegurado');
  await addCol(`ALTER TABLE public.users ADD COLUMN IF NOT EXISTS membership_expires_at TIMESTAMPTZ;`, 'users.membership_expires_at asegurado');
  await addCol(`ALTER TABLE public.users ADD COLUMN IF NOT EXISTS credits_balance INTEGER DEFAULT 0;`, 'users.credits_balance asegurado');
  await addCol(`ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;`, 'users.is_active asegurado');
  await addCol(`ALTER TABLE public.users ADD COLUMN IF NOT EXISTS gdpr_consent BOOLEAN DEFAULT FALSE;`, 'users.gdpr_consent asegurado');
  await addCol(`ALTER TABLE public.users ADD COLUMN IF NOT EXISTS gdpr_consent_date TIMESTAMPTZ;`, 'users.gdpr_consent_date asegurado');
  await addCol(`ALTER TABLE public.users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();`, 'users.created_at asegurado');
  await addCol(`ALTER TABLE public.users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();`, 'users.updated_at asegurado');
  await addCol(`ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'USER';`, 'users.role asegurado');

  // 2) reservations: asegurar expires_at y normalizar status
  await db.$executeRawUnsafe(`ALTER TABLE IF EXISTS public.reservations ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;`);
  actions.push('reservations.expires_at asegurado');
  try {
    await db.$executeRawUnsafe(`UPDATE public.reservations SET status = UPPER(status) WHERE status ~ '^[a-z]';`);
    actions.push('reservations.status normalizado a UPPERCASE');
  } catch { /* noop */ }

  // 3) outbox_events para eventos asíncronos
  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS public.outbox_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      event_type VARCHAR(255) NOT NULL,
      event_data JSONB NOT NULL,
      processed BOOLEAN DEFAULT FALSE,
      processed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  actions.push('Tabla outbox_events creada si no existía');

  return { actions };
}

export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret') || '';
  const cronSecret = process.env.CRON_SECRET || '';

  // Si hay secreto válido, ejecutar sin middleware (bootstrap)
  if (cronSecret && secret === cronSecret) {
    try {
      const result = await runSync();
      return ApiResponse.success({
        message: 'Sincronización mínima completada (modo secreto).',
        ...result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[DB/SYNC] Error en modo secreto:', error);
      return ApiResponse.internalError('Error al sincronizar BD');
    }
  }

  // En otros casos, requerir ADMIN mediante middleware
  return withAdminMiddleware(async () => {
    try {
      const result = await runSync();
      return ApiResponse.success({
        message: 'Sincronización mínima completada.',
        ...result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[DB/SYNC] Error:', error);
      return ApiResponse.internalError('Error al sincronizar BD');
    }
  })(request, {} as any);
}