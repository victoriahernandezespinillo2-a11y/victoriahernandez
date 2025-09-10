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
  const candidatePaths = [
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

console.log('--- DEBUGGING DATABASE_URL (FIXED) ---');
// Asegurar SSL para Supabase/Neon en cualquier entorno
if (process.env.DATABASE_URL && !/[?&]sslmode=/.test(process.env.DATABASE_URL)) {
  const sep = process.env.DATABASE_URL.includes('?') ? '&' : '?';
  process.env.DATABASE_URL = `${process.env.DATABASE_URL}${sep}sslmode=require`;
}
console.log('DATABASE_URL en db/index.ts:', process.env.DATABASE_URL?.replace(/:[^:@]*@/, ':***@'));
console.log('--- FIN DEBUGGING ---');

// Configurar el cliente de Prisma
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db = globalForPrisma.prisma ??
  (() => {
    try {
      const client = new PrismaClient({
        datasources: {
          db: {
            url: process.env.DATABASE_URL,
          },
        },
        log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
        errorFormat: 'pretty',
      });
      
      // Configurar manejo de errores de conexión
      client.$on('query', (e) => {
        if (process.env.NODE_ENV === 'development') {
          console.log(`[DB-QUERY] ${e.query} - ${e.duration}ms`);
        }
      });
      
      client.$on('error', (e) => {
        console.error('[DB-ERROR]', e);
      });
      
      if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = client;
      return client;
    } catch (e) {
      console.error('[DB] PrismaClient init error:', (e as Error)?.message || e);
      throw e;
    }
  })();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;

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

// Exportar el cliente de Prisma como instancia por defecto
export default db;