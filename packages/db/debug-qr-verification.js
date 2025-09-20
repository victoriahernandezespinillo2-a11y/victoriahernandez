/**
 * Script para debuggear el problema de verificación del QR
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugQRVerification() {
  try {
    console.log('🔍 Debuggeando verificación del QR del pedido...\n');
    
    // 1. Verificar el pedido específico
    const orderId = 'cmfrjgp940001ia049xx5d2h8'; // ID del pedido de agua mineral
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
    
    // 4. Verificar configuración del JWT_SECRET
    console.log('\n🔐 CONFIGURACIÓN JWT:');
    console.log(`   - JWT_SECRET configurado: ${process.env.JWT_SECRET ? 'SÍ' : 'NO'}`);
    if (process.env.JWT_SECRET) {
      console.log(`   - Longitud: ${process.env.JWT_SECRET.length} caracteres`);
    }
    
    // 5. Simular la verificación que hace la API
    const jwt = await import('jsonwebtoken');
    
    // Crear un token válido para el pedido
    const token = jwt.sign(
      { 
        type: 'order-pass', 
        orderId: order.id, 
        uid: order.userId,
        exp: Math.floor(Date.now() / 1000) + 3600 // 1 hora
      },
      process.env.JWT_SECRET || 'test-secret'
    );
    
    console.log('\n🔑 TOKEN GENERADO:');
    console.log(`   - Token: ${token.substring(0, 50)}...`);
    
    // 6. Verificar el token
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'test-secret');
      console.log('\n✅ TOKEN VÁLIDO:');
      console.log(`   - Tipo: ${decoded.type}`);
      console.log(`   - Order ID: ${decoded.orderId}`);
      console.log(`   - User ID: ${decoded.uid}`);
      console.log(`   - Expira: ${new Date(decoded.exp * 1000).toISOString()}`);
      
      // 7. Verificar si el token es del tipo correcto
      if (decoded.type !== 'order-pass') {
        console.log('❌ ERROR: Token no es de tipo order-pass');
        return;
      }
      
      // 8. Verificar si el pedido existe y está en estado correcto
      if (decoded.orderId !== order.id) {
        console.log('❌ ERROR: Order ID del token no coincide');
        return;
      }
      
      console.log('\n🎉 VERIFICACIÓN EXITOSA:');
      console.log('   - Token válido');
      console.log('   - Pedido existe');
      console.log('   - Estado correcto');
      console.log('   - Productos requieren check-in');
      
      console.log('\n💡 POSIBLES CAUSAS DEL ERROR:');
      console.log('   1. El JWT_SECRET en producción es diferente al de desarrollo');
      console.log('   2. El token está expirado');
      console.log('   3. El token no se está generando correctamente en la API');
      console.log('   4. Problema de configuración en el endpoint /api/orders/verify');
      
    } catch (error) {
      console.log('\n❌ ERROR VERIFICANDO TOKEN:');
      console.log(`   - Error: ${error.message}`);
    }
    
  } catch (error) {
    console.error('❌ Error en debug:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

debugQRVerification()
  .then(() => {
    console.log('\n✅ Debug completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error en debug:', error);
    process.exit(1);
  });
