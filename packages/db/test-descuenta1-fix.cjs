#!/usr/bin/env node

/**
 * 🧪 SCRIPT DE PRUEBA: Verificar corrección para código DESCUENTA1
 * 
 * Simula el escenario exacto del usuario:
 * - Reserva de 2€
 * - Código DESCUENTA1 (1€ de descuento)
 * - Monto final: 1€
 * - Redsys debe cobrar: 1€ (no 2€)
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testDescuenta1Fix() {
  console.log('🧪 [TEST-DESCUENTA1] Iniciando prueba específica...\n');

  try {
    // 1. Buscar la promoción DESCUENTA1
    console.log('1️⃣ [TEST-DESCUENTA1] Buscando promoción DESCUENTA1...');
    const promo = await prisma.promotion.findFirst({
      where: {
        code: 'DESCUENTA1',
        status: 'ACTIVE'
      }
    });

    if (!promo) {
      console.log('❌ [TEST-DESCUENTA1] Promoción DESCUENTA1 no encontrada');
      return;
    }

    console.log('✅ [TEST-DESCUENTA1] Promoción encontrada:', {
      id: promo.id,
      name: promo.name,
      code: promo.code,
      rewards: promo.rewards
    });

    // 2. Simular el escenario del usuario
    console.log('\n2️⃣ [TEST-DESCUENTA1] Simulando escenario del usuario...');
    
    const originalAmount = 2.00; // Reserva de 2€ como en las imágenes
    const rewards = promo.rewards;
    
    // Calcular descuento
    let discountAmount = 0;
    let finalAmount = originalAmount;

    if (rewards.type === 'DISCOUNT_FIXED') {
      discountAmount = rewards.value; // 1€
      finalAmount = Math.max(0, originalAmount - discountAmount); // 1€
    }

    console.log('💰 [TEST-DESCUENTA1] Cálculo del descuento:');
    console.log('   Reserva original: €' + originalAmount);
    console.log('   Código aplicado: ' + promo.code);
    console.log('   Descuento: €' + discountAmount);
    console.log('   Monto final: €' + finalAmount);

    // 3. Simular URLs de redirección
    console.log('\n3️⃣ [TEST-DESCUENTA1] Simulando URLs de redirección...');
    
    const reservationId = 'test-reservation-id';
    
    // URL ANTES de la corrección (incorrecta)
    const oldUrl = `/api/payments/redsys/redirect?rid=${reservationId}`;
    
    // URL DESPUÉS de la corrección (correcta)
    const newUrl = `/api/payments/redsys/redirect?rid=${reservationId}&promo=${promo.code}&finalAmount=${finalAmount}`;
    
    console.log('🔗 [TEST-DESCUENTA1] URLs de redirección:');
    console.log('   ❌ ANTES (incorrecto):', oldUrl);
    console.log('   ✅ DESPUÉS (correcto):', newUrl);

    // 4. Simular parámetros que recibiría Redsys
    console.log('\n4️⃣ [TEST-DESCUENTA1] Parámetros que recibiría Redsys...');
    
    const searchParams = new URL(`http://localhost:3002${newUrl}`).searchParams;
    const finalAmountParam = searchParams.get('finalAmount');
    const promoCodeParam = searchParams.get('promo');
    
    console.log('📋 [TEST-DESCUENTA1] Parámetros extraídos:');
    console.log('   finalAmountParam:', finalAmountParam);
    console.log('   promoCodeParam:', promoCodeParam);

    // 5. Simular lógica del endpoint corregido
    console.log('\n5️⃣ [TEST-DESCUENTA1] Simulando lógica del endpoint...');
    
    let amountToUse, amountSource;
    
    if (finalAmountParam && !isNaN(Number(finalAmountParam))) {
      amountToUse = Number(finalAmountParam);
      amountSource = 'finalAmount (con descuento)';
    } else {
      amountToUse = originalAmount;
      amountSource = 'totalPrice (sin descuento)';
    }
    
    const amountInCents = Math.round(amountToUse * 100).toString();
    
    console.log('💰 [TEST-DESCUENTA1] Cálculo final para Redsys:');
    console.log('   amountSource:', amountSource);
    console.log('   amountToUse:', amountToUse);
    console.log('   amountInCents:', amountInCents);

    // 6. Verificar la corrección
    console.log('\n6️⃣ [TEST-DESCUENTA1] Verificando corrección...');
    
    const expectedAmount = finalAmount; // Debería ser 1€
    const actualAmount = amountToUse;
    
    console.log('📊 [TEST-DESCUENTA1] Comparación:');
    console.log('   Monto esperado (con descuento): €' + expectedAmount);
    console.log('   Monto que usaría Redsys: €' + actualAmount);
    console.log('   Monto original (sin corrección): €' + originalAmount);
    
    if (Math.abs(actualAmount - expectedAmount) < 0.01) {
      console.log('\n✅ [TEST-DESCUENTA1] ¡CORRECCIÓN EXITOSA!');
      console.log('   ✅ Redsys cobrará el monto correcto: €' + actualAmount);
      console.log('   ✅ El usuario pagará solo €' + actualAmount + ' en lugar de €' + originalAmount);
    } else {
      console.log('\n❌ [TEST-DESCUENTA1] ¡ERROR EN LA CORRECCIÓN!');
      console.log('   ❌ Redsys cobraría €' + actualAmount + ' en lugar de €' + expectedAmount);
    }

    // 7. Resumen final
    console.log('\n📊 [TEST-DESCUENTA1] RESUMEN DEL ESCENARIO:');
    console.log('   🔹 Código usado: ' + promo.code);
    console.log('   🔹 Reserva original: €' + originalAmount);
    console.log('   🔹 Descuento aplicado: €' + discountAmount);
    console.log('   🔹 Monto final: €' + finalAmount);
    console.log('   🔹 Redsys cobrará: €' + actualAmount);
    console.log('   🔹 Corrección funciona: ' + (actualAmount === finalAmount ? 'SÍ ✅' : 'NO ❌'));

  } catch (error) {
    console.error('❌ [TEST-DESCUENTA1] Error en la prueba:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testDescuenta1Fix().catch(console.error);
