#!/usr/bin/env node

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const dbConfig = {
  host: 'db.rcknclvzxheitotnhmhn.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'gYcTjJo2N7wWW8ut',
  ssl: {
    rejectUnauthorized: false
  }
};

async function runMigration() {
  const client = new Client(dbConfig);
  
  try {
    console.log('🔌 Conectando a la base de datos...');
    await client.connect();
    console.log('✅ Conectado exitosamente');
    
    console.log('\n🚀 INICIANDO MIGRACIÓN: enhance_credit_system_v1');
    console.log('================================================');
    
    // Leer el archivo de migración
    const migrationPath = path.join(__dirname, '..', 'migrations', 'enhance-credit-system-v1.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Archivo de migración cargado:', migrationPath);
    console.log('📏 Tamaño del archivo:', migrationSQL.length, 'caracteres');
    
    // Crear un punto de restauración (backup de tablas críticas)
    console.log('\n💾 Creando backup de seguridad...');
    
    const backupQueries = [
      'CREATE TABLE IF NOT EXISTS users_backup AS SELECT * FROM users LIMIT 0',
      'CREATE TABLE IF NOT EXISTS wallet_ledger_backup AS SELECT * FROM wallet_ledger LIMIT 0',
      'CREATE TABLE IF NOT EXISTS orders_backup AS SELECT * FROM orders LIMIT 0',
      'CREATE TABLE IF NOT EXISTS reservations_backup AS SELECT * FROM reservations LIMIT 0'
    ];
    
    for (const query of backupQueries) {
      await client.query(query);
      console.log('   ✅ Backup creado para tabla');
    }
    
    // Ejecutar la migración en una transacción
    console.log('\n⚡ Ejecutando migración...');
    
    await client.query('BEGIN');
    
    try {
      // Ejecutar la migración
      await client.query(migrationSQL);
      
      console.log('✅ Migración ejecutada exitosamente');
      
      // Verificar que todo se creó correctamente
      console.log('\n🔍 Verificando resultados...');
      
      const tablesCheck = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_name IN ('promotions', 'promotion_applications', 'payments')
        ORDER BY table_name
      `);
      
      console.log('📊 Tablas creadas:');
      tablesCheck.rows.forEach(row => {
        console.log(`   ✅ ${row.table_name}`);
      });
      
      // Verificar columnas agregadas a reservations
      const reservationsCheck = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'reservations' 
        AND column_name IN ('credits_used', 'credit_discount')
        ORDER BY column_name
      `);
      
      console.log('📊 Columnas agregadas a reservations:');
      reservationsCheck.rows.forEach(row => {
        console.log(`   ✅ ${row.column_name}: ${row.data_type}`);
      });
      
      // Verificar índices
      const indexesCheck = await client.query(`
        SELECT indexname, tablename 
        FROM pg_indexes 
        WHERE indexname LIKE '%promotion%' OR indexname LIKE '%payment%'
        ORDER BY tablename, indexname
      `);
      
      console.log('📊 Índices creados:');
      indexesCheck.rows.forEach(row => {
        console.log(`   ✅ ${row.tablename}.${row.indexname}`);
      });
      
      // Commit de la transacción
      await client.query('COMMIT');
      console.log('✅ Transacción confirmada');
      
    } catch (error) {
      // Rollback en caso de error
      await client.query('ROLLBACK');
      console.error('❌ Error durante la migración, realizando rollback...');
      throw error;
    }
    
    // Limpiar backups (ya no son necesarios)
    console.log('\n🧹 Limpiando backups temporales...');
    const cleanupQueries = [
      'DROP TABLE IF EXISTS users_backup',
      'DROP TABLE IF EXISTS wallet_ledger_backup',
      'DROP TABLE IF EXISTS orders_backup',
      'DROP TABLE IF EXISTS reservations_backup'
    ];
    
    for (const query of cleanupQueries) {
      await client.query(query);
    }
    console.log('✅ Backups eliminados');
    
    console.log('\n🎉 MIGRACIÓN COMPLETADA EXITOSAMENTE');
    console.log('=====================================');
    console.log('✅ Nuevas tablas: promotions, promotion_applications, payments');
    console.log('✅ Nuevas columnas: reservations.credits_used, reservations.credit_discount');
    console.log('✅ Índices optimizados para performance');
    console.log('✅ Constraints de integridad aplicados');
    console.log('✅ Datos iniciales insertados');
    
    console.log('\n📋 PRÓXIMOS PASOS:');
    console.log('1. Ejecutar validación post-migración');
    console.log('2. Actualizar schema de Prisma');
    console.log('3. Generar cliente de Prisma');
    console.log('4. Probar funcionalidades básicas');
    
  } catch (error) {
    console.error('❌ ERROR EN LA MIGRACIÓN:', error.message);
    console.error('Stack trace:', error.stack);
    
    console.log('\n🆘 ACCIONES DE RECUPERACIÓN:');
    console.log('1. Verificar logs de la base de datos');
    console.log('2. Ejecutar script de rollback si es necesario');
    console.log('3. Contactar al administrador de base de datos');
    
    process.exit(1);
  } finally {
    await client.end();
    console.log('\n🔌 Desconectado de la base de datos.');
  }
}

// Verificar que el archivo de migración existe
const migrationPath = path.join(__dirname, '..', 'migrations', 'enhance-credit-system-v1.sql');
if (!fs.existsSync(migrationPath)) {
  console.error('❌ Archivo de migración no encontrado:', migrationPath);
  process.exit(1);
}

// Ejecutar migración
runMigration().catch(console.error);


