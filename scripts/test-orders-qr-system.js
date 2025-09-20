/**
 * Script de prueba para verificar el sistema completo de QR para pedidos
 * Prueba todo el flujo: generación → verificación → check-in
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const API_BASE_URL = 'http://localhost:3002';

class OrdersQRSystemTester {
  constructor() {
    this.results = [];
    this.testOrder = null;
    this.testToken = null;
  }

  async test(name, testFn) {
    console.log(`\n🧪 Probando: ${name}`);
    try {
      const result = await testFn();
      this.results.push({ name, status: '✅ PASS', result });
      console.log(`✅ ${name}: PASS`);
      return result;
    } catch (error) {
      this.results.push({ name, status: '❌ FAIL', error: error.message });
      console.log(`❌ ${name}: FAIL - ${error.message}`);
      throw error;
    }
  }

  async setupTestData() {
    return await this.test('Configurar datos de prueba', async () => {
      // Buscar un centro existente
      const center = await prisma.center.findFirst();
      if (!center) {
        throw new Error('No hay centros disponibles para la prueba');
      }

      // Buscar un usuario existente
      const user = await prisma.user.findFirst({
        where: { role: 'USER' }
      });
      if (!user) {
        throw new Error('No hay usuarios disponibles para la prueba');
      }

      // Crear un producto que requiera check-in
      const product = await prisma.product.create({
        data: {
          centerId: center.id,
          name: 'Agua Mineral - Test',
          sku: 'AGUA-TEST-' + Date.now(),
          category: 'bebidas',
          type: 'PHYSICAL',
          priceEuro: 1.00,
          requiresCheckIn: true, // ← CLAVE: Este producto requiere check-in
          isActive: true
        }
      });

      // Crear un pedido pagado con el producto
      const order = await prisma.order.create({
        data: {
          userId: user.id,
          status: 'PAID',
          totalEuro: 1.00,
          paymentMethod: 'CREDITS',
          creditsUsed: 1,
          items: {
            create: {
              productId: product.id,
              qty: 1,
              unitPriceEuro: 1.00,
              taxRate: 0.0,
              creditsPerUnit: 1
            }
          }
        },
        include: {
          items: {
            include: {
              product: true
            }
          },
          user: true
        }
      });

      this.testOrder = order;
      console.log(`   - Producto creado: ${product.name} (requiresCheckIn: ${product.requiresCheckIn})`);
      console.log(`   - Pedido creado: ${order.id} (status: ${order.status})`);
      
      return { order, product, user, center };
    });
  }

  async testQRGeneration() {
    return await this.test('Generación de QR para pedido', async () => {
      const response = await fetch(`${API_BASE_URL}/api/orders/${this.testOrder.id}/pass`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Cookie': 'session=test' // Simular sesión
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error generando QR: ${response.status} - ${errorText}`);
      }

      // El endpoint devuelve un PDF, pero podemos verificar que no hay error
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/pdf')) {
        return { success: true, message: 'QR generado correctamente como PDF' };
      } else {
        throw new Error(`Tipo de contenido inesperado: ${contentType}`);
      }
    });
  }

  async testQRVerification() {
    return await this.test('Verificación de QR (simulada)', async () => {
      // Simular token JWT para el pedido
      const jwt = await import('jsonwebtoken');
      const token = jwt.sign(
        { 
          type: 'order-pass', 
          orderId: this.testOrder.id, 
          uid: this.testOrder.userId,
          exp: Math.floor(Date.now() / 1000) + 3600 // 1 hora
        },
        process.env.JWT_SECRET || 'test-secret'
      );

      this.testToken = token;

      const response = await fetch(`${API_BASE_URL}/api/orders/verify?token=${encodeURIComponent(token)}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(`Error verificando QR: ${response.status} - ${data.error || 'Error desconocido'}`);
      }

      if (!data.ok) {
        throw new Error(`Verificación falló: ${data.error || 'No se puede verificar'}`);
      }

      // Verificar que detecta productos que requieren check-in
      const hasItemsRequiringCheckIn = data.order.itemsRequiringCheckIn && data.order.itemsRequiringCheckIn.length > 0;
      if (!hasItemsRequiringCheckIn) {
        throw new Error('No se detectaron productos que requieran check-in');
      }

      console.log(`   - Productos que requieren check-in: ${data.order.itemsRequiringCheckIn.length}`);
      console.log(`   - Puede hacer check-in: ${data.order.canCheckIn}`);
      console.log(`   - Ya canjeado: ${data.order.alreadyRedeemed}`);

      return data;
    });
  }

  async testCheckInProcess() {
    return await this.test('Proceso de check-in', async () => {
      const response = await fetch(`${API_BASE_URL}/api/admin/orders/${this.testOrder.id}/check-in`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Cookie': 'admin-session=test' // Simular sesión admin
        },
        body: JSON.stringify({})
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(`Error en check-in: ${response.status} - ${data.message || 'Error desconocido'}`);
      }

      // Verificar que el pedido cambió a REDEEMED
      const updatedOrder = await prisma.order.findUnique({
        where: { id: this.testOrder.id }
      });

      if (updatedOrder.status !== 'REDEEMED') {
        throw new Error(`Estado del pedido no cambió correctamente. Esperado: REDEEMED, Actual: ${updatedOrder.status}`);
      }

      console.log(`   - Pedido actualizado a estado: ${updatedOrder.status}`);
      console.log(`   - Fecha de canje: ${updatedOrder.redeemedAt}`);

      return { success: true, order: updatedOrder };
    });
  }

  async testDoubleCheckInPrevention() {
    return await this.test('Prevención de doble check-in', async () => {
      const response = await fetch(`${API_BASE_URL}/api/admin/orders/${this.testOrder.id}/check-in`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Cookie': 'admin-session=test'
        },
        body: JSON.stringify({})
      });

      const data = await response.json();

      // Debe fallar porque ya fue canjeado
      if (response.ok) {
        throw new Error('El doble check-in no fue prevenido correctamente');
      }

      if (!data.message || !data.message.includes('ya fue canjeado')) {
        throw new Error(`Mensaje de error inesperado: ${data.message}`);
      }

      console.log(`   - Doble check-in prevenido correctamente: ${data.message}`);
      return { success: true, message: data.message };
    });
  }

  async cleanup() {
    try {
      console.log('\n🧹 Limpiando datos de prueba...');
      
      if (this.testOrder) {
        // Eliminar items del pedido
        await prisma.orderItem.deleteMany({
          where: { orderId: this.testOrder.id }
        });
        
        // Eliminar el pedido
        await prisma.order.delete({
          where: { id: this.testOrder.id }
        });
        
        console.log('   - Pedido de prueba eliminado');
      }

      // Eliminar productos de prueba
      await prisma.product.deleteMany({
        where: {
          sku: {
            startsWith: 'AGUA-TEST-'
          }
        }
      });
      
      console.log('   - Productos de prueba eliminados');
      
    } catch (error) {
      console.error('⚠️ Error durante limpieza:', error.message);
    }
  }

  async runAllTests() {
    console.log('🚀 Iniciando pruebas del sistema de QR para pedidos\n');
    
    try {
      await this.setupTestData();
      await this.testQRGeneration();
      await this.testQRVerification();
      await this.testCheckInProcess();
      await this.testDoubleCheckInPrevention();
      
      console.log('\n🎉 ¡Todas las pruebas pasaron exitosamente!');
      console.log('\n✅ El sistema de QR para pedidos está 100% funcional');
      
    } catch (error) {
      console.error('\n❌ Error durante las pruebas:', error.message);
      throw error;
    } finally {
      await this.cleanup();
      await prisma.$disconnect();
    }
  }

  printSummary() {
    console.log('\n📊 Resumen de pruebas:');
    this.results.forEach(result => {
      console.log(`   ${result.status} ${result.name}`);
    });
  }
}

// Ejecutar pruebas si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new OrdersQRSystemTester();
  
  tester.runAllTests()
    .then(() => {
      tester.printSummary();
      console.log('\n✅ Pruebas completadas exitosamente');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Error en pruebas:', error);
      process.exit(1);
    });
}

export { OrdersQRSystemTester };
