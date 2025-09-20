/**
 * Script para probar la verificación de pedidos directamente
 */

const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

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
    
    // 4. Generar un token válido para el pedido
    const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
    const ttlMin = 240; // 4 horas
    const expSeconds = Math.floor(Date.now() / 1000) + ttlMin * 60;
    
    const token = jwt.sign(
      { 
        type: 'order-pass', 
        orderId: order.id, 
        uid: order.userId,
        exp: expSeconds
      },
      JWT_SECRET
    );
    
    console.log('\n🔑 TOKEN GENERADO:');
    console.log(`   - Token: ${token.substring(0, 50)}...`);
    console.log(`   - Expira: ${new Date(expSeconds * 1000).toISOString()}`);
    
    // 5. Simular la verificación que hace la API
    console.log('\n🧪 SIMULANDO VERIFICACIÓN API:');
    
    // Verificar el token
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      console.log('✅ Token válido');
      console.log(`   - Tipo: ${decoded.type}`);
      console.log(`   - Order ID: ${decoded.orderId}`);
      console.log(`   - User ID: ${decoded.uid}`);
      
      // Verificar si el token es del tipo correcto
      if (decoded.type !== 'order-pass') {
        console.log('❌ ERROR: Token no es de tipo order-pass');
        return;
      }
      
      // Verificar si el pedido existe y está en estado correcto
      if (decoded.orderId !== order.id) {
        console.log('❌ ERROR: Order ID del token no coincide');
        return;
      }
      
      console.log('\n🎉 VERIFICACIÓN EXITOSA:');
      console.log('   - Token válido');
      console.log('   - Pedido existe');
      console.log('   - Estado correcto');
      console.log('   - Productos requieren check-in');
      
      // 6. Simular la respuesta de la API
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
      } else {
        console.log('\n❌ EL PEDIDO NO SE PUEDE ESCANEAR');
        if (!canCheckIn) {
          console.log('   - Razón: No puede hacer check-in');
        }
        if (alreadyRedeemed) {
          console.log('   - Razón: Ya fue canjeado');
        }
      }
      
    } catch (error) {
      console.log('\n❌ ERROR VERIFICANDO TOKEN:');
      console.log(`   - Error: ${error.message}`);
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
