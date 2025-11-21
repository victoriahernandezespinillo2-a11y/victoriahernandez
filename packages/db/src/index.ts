import { config } from 'dotenv';
import fs from 'fs';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import { fileURLToPath } from 'url';

// Obtener __dirname equivalente para ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar variables de entorno de forma robusta (monorepo / Next .next)
(() => {
  // Priorizar .env.local primero (Next.js lo usa en desarrollo)
  const candidatePaths = [
    path.resolve(process.cwd(), '.env.local'),
    path.resolve(process.cwd(), '../../.env.local'),
    path.resolve(process.cwd(), '../../../.env.local'),
    path.resolve(__dirname, '../../.env.local'),
    path.resolve(__dirname, '../../../.env.local'),
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), '../../.env'),
    path.resolve(process.cwd(), '../../../.env'),
    path.resolve(__dirname, '../../.env'),
    path.resolve(__dirname, '../../../.env'),
  ];
  for (const p of candidatePaths) {
    try {
      if (fs.existsSync(p)) {
        config({ path: p });
        break;
      }
    } catch {
      // ignorar y probar siguiente
    }
  }

  // Normalizar URLs para Supabase (TLS y, opcionalmente, Pooler)
  try {
    if (process.env.DATABASE_URL?.includes('.supabase.co')) {
      const url = new URL(process.env.DATABASE_URL);
      const params = url.searchParams;
      const usePooler = params.get('pgbouncer') === 'true' || process.env.SUPABASE_USE_POOLER === 'true';

      if (usePooler) {
        // Forzar Pooler 6543 solo si está indicado explícitamente
        if (url.port === '' || url.port === '5432') url.port = '6543';
        if (!params.has('pgbouncer')) params.set('pgbouncer', 'true');
        if (!params.has('connection_limit')) params.set('connection_limit', '1');
      } else {
        // No usar pooler: quitar flags y normalizar a 5432 si fuese necesario
        params.delete('pgbouncer');
        params.delete('connection_limit');
        if (url.port === '6543') url.port = '5432';
      }

      if (!params.has('sslmode')) params.set('sslmode', 'require');
      process.env.DATABASE_URL = url.toString();

      // Si no hay DIRECT_DATABASE_URL, derivarla a 5432 con TLS (sin pooler)
      if (!process.env.DIRECT_DATABASE_URL) {
        const direct = new URL(process.env.DATABASE_URL);
        direct.port = '5432';
        direct.searchParams.delete('pgbouncer');
        direct.searchParams.delete('connection_limit');
        direct.searchParams.set('sslmode', 'require');
        process.env.DIRECT_DATABASE_URL = direct.toString();
      }
    } else if (process.env.DATABASE_URL && !/[?&]sslmode=/.test(process.env.DATABASE_URL)) {
      const sep = process.env.DATABASE_URL.includes('?') ? '&' : '?';
      process.env.DATABASE_URL = `${process.env.DATABASE_URL}${sep}sslmode=require`;
    }
  } catch {
    // Si falla el parseo, continuar con el valor original
  }
})();

// Asegurar SSL para Supabase/Neon en cualquier entorno
if (process.env.DATABASE_URL && !/[?&]sslmode=/.test(process.env.DATABASE_URL)) {
  const sep = process.env.DATABASE_URL.includes('?') ? '&' : '?';
  process.env.DATABASE_URL = `${process.env.DATABASE_URL}${sep}sslmode=require`;
}

// Logs de debugging solo en desarrollo
if (process.env.NODE_ENV !== 'production') {
  console.log('--- DEBUGGING DATABASE_URL (FIXED) ---');
  console.log('DATABASE_URL:', process.env.DATABASE_URL?.replace(/:[^:@]*@/, ':***@') || 'undefined');
  console.log('DIRECT_DATABASE_URL:', process.env.DIRECT_DATABASE_URL?.replace(/:[^:@]*@/, ':***@') || 'undefined');
  // Verificar que DIRECT_DATABASE_URL esté definida
  if (!process.env.DIRECT_DATABASE_URL && !process.env.DATABASE_URL) {
    console.error('❌ ERROR: Ni DATABASE_URL ni DIRECT_DATABASE_URL están definidas');
  }
  console.log('--- FIN DEBUGGING ---');
}

