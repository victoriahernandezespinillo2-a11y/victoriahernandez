import dns from 'dns';
// FORZAR IPv4 - El problema es que Node.js intenta IPv6 primero y falla
dns.setDefaultResultOrder('ipv4first');

// Force Prisma Client regeneration in production - 2025-11-26
// Fix prepared statement conflicts by aggressive client regeneration

import { config } from 'dotenv';
import fs from 'fs';
// Importar PrismaClient usando require para evitar problemas de tipos
const { PrismaClient } = require('@prisma/client');
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

  // Función para normalizar URLs de base de datos
  function normalizeDatabaseUrl(urlString: string | undefined, isDirect: boolean = false): string | undefined {
    if (!urlString) return undefined;

    // CRÍTICO: Rechazar URLs de Data Proxy - NO las soportamos
    if (urlString.startsWith('prisma://') || urlString.startsWith('prisma+postgres://')) {
      console.error(`❌ [DB-NORMALIZE] ${isDirect ? 'DIRECT_DATABASE_URL' : 'DATABASE_URL'}: URL de Data Proxy detectada y rechazada. Use una URL directa de PostgreSQL (postgresql://)`);
      throw new Error(`URL de Data Proxy no permitida. Configure una URL directa de PostgreSQL (postgresql://) en ${isDirect ? 'DIRECT_DATABASE_URL' : 'DATABASE_URL'}`);
    }

    // Si no es postgresql://, rechazar
    if (!urlString.startsWith('postgresql://')) {
      console.error(`❌ [DB-NORMALIZE] ${isDirect ? 'DIRECT_DATABASE_URL' : 'DATABASE_URL'}: Protocolo inválido. Debe ser postgresql://`);
      throw new Error(`Protocolo inválido. Debe ser postgresql://`);
    }

    try {
      const url = new URL(urlString);
      const port = url.port || '5432';
      const isPooler = port === '6543' || url.searchParams.get('pgbouncer') === 'true';

      let needsModification = false;
      const password = url.password || '';
      let newUsername = url.username;
      let newSearch = url.search;

      // 1. Para pooler, mantener el usuario original (postgres.xxx), para conexión directa usar "postgres"
      if (!isPooler && url.username && url.username.startsWith('postgres.') && url.username !== 'postgres') {
        newUsername = 'postgres';
        needsModification = true;
        console.log(`🔧 [DB-NORMALIZE] ${isDirect ? 'DIRECT_DATABASE_URL' : 'DATABASE_URL'}: Usuario corregido "${url.username}" → "postgres" para conexión directa`);
      }

      // 2. Asegurar sslmode=require (sin modificar la contraseña)
      if (!url.searchParams.has('sslmode')) {
        const params = new URLSearchParams(url.search);
        params.set('sslmode', 'require');
        newSearch = '?' + params.toString();
        needsModification = true;
      }

      // Si necesita modificación, construir URL preservando la contraseña exactamente
      if (needsModification) {
        // Construir URL manualmente preservando la contraseña tal cual está (sin codificar/decodificar)
        const authPart = password ? `${newUsername}:${password}@` : `${newUsername}@`;
        const newUrl = `postgresql://${authPart}${url.hostname}${url.port ? ':' + url.port : ''}${url.pathname}${newSearch}`;
        return newUrl;
      }

      // Si no necesita modificación, devolver la URL exacta tal cual está
      return urlString;
    } catch (e) {
      console.warn(`⚠️ [DB-NORMALIZE] No se pudo parsear URL: ${e}`);
      return urlString; // Devolver original si no se puede parsear
    }
  }

  // NORMALIZAR URLs AL INICIO - ANTES DE CUALQUIER OTRA COSA
  if (process.env.DATABASE_URL) {
    process.env.DATABASE_URL = normalizeDatabaseUrl(process.env.DATABASE_URL, false) || process.env.DATABASE_URL;
  }

  if (process.env.DIRECT_DATABASE_URL) {
    process.env.DIRECT_DATABASE_URL = normalizeDatabaseUrl(process.env.DIRECT_DATABASE_URL, true) || process.env.DIRECT_DATABASE_URL;
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
  prisma: any | undefined;
};

