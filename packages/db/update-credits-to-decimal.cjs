#!/usr/bin/env node

// Script para cambiar créditos de Int a Decimal usando SQL directo
// Adaptado al sistema existente sin crear archivos .env

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

async function updateCreditsToDecimal() {
  const client = new Client(dbConfig);
  
  try {
    console.log('🔌 Conectando a la base de datos...');
    await client.connect();
    console.log('✅ Conectado exitosamente');
    
    // Verificar qué tablas existen
    console.log('🔍 Verificando tablas existentes...');
    
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name LIKE '%user%' OR table_name LIKE '%User%'
    `);
    
    console.log('📋 Tablas relacionadas con User:', tables.rows);
    
    // Verificar estructura actual
    console.log('🔍 Verificando estructura actual de créditos...');
    
    const userCredits = await client.query(`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'credits_balance'
    `);
    
    console.log('📊 Estructura actual de users.credits_balance:', userCredits.rows[0]);
    
    // Verificar si ya es DECIMAL
    if (userCredits.rows[0]?.data_type === 'numeric') {
      console.log('✅ Los créditos ya están en formato DECIMAL');
      return;
    }
    
    console.log('🔧 Cambiando créditos de INT a DECIMAL...');
    
    // Actualizar users.credits_balance
    await client.query(`
      ALTER TABLE users 
      ALTER COLUMN credits_balance TYPE DECIMAL USING credits_balance::DECIMAL
    `);
    console.log('✅ users.credits_balance actualizado a DECIMAL');
    
    // Verificar todas las tablas que necesitamos
    const allTables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    console.log('📋 Todas las tablas:', allTables.rows.map(r => r.table_name));
    
    // Actualizar WalletLedger.credits (verificar si existe)
    const walletLedgerExists = allTables.rows.some(t => t.table_name === 'wallet_ledger');
    if (walletLedgerExists) {
      await client.query(`
        ALTER TABLE wallet_ledger 
        ALTER COLUMN credits TYPE DECIMAL USING credits::DECIMAL
      `);
      console.log('✅ wallet_ledger.credits actualizado a DECIMAL');
      
      await client.query(`
        ALTER TABLE wallet_ledger 
        ALTER COLUMN balance_after TYPE DECIMAL USING balance_after::DECIMAL
      `);
      console.log('✅ wallet_ledger.balance_after actualizado a DECIMAL');
    } else {
      console.log('⚠️ Tabla wallet_ledger no encontrada');
    }
    
    // Actualizar Order.creditsUsed (verificar si existe)
    const orderExists = allTables.rows.some(t => t.table_name === 'orders');
    if (orderExists) {
      await client.query(`
        ALTER TABLE orders 
        ALTER COLUMN credits_used TYPE DECIMAL USING credits_used::DECIMAL
      `);
      console.log('✅ orders.credits_used actualizado a DECIMAL');
    } else {
      console.log('⚠️ Tabla orders no encontrada');
    }
    
    // Actualizar OrderItem.creditsPerUnit (verificar si existe)
    const orderItemExists = allTables.rows.some(t => t.table_name === 'order_items');
    if (orderItemExists) {
      await client.query(`
        ALTER TABLE order_items 
        ALTER COLUMN credits_per_unit TYPE DECIMAL USING credits_per_unit::DECIMAL
      `);
      console.log('✅ order_items.credits_per_unit actualizado a DECIMAL');
    } else {
      console.log('⚠️ Tabla order_items no encontrada');
    }
    
    console.log('🎉 ¡Migración completada exitosamente!');
    console.log('📋 Ahora el sistema puede manejar créditos decimales (1,5 créditos)');
    
  } catch (error) {
    console.error('❌ Error en la migración:', error.message);
    throw error;
  } finally {
    await client.end();
    console.log('🔌 Conexión cerrada');
  }
}

// Ejecutar migración
updateCreditsToDecimal()
  .then(() => {
    console.log('✅ Script completado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script falló:', error);
    process.exit(1);
  });
