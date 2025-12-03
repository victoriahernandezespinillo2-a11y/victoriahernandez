import { config } from 'dotenv';
import fs from 'fs';
import { PrismaClient, Prisma } from '@prisma/client';
import path from 'path';
import { fileURLToPath } from 'url';

// Obtener __dirname equivalente para ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar variables de entorno de forma robusta (monorepo)
(() => {
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

  // Normalizar URLs para Supabase (agregar SSL si falta)
  if (process.env.DATABASE_URL && !/[?&]sslmode=/.test(process.env.DATABASE_URL)) {
    const sep = process.env.DATABASE_URL.includes('?') ? '&' : '?';
    process.env.DATABASE_URL = `${process.env.DATABASE_URL}${sep}sslmode=require`;
  }
})();

// Logs de debugging solo en desarrollo
if (process.env.NODE_ENV !== 'production') {
  console.log('--- DATABASE CONFIG ---');
  console.log('DATABASE_URL:', process.env.DATABASE_URL?.replace(/:[^:@]*@/, ':***@') || 'undefined');
  console.log('DIRECT_DATABASE_URL:', process.env.DIRECT_DATABASE_URL?.replace(/:[^:@]*@/, ':***@') || 'undefined');
  console.log('--- END CONFIG ---');
}

// Configurar el cliente de Prisma
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db = globalForPrisma.prisma ??
  (() => {
    try {
      // En producción serverless (Vercel), usar DATABASE_URL (pooler)
      // En desarrollo, priorizar DIRECT_DATABASE_URL para conexiones directas
      const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
      const databaseUrl = isProduction 
        ? (process.env.DATABASE_URL || process.env.DIRECT_DATABASE_URL)
        : (process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL);

      if (!databaseUrl) {
        throw new Error('DATABASE_URL o DIRECT_DATABASE_URL debe estar definido en las variables de entorno');
      }

      if (process.env.NODE_ENV !== 'production') {
        console.log(`🔗 [DB] Usando: ${databaseUrl.replace(/:[^:@]*@/, ':***@').substring(0, 80)}...`);
      }

      // Crear cliente Prisma con configuración simple
      const client = new PrismaClient({
        datasources: {
          db: {
            url: databaseUrl,
          },
        },
        log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
        errorFormat: 'pretty'
      });

      // ✅ CORREGIDO: Prisma no soporta el evento 'error' en $on
      // Los errores se manejan automáticamente a través de try/catch en las operaciones

      // En desarrollo, cachear la instancia
      if (process.env.NODE_ENV !== 'production') {
        // Si ya existe una instancia anterior, desconectarla
        const oldPrisma = globalForPrisma.prisma as PrismaClient | undefined;
        if (oldPrisma) {
          oldPrisma.$disconnect().catch(() => {
            // Ignorar errores al desconectar
          });
        }
        globalForPrisma.prisma = client;
      }
      
      return client;
    } catch (e) {
      const error = e as Error;
      console.error('[DB] PrismaClient init error:', error.message || e);
      throw e;
    }
  })();

// Re-exportar tipos de Prisma para uso en otras partes de la aplicación
export type User = Prisma.UserGetPayload<{}>;
export type Center = Prisma.CenterGetPayload<{}>;
export type Court = Prisma.CourtGetPayload<{}>;
export type Reservation = Prisma.ReservationGetPayload<{}>;
export type Tournament = Prisma.TournamentGetPayload<{}>;
export type TournamentUser = Prisma.TournamentUserGetPayload<{}>;
export type Membership = Prisma.MembershipGetPayload<{}>;
export type WaitingList = Prisma.WaitingListGetPayload<{}>;
export type MaintenanceSchedule = Prisma.MaintenanceScheduleGetPayload<{}>;
export type PricingRule = Prisma.PricingRuleGetPayload<{}>;

// Re-exportar enums de Prisma
export { UserRole, ReservationStatus, MembershipType, MaintenanceType, MaintenanceStatus, TariffSegment, TariffEnrollmentStatus } from '@prisma/client';

// Exportar el cliente de Prisma como instancia por defecto
export default db;