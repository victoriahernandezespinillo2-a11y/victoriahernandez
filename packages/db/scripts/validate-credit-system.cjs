#!/usr/bin/env node

const { Client } = require('pg');

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

async function validateCreditSystem() {
  const client = new Client(dbConfig);
  
  try {
    console.log('🔌 Conectando a la base de datos para validación...');
    await client.connect();
    console.log('✅ Conectado exitosamente');
    
    console.log('\n🔍 VALIDACIÓN DEL SISTEMA DE CRÉDITOS');
    console.log('=====================================');
    
    // 1. Verificar estructura de tabla users
    console.log('\n📊 1. Verificando tabla users...');
    const usersColumns = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'credits_balance'
    `);
    
    if (usersColumns.rows.length > 0) {
      const col = usersColumns.rows[0];
      console.log(`   ✅ credits_balance: ${col.data_type}, nullable: ${col.is_nullable}, default: ${col.column_default}`);
    } else {
      console.log('   ❌ Columna credits_balance no encontrada en users');
    }
    
    // 2. Verificar estructura de tabla wallet_ledger
    console.log('\n📊 2. Verificando tabla wallet_ledger...');
    const ledgerColumns = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'wallet_ledger'
      ORDER BY ordinal_position
    `);
    
    console.log('   Columnas encontradas:');
    ledgerColumns.rows.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
    
    // 3. Verificar estructura de tabla reservations
    console.log('\n📊 3. Verificando tabla reservations...');
    const reservationColumns = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'reservations' 
      AND column_name IN ('payment_method', 'credits_used', 'credit_discount')
      ORDER BY column_name
    `);
    
    console.log('   Campos de créditos:');
    if (reservationColumns.rows.length === 0) {
      console.log('   ⚠️  No se encontraron campos de créditos en reservations');
    } else {
      reservationColumns.rows.forEach(col => {
        console.log(`   ✅ ${col.column_name}: ${col.data_type} (default: ${col.column_default})`);
      });
    }
    
    // 4. Verificar estructura de tabla orders
    console.log('\n📊 4. Verificando tabla orders...');
    const orderColumns = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'orders' 
      AND column_name IN ('credits_used', 'payment_method')
      ORDER BY column_name
    `);
    
    console.log('   Campos de créditos:');
    orderColumns.rows.forEach(col => {
      console.log(`   ✅ ${col.column_name}: ${col.data_type} (default: ${col.column_default})`);
    });
    
    // 5. Verificar nuevas tablas (si existen)
    console.log('\n📊 5. Verificando nuevas tablas...');
    
    const promotionsExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'promotions'
      )
    `);
    
    if (promotionsExists.rows[0].exists) {
      console.log('   ✅ Tabla promotions existe');
      
      const promotionCount = await client.query('SELECT COUNT(*) as count FROM promotions');
      console.log(`   - Registros: ${promotionCount.rows[0].count}`);
    } else {
      console.log('   ⚠️  Tabla promotions no existe (normal antes de migración)');
    }
    
    const paymentsExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'payments'
      )
    `);
    
    if (paymentsExists.rows[0].exists) {
      console.log('   ✅ Tabla payments existe');
      
      const paymentCount = await client.query('SELECT COUNT(*) as count FROM payments');
      console.log(`   - Registros: ${paymentCount.rows[0].count}`);
    } else {
      console.log('   ⚠️  Tabla payments no existe (normal antes de migración)');
    }
    
    // 6. Verificar datos de prueba
    console.log('\n📊 6. Verificando datos de prueba...');
    
    const userCount = await client.query('SELECT COUNT(*) as count FROM users');
    console.log(`   - Usuarios totales: ${userCount.rows[0].count}`);
    
    const usersWithCredits = await client.query(`
      SELECT COUNT(*) as count FROM users WHERE credits_balance > 0
    `);
    console.log(`   - Usuarios con créditos: ${usersWithCredits.rows[0].count}`);
    
    const ledgerCount = await client.query('SELECT COUNT(*) as count FROM wallet_ledger');
    console.log(`   - Transacciones en ledger: ${ledgerCount.rows[0].count}`);
    
    const orderCount = await client.query('SELECT COUNT(*) as count FROM orders');
    console.log(`   - Pedidos totales: ${orderCount.rows[0].count}`);
    
    const ordersWithCredits = await client.query(`
      SELECT COUNT(*) as count FROM orders WHERE credits_used > 0
    `);
    console.log(`   - Pedidos con créditos: ${ordersWithCredits.rows[0].count}`);
    
    // 7. Verificar índices
    console.log('\n📊 7. Verificando índices críticos...');
    
    const indexes = await client.query(`
      SELECT indexname, tablename, indexdef
      FROM pg_indexes 
      WHERE tablename IN ('wallet_ledger', 'orders', 'users')
      AND indexname LIKE '%credit%' OR indexname LIKE '%user%'
      ORDER BY tablename, indexname
    `);
    
    console.log('   Índices encontrados:');
    indexes.rows.forEach(idx => {
      console.log(`   ✅ ${idx.tablename}.${idx.indexname}`);
    });
    
    // 8. Resumen de validación
    console.log('\n📋 RESUMEN DE VALIDACIÓN');
    console.log('========================');
    
    const hasCreditsBalance = usersColumns.rows.length > 0;
    const hasWalletLedger = ledgerColumns.rows.length > 0;
    const hasOrders = orderColumns.rows.length > 0;
    
    if (hasCreditsBalance && hasWalletLedger && hasOrders) {
      console.log('✅ Sistema de créditos básico: FUNCIONAL');
    } else {
      console.log('❌ Sistema de créditos básico: PROBLEMAS DETECTADOS');
    }
    
    if (promotionsExists.rows[0].exists && paymentsExists.rows[0].exists) {
      console.log('✅ Extensiones de créditos: IMPLEMENTADAS');
    } else {
      console.log('⚠️  Extensiones de créditos: PENDIENTES (normal antes de migración)');
    }
    
    console.log('\n🎯 RECOMENDACIONES:');
    if (!hasCreditsBalance) {
      console.log('   - Verificar migración de credits_balance a Decimal');
    }
    if (!promotionsExists.rows[0].exists) {
      console.log('   - Ejecutar migración enhance_credit_system_v1 para agregar promociones');
    }
    
  } catch (error) {
    console.error('❌ Error durante la validación:', error);
  } finally {
    await client.end();
    console.log('\n🔌 Desconectado de la base de datos.');
  }
}

// Ejecutar validación
validateCreditSystem().catch(console.error);


