import { config } from 'dotenv';
import { resolve } from 'path';
import { createConnection } from 'net';
import { PrismaClient } from '@prisma/client';

// Cargar variables de entorno desde el archivo .env en la raíz del proyecto
config({ path: resolve(process.cwd(), '../../.env') });

console.log('🔍 [TEST] Iniciando diagnóstico de conexión a la base de datos...\n');

// 1. Verificar variables de entorno
console.log('📋 [TEST] Variables de entorno:');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'DEFINIDA' : 'NO DEFINIDA');
console.log('DIRECT_DATABASE_URL:', process.env.DIRECT_DATABASE_URL ? 'DEFINIDA' : 'NO DEFINIDA');

if (process.env.DATABASE_URL) {
  try {
    const url = new URL(process.env.DATABASE_URL);
    console.log(`DATABASE_URL - Host: ${url.hostname}, Puerto: ${url.port || 'default'}, Usuario: ${url.username}`);
  } catch (e) {
    console.log('DATABASE_URL - Error al parsear URL:', e);
  }
}

if (process.env.DIRECT_DATABASE_URL) {
  try {
    const url = new URL(process.env.DIRECT_DATABASE_URL);
    console.log(`DIRECT_DATABASE_URL - Host: ${url.hostname}, Puerto: ${url.port || 'default'}, Usuario: ${url.username}`);
    console.log(`DIRECT_DATABASE_URL - Contraseña definida: ${url.password ? 'SÍ' : 'NO'}`);
    console.log(`DIRECT_DATABASE_URL - Parámetros: ${url.search}`);
  } catch (e) {
    console.log('DIRECT_DATABASE_URL - Error al parsear URL:', e);
  }
}

console.log('\n');

// 2. Test de conectividad TCP
async function testTcpConnection(host: string, port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = createConnection({ host, port, timeout: 5000 });
    
    socket.on('connect', () => {
      console.log(`✅ [TCP] Conexión exitosa a ${host}:${port}`);
      socket.destroy();
      resolve(true);
    });
    
    socket.on('error', (err) => {
      console.log(`❌ [TCP] Error conectando a ${host}:${port}:`, err.message);
      resolve(false);
    });
    
    socket.on('timeout', () => {
      console.log(`⏰ [TCP] Timeout conectando a ${host}:${port}`);
      socket.destroy();
      resolve(false);
    });
  });
}

// 3. Test de Prisma Client
async function testPrismaConnection(url: string, name: string): Promise<boolean> {
  try {
    console.log(`🔗 [PRISMA] Probando conexión ${name}...`);
    
    const prisma = new PrismaClient({
      datasources: { db: { url } },
      log: ['error']
    });
    
    await prisma.$connect();
    console.log(`✅ [PRISMA] Conexión ${name} exitosa`);
    await prisma.$disconnect();
    return true;
  } catch (error) {
    console.log(`❌ [PRISMA] Error en conexión ${name}:`, error);
    return false;
  }
}

async function runTests() {
  // Test TCP para ambas URLs
  if (process.env.DATABASE_URL) {
    try {
      const url = new URL(process.env.DATABASE_URL);
      const port = parseInt(url.port) || 5432;
      await testTcpConnection(url.hostname, port);
    } catch (e) {
      console.log('❌ [TCP] Error parseando DATABASE_URL');
    }
  }
  
  if (process.env.DIRECT_DATABASE_URL) {
    try {
      const url = new URL(process.env.DIRECT_DATABASE_URL);
      const port = parseInt(url.port) || 6543;
      await testTcpConnection(url.hostname, port);
    } catch (e) {
      console.log('❌ [TCP] Error parseando DIRECT_DATABASE_URL');
    }
  }
  
  console.log('\n');
  
  // Test Prisma para ambas URLs
  if (process.env.DATABASE_URL) {
    await testPrismaConnection(process.env.DATABASE_URL, 'DATABASE_URL');
  }
  
  if (process.env.DIRECT_DATABASE_URL) {
    await testPrismaConnection(process.env.DIRECT_DATABASE_URL, 'DIRECT_DATABASE_URL');
  }
  
  console.log('\n🏁 [TEST] Diagnóstico completado');
}

runTests().catch(console.error);
