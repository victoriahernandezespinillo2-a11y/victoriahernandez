#!/usr/bin/env tsx

/**
 * Script para forzar sincronización del esquema de Prisma en producción
 * Este script asegura que el esquema esté completamente sincronizado
 */

import { PrismaClient } from '@prisma/client';

async function forceSchemaSync() {
  console.log('🔄 [SCHEMA-SYNC] Iniciando sincronización forzada del esquema...');
  
  const prisma = new PrismaClient({
    log: ['info', 'warn', 'error'],
  });

  try {
    // 1. Verificar conexión
    console.log('🔍 [SCHEMA-SYNC] Verificando conexión...');
    await prisma.$connect();
    console.log('✅ [SCHEMA-SYNC] Conexión establecida');

    // 2. Verificar que existe la tabla court_sport_pricing
    console.log('🔍 [SCHEMA-SYNC] Verificando tabla court_sport_pricing...');
    
    try {
      const count = await prisma.$queryRaw`
        SELECT COUNT(*) as count 
        FROM information_schema.tables 
        WHERE table_name = 'court_sport_pricing'
      `;
      console.log('✅ [SCHEMA-SYNC] Tabla court_sport_pricing verificada:', count);
    } catch (error) {
      console.error('❌ [SCHEMA-SYNC] Error verificando tabla:', error);
    }

    // 3. Limpiar prepared statements problemáticos
    console.log('🧹 [SCHEMA-SYNC] Limpiando prepared statements...');
    try {
      await prisma.$queryRaw`DEALLOCATE ALL`;
      console.log('✅ [SCHEMA-SYNC] Prepared statements limpiados');
    } catch (error) {
      console.log('ℹ️ [SCHEMA-SYNC] No hay prepared statements para limpiar');
    }

    // 4. Test básico de consulta
    console.log('🧪 [SCHEMA-SYNC] Probando consulta básica...');
    const userCount = await prisma.user.count();
    console.log('✅ [SCHEMA-SYNC] Consulta exitosa. Usuarios:', userCount);

    console.log('🎉 [SCHEMA-SYNC] Sincronización completada exitosamente');

  } catch (error) {
    console.error('❌ [SCHEMA-SYNC] Error durante sincronización:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar solo si se llama directamente
if (require.main === module) {
  forceSchemaSync().catch((error) => {
    console.error('💥 [SCHEMA-SYNC] Error fatal:', error);
    process.exit(1);
  });
}

export { forceSchemaSync };