// Configurar el cliente de Prisma
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db = globalForPrisma.prisma ??
  (() => {
    try {
      // En producción serverless (Vercel), SIEMPRE usar DATABASE_URL (pooler)
      // En desarrollo, SIEMPRE priorizar DIRECT_DATABASE_URL para conexiones directas
      const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
      let databaseUrl: string | undefined;
      if (isProduction) {
        databaseUrl = process.env.DATABASE_URL || process.env.DIRECT_DATABASE_URL;
      } else {
        // En desarrollo: SIEMPRE usar DIRECT_DATABASE_URL si está disponible
        databaseUrl = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL;
        if (process.env.DIRECT_DATABASE_URL) {
          console.log('✅ [DB] Usando DIRECT_DATABASE_URL para desarrollo');
        }
      }

      if (!databaseUrl) {
        throw new Error('DATABASE_URL o DIRECT_DATABASE_URL debe estar definido en las variables de entorno');
      }

      // Verificar que la URL no sea del Data Proxy (prisma:// o prisma+postgres://)
      // Si lo es, usar DIRECT_DATABASE_URL o forzar la URL directa
      let finalUrl = databaseUrl;
      if (databaseUrl.startsWith('prisma://') || databaseUrl.startsWith('prisma+postgres://')) {
        console.warn('⚠️ [DB] Detectada URL de Prisma Data Proxy, intentando usar URL directa...');
        if (process.env.DIRECT_DATABASE_URL) {
          finalUrl = process.env.DIRECT_DATABASE_URL;
          console.log('✅ [DB] Usando DIRECT_DATABASE_URL en lugar de Data Proxy');
        } else {
          // Intentar convertir la URL de Data Proxy a directa (no recomendado, pero como fallback)
          console.error('❌ [DB] URL de Data Proxy detectada pero no hay DIRECT_DATABASE_URL configurada');
          throw new Error('Prisma Data Proxy detectado pero DIRECT_DATABASE_URL no está configurada. Configure DIRECT_DATABASE_URL en las variables de entorno.');
        }
      }

      // Asegurar que finalUrl es una URL directa de PostgreSQL, no Data Proxy
      if (finalUrl.startsWith('prisma://') || finalUrl.startsWith('prisma+postgres://')) {
        console.error('❌ [DB] ERROR: finalUrl sigue siendo Data Proxy después de procesamiento');
        console.error(`❌ [DB] finalUrl: ${finalUrl.substring(0, 50)}...`);
        throw new Error('URL de Data Proxy detectada después del procesamiento. Verifique DIRECT_DATABASE_URL.');
      }

      // Log final para debugging
      if (process.env.NODE_ENV !== 'production') {
        console.log(`🔗 [DB] URL final que se usará: ${finalUrl.replace(/:[^:@]*@/, ':***@').substring(0, 80)}...`);
        console.log(`🔗 [DB] ¿Es Data Proxy?: ${finalUrl.startsWith('prisma://') || finalUrl.startsWith('prisma+postgres://')}`);
        console.log(`🔗 [DB] Longitud de URL: ${finalUrl.length}`);
        console.log(`🔗 [DB] Primeros 20 caracteres: ${finalUrl.substring(0, 20)}...`);
      }

      // IMPORTANTE: Eliminar CUALQUIER variable que pueda forzar Data Proxy ANTES de crear el cliente
      const originalDatabaseUrl = process.env.DATABASE_URL;
      const originalPrismaGenerateDataproxy = process.env.PRISMA_GENERATE_DATAPROXY;
      const originalPrismaEngineType = process.env.PRISMA_CLI_QUERY_ENGINE_TYPE;
      const originalPrismaClientEngineType = process.env.PRISMA_CLIENT_ENGINE_TYPE;
      
      try {
        // ESTABLECER PRIMERO la URL directa en el entorno
        process.env.DATABASE_URL = finalUrl;
        // Eliminar CUALQUIER variable que pueda forzar Data Proxy
        delete process.env.PRISMA_GENERATE_DATAPROXY;
        delete process.env.PRISMA_CLI_QUERY_ENGINE_TYPE;
        delete process.env.PRISMA_CLIENT_ENGINE_TYPE;
        
        const client = new PrismaClient({
          datasources: {
            db: {
              url: finalUrl,
            },
          },
          log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
          errorFormat: 'pretty'
        });

        // Configurar manejo de errores de conexión
        client.$on('query', (e) => {
          if (process.env.NODE_ENV === 'development') {
            console.log(`[DB-QUERY] ${e.query} - ${e.duration}ms`);
          }
        });

        client.$on('error', (e) => {
          console.error('[DB-ERROR]', e);
          // Detectar error P6001 específicamente
          if (e.message && e.message.includes('P6001')) {
            console.error('❌ [DB] ERROR P6001: Prisma Client espera URL de Data Proxy pero se proporcionó URL directa.');
            console.error('❌ [DB] SOLUCIÓN: Regenerar Prisma Client con: pnpm --filter @repo/db db:generate');
            console.error('❌ [DB] O configurar DIRECT_DATABASE_URL en las variables de entorno de Vercel.');
          }
        });

        // En desarrollo, cachear la instancia
        if (process.env.NODE_ENV !== 'production') {
          // Si ya existe una instancia anterior, intentar desconectarla (sin bloquear)
          const oldPrisma = globalForPrisma.prisma as PrismaClient | undefined;
          if (oldPrisma) {
            // Desconectar en segundo plano sin esperar
            oldPrisma.$disconnect().catch(() => {
              // Ignorar errores al desconectar
            });
          }
          globalForPrisma.prisma = client;
        }
        
        return client;
      } finally {
        // Restaurar variables de entorno originales
        if (originalDatabaseUrl !== undefined) {
          process.env.DATABASE_URL = originalDatabaseUrl;
        } else {
          delete process.env.DATABASE_URL;
        }
        if (originalPrismaGenerateDataproxy !== undefined) {
          process.env.PRISMA_GENERATE_DATAPROXY = originalPrismaGenerateDataproxy;
        }
        if (originalPrismaEngineType !== undefined) {
          process.env.PRISMA_CLI_QUERY_ENGINE_TYPE = originalPrismaEngineType;
        }
        if (originalPrismaClientEngineType !== undefined) {
          process.env.PRISMA_CLIENT_ENGINE_TYPE = originalPrismaClientEngineType;
        }
      }
    } catch (e) {
      const error = e as Error;
      console.error('[DB] PrismaClient init error:', error.message || e);

      // Detectar error P6001 durante la inicialización
      if (error.message && error.message.includes('P6001')) {
        console.error('❌ [DB] ERROR P6001 DETECTADO DURANTE INICIALIZACIÓN');
        console.error('❌ [DB] Prisma Client fue generado con configuración de Data Proxy, pero la URL es directa.');
        console.error('❌ [DB] SOLUCIÓN REQUERIDA:');
        console.error('   1. En Vercel, agregar variable DIRECT_DATABASE_URL con la URL directa de PostgreSQL');
        console.error('   2. Forzar redeploy para regenerar Prisma Client');
        console.error('   3. O ejecutar localmente: pnpm --filter @repo/db db:generate');
      }

      throw e;
    }
  })();

// NO cachear aquí - ya se cachea dentro de la función
// if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;

// Re-exportar tipos de Prisma para uso en otras partes de la aplicación
export type {
  User,
  Center,
  Court,
  Reservation,
  Tournament,
  TournamentUser,
  Membership,
  WaitingList,
  MaintenanceSchedule,
  PricingRule,
  UserRole,
  ReservationStatus,
  MembershipType,
  MaintenanceType,
  MaintenanceStatus
} from '@prisma/client';

export { TariffSegment, TariffEnrollmentStatus } from '@prisma/client';

// Exportar el cliente de Prisma como instancia por defecto
export default db;