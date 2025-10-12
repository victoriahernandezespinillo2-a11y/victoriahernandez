#!/usr/bin/env node

// Script para cambiar créditos de Int a Decimal usando SQL directo
// Adaptado al sistema existente sin crear archivos .env

const { Client } = require('pg');

const dbConfig = {
  connectionString: 'postgresql://postgres:gYcTjJo2N7wWW8ut@db.rcknclvzxheitotnhmhn.supabase.co:5432/postgres?sslmode=require'
};

async function updateCreditsToDecimal() {
  const client = new Client(dbConfig);
  
  try {
    console.log('🔌 Conectando a la base de datos...');
    await client.connect();
    console.log('✅ Conectado exitosamente');
    
    // Verificar estructura actual
    console.log('🔍 Verificando estructura actual de créditos...');
    
    const userCredits = await client.query(`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'User' AND column_name = 'credits_balance'
    `);
    
    console.log('📊 Estructura actual de User.credits_balance:', userCredits.rows[0]);
    
    // Verificar si ya es DECIMAL
    if (userCredits.rows[0]?.data_type === 'numeric') {
      console.log('✅ Los créditos ya están en formato DECIMAL');
      return;
    }
    
    console.log('🔧 Cambiando créditos de INT a DECIMAL...');
    
    // Actualizar User.credits_balance
    await client.query(`
      ALTER TABLE "User" 
      ALTER COLUMN credits_balance TYPE DECIMAL USING credits_balance::DECIMAL
    `);
    console.log('✅ User.credits_balance actualizado a DECIMAL');
    
    // Actualizar WalletLedger.credits
    await client.query(`
      ALTER TABLE "WalletLedger" 
      ALTER COLUMN credits TYPE DECIMAL USING credits::DECIMAL
    `);
    console.log('✅ WalletLedger.credits actualizado a DECIMAL');
    
    // Actualizar WalletLedger.balanceAfter
    await client.query(`
      ALTER TABLE "WalletLedger" 
      ALTER COLUMN balance_after TYPE DECIMAL USING balance_after::DECIMAL
    `);
    console.log('✅ WalletLedger.balance_after actualizado a DECIMAL');
    
    // Actualizar Order.creditsUsed
    await client.query(`
      ALTER TABLE "Order" 
      ALTER COLUMN credits_used TYPE DECIMAL USING credits_used::DECIMAL
    `);
    console.log('✅ Order.credits_used actualizado a DECIMAL');
    
    // Actualizar OrderItem.creditsPerUnit
    await client.query(`
      ALTER TABLE "OrderItem" 
      ALTER COLUMN credits_per_unit TYPE DECIMAL USING credits_per_unit::DECIMAL
    `);
    console.log('✅ OrderItem.credits_per_unit actualizado a DECIMAL');
    
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


