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

async function verifyChanges() {
  const client = new Client(dbConfig);
  
  try {
    console.log('🔌 Conectando para verificar cambios...');
    await client.connect();
    
    console.log('\n📊 VERIFICANDO CAMBIOS EN BASE DE DATOS:');
    console.log('==========================================');
    
    // Verificar users.credits_balance
    const userCredits = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'credits_balance'
    `);
    console.log('✅ users.credits_balance:', userCredits.rows[0]?.data_type);
    
    // Verificar wallet_ledger
    const walletCredits = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'wallet_ledger' AND column_name IN ('credits', 'balance_after')
    `);
    console.log('✅ wallet_ledger:', walletCredits.rows.map(r => `${r.column_name}: ${r.data_type}`));
    
    // Verificar orders
    const orderCredits = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'orders' AND column_name = 'credits_used'
    `);
    console.log('✅ orders.credits_used:', orderCredits.rows[0]?.data_type);
    
    // Verificar order_items
    const orderItemCredits = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'order_items' AND column_name = 'credits_per_unit'
    `);
    console.log('✅ order_items.credits_per_unit:', orderItemCredits.rows[0]?.data_type);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

verifyChanges();


