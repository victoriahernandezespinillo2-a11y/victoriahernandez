/**
 * Script de diagnóstico para verificar conexión a Supabase y autenticación
 * Uso: pnpm --filter @repo/db exec tsx scripts/diagnose-db.ts
 */

import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

// Obtener __dirname equivalente para ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar variables de entorno
const envPath = path.join(__dirname, '../../.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config({ path: path.join(__dirname, '../../../.env') });
}

interface DiagnosticResult {
  test: string;
  status: 'success' | 'error' | 'warning';
  message: string;
  details?: any;
  duration?: number;
}

const results: DiagnosticResult[] = [];

function addResult(test: string, status: 'success' | 'error' | 'warning', message: string, details?: any, duration?: number) {
  results.push({ test, status, message, details, duration });
  const icon = status === 'success' ? '✅' : status === 'error' ? '❌' : '⚠️';
  console.log(`${icon} [${test}] ${message}${duration ? ` (${duration}ms)` : ''}`);
  if (details) {
    console.log(`   Detalles:`, JSON.stringify(details, null, 2));
  }
}

async function testDatabaseConnection() {
  const startTime = Date.now();
  try {
    const db = new PrismaClient({
      log: ['error'],
    });

    // Test 1: Query simple
    try {
      await db.$queryRaw`SELECT 1 as test`;
      const duration = Date.now() - startTime;
      addResult('DB_CONNECTION', 'success', 'Conexión a base de datos exitosa', null, duration);
    } catch (error: any) {
      const duration = Date.now() - startTime;
      addResult('DB_CONNECTION', 'error', 'Error de conexión a base de datos', {
        message: error.message,
        code: error.code,
        meta: error.meta
      }, duration);
      await db.$disconnect();
      return;
    }

    // Test 2: Verificar tabla de usuarios
    try {
      const userCount = await db.user.count();
      addResult('DB_TABLES', 'success', `Tabla 'users' accesible`, { userCount });
    } catch (error: any) {
      addResult('DB_TABLES', 'error', 'Error accediendo a tabla users', {
        message: error.message,
        code: error.code
      });
    }

    // Test 3: Verificar autenticación - buscar usuario admin
    try {
      const adminUser = await db.user.findFirst({
        where: { role: 'ADMIN' },
        select: { id: true, email: true, role: true, isActive: true }
      });
      if (adminUser) {
        addResult('DB_AUTH_CHECK', 'success', 'Usuario admin encontrado', {
          email: adminUser.email,
          isActive: adminUser.isActive
        });
      } else {
        addResult('DB_AUTH_CHECK', 'warning', 'No se encontró usuario admin', null);
      }
    } catch (error: any) {
      addResult('DB_AUTH_CHECK', 'error', 'Error verificando usuarios', {
        message: error.message
      });
    }

    // Test 4: Verificar configuración de DATABASE_URL
    const dbUrl = process.env.DATABASE_URL || process.env.DIRECT_DATABASE_URL;
    if (!dbUrl) {
      addResult('DB_CONFIG', 'error', 'DATABASE_URL no configurada', null);
    } else {
      const isSupabase = dbUrl.includes('supabase.co');
      const hasSSL = dbUrl.includes('sslmode=require') || dbUrl.includes('sslmode=prefer');
      addResult('DB_CONFIG', 'success', 'DATABASE_URL configurada', {
        provider: isSupabase ? 'Supabase' : 'Otro',
        hasSSL,
        urlPreview: dbUrl.replace(/:[^:@]*@/, ':***@').substring(0, 100) + '...'
      });
    }

    await db.$disconnect();
  } catch (error: any) {
    const duration = Date.now() - startTime;
    addResult('DB_CONNECTION', 'error', 'Error fatal de conexión', {
      message: error.message,
      stack: error.stack
    }, duration);
  }
}

async function testSupabaseStatus() {
  try {
    const dbUrl = process.env.DATABASE_URL || process.env.DIRECT_DATABASE_URL;
    if (!dbUrl || !dbUrl.includes('supabase.co')) {
      addResult('SUPABASE_STATUS', 'warning', 'No se detectó conexión a Supabase', null);
      return;
    }

    // Extraer información de la URL de Supabase
    const urlMatch = dbUrl.match(/@([^:]+):(\d+)\/(.+)/);
    if (urlMatch) {
      const host = urlMatch[1];
      const port = urlMatch[2];
      
      addResult('SUPABASE_STATUS', 'success', 'Conexión a Supabase detectada', {
        host,
        port,
        ssl: dbUrl.includes('sslmode=require') ? 'Requerido' : 'No requerido'
      });
    }
  } catch (error: any) {
    addResult('SUPABASE_STATUS', 'error', 'Error verificando Supabase', {
      message: error.message
    });
  }
}

async function testEnvironmentVariables() {
  const requiredVars = [
    'DATABASE_URL',
    'NEXTAUTH_SECRET',
    'NEXTAUTH_URL'
  ];

  const optionalVars = [
    'DIRECT_DATABASE_URL',
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_KEY'
  ];

  const missing: string[] = [];
  const present: string[] = [];

  requiredVars.forEach(varName => {
    if (process.env[varName]) {
      present.push(varName);
    } else {
      missing.push(varName);
    }
  });

  if (missing.length > 0) {
    addResult('ENV_VARS', 'error', 'Variables de entorno faltantes', { missing });
  } else {
    addResult('ENV_VARS', 'success', 'Variables de entorno requeridas presentes', { present });
  }

  const optionalPresent = optionalVars.filter(v => process.env[v]);
  if (optionalPresent.length > 0) {
    addResult('ENV_VARS_OPTIONAL', 'success', 'Variables opcionales presentes', { optionalPresent });
  }
}

async function main() {
  console.log('🔍 Iniciando diagnóstico de base de datos y autenticación...\n');
  console.log('='.repeat(60));
  
  await testEnvironmentVariables();
  console.log('');
  
  await testSupabaseStatus();
  console.log('');
  
  await testDatabaseConnection();
  console.log('');
  
  console.log('='.repeat(60));
  console.log('\n📊 Resumen del diagnóstico:\n');
  
  const successCount = results.filter(r => r.status === 'success').length;
  const errorCount = results.filter(r => r.status === 'error').length;
  const warningCount = results.filter(r => r.status === 'warning').length;
  
  console.log(`✅ Exitosos: ${successCount}`);
  console.log(`❌ Errores: ${errorCount}`);
  console.log(`⚠️  Advertencias: ${warningCount}`);
  
  if (errorCount > 0) {
    console.log('\n❌ Se encontraron errores críticos. Revisa los detalles arriba.');
    process.exit(1);
  } else if (warningCount > 0) {
    console.log('\n⚠️  Se encontraron advertencias. Revisa los detalles arriba.');
    process.exit(0);
  } else {
    console.log('\n✅ Todos los tests pasaron correctamente.');
    process.exit(0);
  }
}

main().catch(error => {
  console.error('❌ Error fatal en diagnóstico:', error);
  process.exit(1);
});

