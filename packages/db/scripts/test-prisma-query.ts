/**
 * Script de prueba para verificar que Prisma Client funciona correctamente
 * Simula la consulta que falla en firebase-sync
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

async function testPrismaQuery() {
  console.log('🔍 Probando consulta de Prisma Client...\n');

  // Mostrar configuración
  const dbUrl = process.env.DATABASE_URL || process.env.DIRECT_DATABASE_URL || 'NO_CONFIGURADA';
  const dbUrlPreview = dbUrl.replace(/:[^:@]*@/, ':***@').substring(0, 100);
  console.log('📋 DATABASE_URL:', dbUrlPreview);
  console.log('📋 DIRECT_DATABASE_URL:', process.env.DIRECT_DATABASE_URL ? 'Configurada' : 'No configurada');
  console.log('📋 URL que usará Prisma:', (process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL)?.replace(/:[^:@]*@/, ':***@').substring(0, 100));
  console.log('');

  try {
    // Crear cliente de Prisma igual que en db/index.ts
    const databaseUrl = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL;
    
    if (!databaseUrl) {
      throw new Error('DATABASE_URL o DIRECT_DATABASE_URL debe estar definido');
    }

    const client = new PrismaClient({
      datasources: {
        db: {
          url: databaseUrl,
        },
      },
      log: ['error'],
    });

    console.log('✅ Prisma Client creado correctamente\n');

    // Test 1: Query simple (como en firebase-sync)
    console.log('🧪 Test 1: Consulta simple (SELECT 1)...');
    try {
      await client.$queryRaw`SELECT 1 as test`;
      console.log('✅ Consulta simple exitosa\n');
    } catch (error: any) {
      console.error('❌ Error en consulta simple:', error.message);
      if (error.code === 'P6001') {
        console.error('❌ ERROR P6001 DETECTADO: Prisma Client espera URL de Data Proxy');
      }
      await client.$disconnect();
      process.exit(1);
    }

    // Test 2: Buscar usuario por email (como en firebase-sync)
    console.log('🧪 Test 2: Buscar usuario por email (simulando firebase-sync)...');
    try {
      const testEmail = 'admin@polideportivooroquieta.com';
      const user = await client.user.findFirst({
        where: {
          OR: [
            { email: testEmail },
            { firebaseUid: 'test-uid' }
          ]
        }
      });
      console.log('✅ Consulta findFirst exitosa');
      if (user) {
        console.log(`   Usuario encontrado: ${user.email}`);
      } else {
        console.log('   Usuario no encontrado (esperado si no existe)');
      }
      console.log('');
    } catch (error: any) {
      console.error('❌ Error en findFirst:', error.message);
      if (error.code === 'P6001') {
        console.error('❌ ERROR P6001 DETECTADO: Prisma Client espera URL de Data Proxy');
      }
      console.error('   Detalles:', JSON.stringify({
        code: error.code,
        meta: error.meta,
        target: error.target
      }, null, 2));
      await client.$disconnect();
      process.exit(1);
    }

    // Test 3: Contar usuarios
    console.log('🧪 Test 3: Contar usuarios...');
    try {
      const count = await client.user.count();
      console.log(`✅ Conteo exitoso: ${count} usuarios\n`);
    } catch (error: any) {
      console.error('❌ Error en count:', error.message);
      await client.$disconnect();
      process.exit(1);
    }

    await client.$disconnect();
    console.log('✅ Todos los tests pasaron correctamente');
    console.log('✅ Prisma Client funciona correctamente en local');
    process.exit(0);

  } catch (error: any) {
    console.error('❌ Error fatal:', error.message);
    if (error.code === 'P6001') {
      console.error('\n❌ ERROR P6001 DETECTADO');
      console.error('   Prisma Client fue generado con configuración de Data Proxy');
      console.error('   pero la URL proporcionada es directa.');
      console.error('\n   SOLUCIÓN:');
      console.error('   1. Regenerar Prisma Client: pnpm --filter @repo/db run db:generate:safe');
      console.error('   2. O configurar DIRECT_DATABASE_URL en las variables de entorno');
    }
    process.exit(1);
  }
}

testPrismaQuery();



