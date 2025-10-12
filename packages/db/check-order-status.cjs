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

async function checkOrderStatus(orderId) {
  const client = new Client(dbConfig);
  
  try {
    console.log('🔌 Conectando a la base de datos para verificar el pedido...');
    await client.connect();
    console.log('✅ Conectado exitosamente');
    
    console.log(`\n🔍 Verificando pedido con ID: ${orderId}`);
    console.log('==========================================');
    
    // 1. Obtener información del pedido
    const orderQuery = await client.query(`
      SELECT 
        id, status, payment_status, total_euro, credits_used, user_id, paid_at, payment_method
      FROM orders
      WHERE id = $1
    `, [orderId]);
    
    const order = orderQuery.rows[0];
    if (!order) {
      console.log('❌ Pedido no encontrado.');
      return;
    }
    console.log('📊 Datos del Pedido:');
    console.log(order);

    // 2. Obtener ítems del pedido para ver el precio y créditos por unidad
    const orderItemsQuery = await client.query(`
      SELECT 
        id, product_id, qty, unit_price_euro, credits_per_unit
      FROM order_items
      WHERE order_id = $1
    `, [orderId]);

    console.log('\n📦 Ítems del Pedido:');
    console.log(orderItemsQuery.rows);

    // 3. Obtener movimientos de la billetera relacionados con este pedido
    const walletLedgerQuery = await client.query(`
      SELECT 
        id, type, reason, credits, balance_after, created_at, metadata
      FROM wallet_ledger
      WHERE user_id = $1 AND metadata->>'orderId' = $2
      ORDER BY created_at DESC
    `, [order.user_id, orderId]);

    console.log('\n💰 Movimientos de Billetera relacionados:');
    console.log(walletLedgerQuery.rows);

    // 4. Obtener saldo actual del usuario
    const userCreditsQuery = await client.query(`
      SELECT credits_balance
      FROM users
      WHERE id = $1
    `, [order.user_id]);

    console.log('\n👤 Saldo actual del usuario:');
    console.log(userCreditsQuery.rows[0]);

    // 5. Análisis del problema
    console.log('\n🔍 ANÁLISIS DEL PROBLEMA:');
    console.log('========================');
    
    if (orderItemsQuery.rows.length > 0) {
      const item = orderItemsQuery.rows[0];
      const priceEuro = parseFloat(item.unit_price_euro);
      const creditsUsed = parseFloat(order.credits_used);
      const creditsPerUnit = parseFloat(item.credits_per_unit);
      
      console.log(`💶 Precio del producto: €${priceEuro}`);
      console.log(`🪙 Créditos usados en el pedido: ${creditsUsed}`);
      console.log(`🪙 Créditos por unidad: ${creditsPerUnit}`);
      console.log(`📊 Ratio esperado: €${priceEuro} = ${priceEuro} créditos`);
      
      if (creditsUsed > priceEuro) {
        console.log('❌ PROBLEMA DETECTADO: Se descontaron MÁS créditos de los que deberían');
        console.log(`   Esperado: ${priceEuro} créditos`);
        console.log(`   Real: ${creditsUsed} créditos`);
        console.log(`   Diferencia: +${creditsUsed - priceEuro} créditos`);
      } else if (creditsUsed === priceEuro) {
        console.log('✅ Los créditos coinciden con el precio');
      } else {
        console.log('⚠️ Se descontaron MENOS créditos de los esperados');
      }
    }

    // 6. Verificar si el pedido debería estar pagado
    if (walletLedgerQuery.rows.length > 0) {
      const debitMovement = walletLedgerQuery.rows.find(m => m.type === 'DEBIT');
      if (debitMovement) {
        console.log('\n💳 MOVIMIENTO DE PAGO DETECTADO:');
        console.log(`   Tipo: ${debitMovement.type}`);
        console.log(`   Créditos debitados: ${debitMovement.credits}`);
        console.log(`   Fecha: ${debitMovement.created_at}`);
        console.log(`   Razón: ${debitMovement.reason}`);
        
        if (debitMovement.reason === 'ORDER') {
          console.log('✅ El pago con créditos SÍ se procesó');
          console.log('❓ ¿Por qué el pedido sigue en estado PENDING?');
        }
      }
    }

  } catch (error) {
    console.error('❌ Error al verificar el pedido:', error);
  } finally {
    await client.end();
    console.log('🔌 Desconectado de la base de datos.');
  }
}

const orderId = process.argv[2];
if (!orderId) {
  console.error('Uso: node check-order-status.cjs <orderId>');
  process.exit(1);
}

checkOrderStatus(orderId);
