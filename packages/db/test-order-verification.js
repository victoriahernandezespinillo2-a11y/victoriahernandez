/**
 * Script para probar la verificación de pedidos directamente
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testOrderVerification() {
  try {
    console.log('🔍 Probando verificación de pedido...\n');
    
    // 1. Obtener el pedido específico
    const orderId = 'cmfrjgp940001ia049xx5d2h8';
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: true
          }
        },
        user: true
      }
    });
    
    if (!order) {
      console.log('❌ Pedido no encontrado');
      return;
    }
    
    console.log('📦 PEDIDO ENCONTRADO:');
    console.log(`   - ID: ${order.id}`);
    console.log(`   - Usuario: ${order.user.name} (${order.user.email})`);
    console.log(`   - Estado: ${order.status}`);
    console.log(`   - Fecha: ${order.createdAt.toISOString()}`);
    console.log(`   - Método de pago: ${order.paymentMethod}`);
    console.log(`   - Créditos usados: ${order.creditsUsed}`);
    
    // 2. Verificar productos que requieren check-in
    const itemsRequiringCheckIn = order.items.filter(item => 
      item.product.requiresCheckIn === true
    );
    
    console.log('\n🛒 PRODUCTOS QUE REQUIEREN CHECK-IN:');
    itemsRequiringCheckIn.forEach(item => {
      console.log(`   - ${item.product.name} (${item.product.type}, ${item.product.category})`);
      console.log(`     requiresCheckIn: ${item.product.requiresCheckIn}`);
    });
    
    // 3. Verificar si el pedido puede ser verificado
    const canCheckIn = order.status === 'PAID' && itemsRequiringCheckIn.length > 0;
    const alreadyRedeemed = order.status === 'REDEEMED';
    
    console.log('\n✅ VALIDACIONES:');
    console.log(`   - Estado es PAID: ${order.status === 'PAID'}`);
    console.log(`   - Tiene productos que requieren check-in: ${itemsRequiringCheckIn.length > 0}`);
    console.log(`   - Puede hacer check-in: ${canCheckIn}`);
    console.log(`   - Ya fue canjeado: ${alreadyRedeemed}`);
    
    // 4. Simular la respuesta de la API
    const apiResponse = {
      ok: canCheckIn && !alreadyRedeemed,
      order: {
        id: order.id,
        status: order.status,
        user: { id: order.userId, name: order.user?.name, email: order.user?.email },
        items: order.items.map(item => ({ 
          name: item.product?.name || 'Producto', 
          qty: item.qty,
          type: item.product?.type,
          requiresCheckIn: item.product?.requiresCheckIn
        })),
        itemsRequiringCheckIn: itemsRequiringCheckIn.map(item => ({
          name: item.product?.name,
          quantity: item.qty,
          type: item.product?.type
        })),
        canCheckIn,
        alreadyRedeemed,
        createdAt: order.createdAt,
      },
    };
    
    console.log('\n📋 RESPUESTA DE LA API:');
    console.log(JSON.stringify(apiResponse, null, 2));
    
    if (apiResponse.ok) {
      console.log('\n✅ EL PEDIDO SE PUEDE ESCANEAR CORRECTAMENTE');
      console.log('\n💡 DIAGNÓSTICO:');
      console.log('   - El pedido está en estado PAID');
      console.log('   - Tiene productos que requieren check-in');
      console.log('   - No ha sido canjeado');
      console.log('   - El problema debe estar en el JWT_SECRET o en la generación del token');
    } else {
      console.log('\n❌ EL PEDIDO NO SE PUEDE ESCANEAR');
      if (!canCheckIn) {
        console.log('   - Razón: No puede hacer check-in');
      }
      if (alreadyRedeemed) {
        console.log('   - Razón: Ya fue canjeado');
      }
    }
    
    // 5. Verificar configuración JWT
    console.log('\n🔐 CONFIGURACIÓN JWT:');
    console.log(`   - JWT_SECRET configurado: ${process.env.JWT_SECRET ? 'SÍ' : 'NO'}`);
    if (process.env.JWT_SECRET) {
      console.log(`   - Longitud: ${process.env.JWT_SECRET.length} caracteres`);
    } else {
      console.log('   - ⚠️ JWT_SECRET no está configurado en el entorno');
    }
    
  } catch (error) {
    console.error('❌ Error en test:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

testOrderVerification()
  .then(() => {
    console.log('\n✅ Test completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error en test:', error);
    process.exit(1);
  });