export const db = globalForPrisma.prisma ??
  (() => {
    try {
      // Determinar URL a usar
      let databaseUrl: string | undefined;
      const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';

      if (isProduction) {
        // En producción: usar DATABASE_URL (pooler) que es el estándar en Vercel
        databaseUrl = process.env.DATABASE_URL || process.env.DIRECT_DATABASE_URL;
        } else {
          // En desarrollo: Priorizar DIRECT_DATABASE_URL (6543) si está disponible, sino DATABASE_URL (5432)
          if (process.env.DIRECT_DATABASE_URL) {
            databaseUrl = process.env.DIRECT_DATABASE_URL;
            try {
              const url = new URL(databaseUrl);
              const port = url.port || '6543';
              console.log(`✅ [DB] Usando DIRECT_DATABASE_URL para desarrollo (puerto ${port})`);
              
              // DESHABILITADO: Cambio automático de puerto causa problemas de conectividad local
              // if (port === '5432') {
              //   console.log('🔧 [DB] ADVERTENCIA: DIRECT_DATABASE_URL usa puerto 5432, cambiando a 6543 (pooler)');
              //   const newUrl = databaseUrl.replace(':5432/', ':6543/');
              //   databaseUrl = newUrl;
              //   console.log('✅ [DB] Puerto cambiado automáticamente a 6543');
              // }
            } catch {
              console.log('✅ [DB] Usando DIRECT_DATABASE_URL para desarrollo');
            }
          } else if (process.env.DATABASE_URL) {
            databaseUrl = process.env.DATABASE_URL;
            try {
              const url = new URL(databaseUrl);
              const port = url.port || '5432';
              console.log(`⚠️ [DB] Usando DATABASE_URL para desarrollo (puerto ${port})`);
              
              // DESHABILITADO: Cambio automático de puerto causa problemas de conectividad local
              // if (port === '5432') {
              //   console.log('🔧 [DB] Puerto 5432 no alcanzable, cambiando a 6543 (pooler)');
              //   const newUrl = databaseUrl.replace(':5432/', ':6543/');
              //   databaseUrl = newUrl;
              //   console.log('✅ [DB] Puerto cambiado automáticamente a 6543');
              // }
            } catch {
              console.log('⚠️ [DB] Usando DATABASE_URL para desarrollo (fallback)');
            }
          }
        }

      if (!databaseUrl) {
        throw new Error('DATABASE_URL o DIRECT_DATABASE_URL debe estar definido en las variables de entorno');
      }

      if (process.env.NODE_ENV !== 'production') {
        console.log(`🔗 [DB] Usando: ${databaseUrl.replace(/:[^:@]*@/, ':***@').substring(0, 80)}...`);
      }

      // Log para debugging
      if (process.env.NODE_ENV !== 'production') {
        const maskedUrl = databaseUrl.replace(/:[^:@]*@/, ':***@');
        const url = new URL(databaseUrl);
        console.log(`🔗 [DB] URL: ${maskedUrl.substring(0, 100)}...`);
        console.log(`🔗 [DB] Puerto: ${url.port || 'default'}`);
        console.log(`🔗 [DB] Usuario: ${url.username}`);
      }

      // Singleton pattern para evitar múltiples instancias en serverless
      const globalForPrisma = globalThis as unknown as {
        prisma: PrismaClient | undefined
      }

      // Reutilizar instancia existente o crear nueva
      if (globalForPrisma.prisma) {
        console.log('🔄 [DB] Reutilizando cliente Prisma existente (singleton)');
        return globalForPrisma.prisma;
      }

      console.log('🆕 [DB] Creando nueva instancia de cliente Prisma');

      // Crear cliente Prisma con configuración mejorada
      const client = new PrismaClient({
        datasources: {
          db: {
            url: databaseUrl,
          },
        },
        log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
        errorFormat: 'pretty',
        // @ts-ignore - __internal es una propiedad interna de Prisma no documentada públicamente
        __internal: {
          engine: {
            connectTimeout: 30000,
            poolTimeout: 30000,
          }
        }
      });

      // Configurar manejo de errores
      client.$on('query', (e: any) => {
        if (process.env.NODE_ENV === 'development') {
          console.log(`[DB-QUERY] ${e.query} - ${e.duration}ms`);
        }
      });

      client.$on('error', (e: any) => {
        console.error('[DB-ERROR]', e);
        if (e.message && e.message.includes('P6001')) {
          console.error('❌ [DB] ERROR P6001: Prisma Client espera URL de Data Proxy pero se proporcionó URL directa.');
          console.error('❌ [DB] SOLUCIÓN: Regenerar Prisma Client con: pnpm --filter @repo/db db:generate');
        }
        // Detectar errores de conexión y autenticación
        if (e.message && (
          e.message.includes("Can't reach database server") ||
          e.message.includes('ECONNREFUSED') ||
          e.message.includes('ETIMEDOUT')
        )) {
          console.error('❌ [DB] ERROR DE CONEXIÓN: No se puede alcanzar el servidor de base de datos');
          const currentUrl = new URL(databaseUrl);
          if (currentUrl.port === '6543') {
            console.error('💡 [DB] El puerto 6543 (pooler) no es alcanzable desde tu red local');
            console.error('💡 [DB] SOLUCIÓN: Usa DATABASE_URL con puerto 5432 (conexión directa)');
            console.error('💡 [DB] Obtén la URL correcta en Supabase Dashboard > Settings > Database > Connection string (Direct connection)');
          } else if (currentUrl.port === '5432') {
            console.error('💡 [DB] El puerto 5432 (conexión directa) no es alcanzable desde tu red local');
            console.error('💡 [DB] SOLUCIÓN: Verifica tu firewall o restricciones de red en Supabase');
            console.error('💡 [DB] O intenta usar DIRECT_DATABASE_URL con puerto 6543 si tu red lo permite');
          }
        } else if (e.message && (
          e.message.includes('Authentication failed') ||
          e.message.includes('SASL authentication failed') ||
          e.message.includes('password authentication failed')
        )) {
          console.error('❌ [DB] ERROR DE AUTENTICACIÓN: La contraseña de la base de datos es incorrecta.');
          console.error('💡 [DB] SOLUCIÓN: Verifica la contraseña en tu archivo .env para la URL que se está usando.');
          console.error('💡 [DB] Asegúrate de que la contraseña sea la del usuario "postgres" (no postgres.xxx)');
          console.error('💡 [DB] Puedes obtener la contraseña correcta en Supabase Dashboard > Settings > Database > Connection string');
        }
      });

      // Cachear la instancia tanto en desarrollo como en producción (singleton)
      // Si ya existe una instancia anterior, desconectarla
      const oldPrisma = globalForPrisma.prisma;
      if (oldPrisma) {
        oldPrisma.$disconnect().catch(() => {
          // Ignorar errores al desconectar
        });
      }
      globalForPrisma.prisma = client;
      console.log('✅ [DB] Cliente Prisma cacheado globalmente (singleton)');
      
      return client;
    } catch (e) {
      const error = e as Error;
      console.error('[DB] PrismaClient init error:', error.message || e);
      throw e;
    }
  })();

// Re-exportar tipos de Prisma usando require para evitar problemas de TypeScript
const prismaTypes = require('@prisma/client');

export type User = any;
export type Center = any;
export type Court = any;
export type Reservation = any;
export type Tournament = any;
export type TournamentUser = any;
export type Membership = any;
export type WaitingList = any;
export type MaintenanceSchedule = any;
export type PricingRule = any;

// Re-exportar enums usando require para evitar problemas de TypeScript
const { UserRole, ReservationStatus, MembershipType, MaintenanceType, MaintenanceStatus, TariffSegment, TariffEnrollmentStatus } = require('@prisma/client');
export { UserRole, ReservationStatus, MembershipType, MaintenanceType, MaintenanceStatus, TariffSegment, TariffEnrollmentStatus };

// Exportar el cliente de Prisma como instancia por defecto
export default db;