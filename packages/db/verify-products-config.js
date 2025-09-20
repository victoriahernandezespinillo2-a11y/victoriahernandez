/**
 * Script de verificación para productos y configuración de requiresCheckIn
 * Verifica que la configuración esté correcta antes de probar el sistema
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyProductsConfig() {
  try {
    console.log('🔍 Verificando configuración de productos...\n');
    
    // 1. Verificar que el campo exists en la base de datos
    const productsCount = await prisma.product.count();
    console.log(`📦 Total de productos en la base de datos: ${productsCount}`);
    
    // 2. Verificar distribución por requiresCheckIn
    const checkInDistribution = await prisma.product.groupBy({
      by: ['requiresCheckIn'],
      _count: {
        id: true
      }
    });
    
    console.log('\n📊 Distribución por requiresCheckIn:');
    checkInDistribution.forEach(item => {
      const status = item.requiresCheckIn ? 'SÍ requieren check-in' : 'NO requieren check-in';
      console.log(`   - ${item._count.id} productos ${status}`);
    });
    
    // 3. Verificar productos por tipo
    const typeDistribution = await prisma.product.groupBy({
      by: ['type'],
      _count: {
        id: true
      }
    });
    
    console.log('\n🏷️ Distribución por tipo:');
    typeDistribution.forEach(item => {
      console.log(`   - ${item._count.id} productos tipo ${item.type}`);
    });
    
    // 4. Verificar productos específicos que requieren check-in
    const productsRequiringCheckIn = await prisma.product.findMany({
      where: {
        requiresCheckIn: true
      },
      select: {
        id: true,
        name: true,
        type: true,
        category: true,
        sku: true
      }
    });
    
    console.log('\n✅ Productos que requieren check-in:');
    if (productsRequiringCheckIn.length === 0) {
      console.log('   ⚠️ No hay productos configurados para requerir check-in');
    } else {
      productsRequiringCheckIn.forEach(product => {
        console.log(`   - ${product.name} (SKU: ${product.sku}, Tipo: ${product.type}, Categoría: ${product.category})`);
      });
    }
    
    // 5. Verificar productos que NO requieren check-in
    const productsNotRequiringCheckIn = await prisma.product.findMany({
      where: {
        requiresCheckIn: false
      },
      select: {
        id: true,
        name: true,
        type: true,
        category: true,
        sku: true
      }
    });
    
    console.log('\n❌ Productos que NO requieren check-in:');
    if (productsNotRequiringCheckIn.length === 0) {
      console.log('   ⚠️ No hay productos configurados para NO requerir check-in');
    } else {
      productsNotRequiringCheckIn.forEach(product => {
        console.log(`   - ${product.name} (SKU: ${product.sku}, Tipo: ${product.type}, Categoría: ${product.category})`);
      });
    }
    
    // 6. Verificar configuración de pedidos existentes
    const ordersWithProducts = await prisma.order.findMany({
      where: {
        status: 'PAID',
        items: {
          some: {}
        }
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                name: true,
                requiresCheckIn: true,
                type: true
              }
            }
          }
        }
      },
      take: 5 // Solo los primeros 5 para no saturar
    });
    
    console.log('\n🛒 Pedidos existentes con productos:');
    ordersWithProducts.forEach(order => {
      console.log(`   Pedido ${order.id}:`);
      order.items.forEach(item => {
        const checkInStatus = item.product.requiresCheckIn ? '✅ Requiere check-in' : '❌ No requiere check-in';
        console.log(`     - ${item.product.name} (${item.product.type}) - ${checkInStatus}`);
      });
    });
    
    // 7. Resumen de verificación
    console.log('\n🎯 Resumen de verificación:');
    const hasProductsRequiringCheckIn = productsRequiringCheckIn.length > 0;
    const hasProductsNotRequiringCheckIn = productsNotRequiringCheckIn.length > 0;
    const hasOrders = ordersWithProducts.length > 0;
    
    console.log(`   - Productos que requieren check-in: ${hasProductsRequiringCheckIn ? '✅' : '❌'}`);
    console.log(`   - Productos que NO requieren check-in: ${hasProductsNotRequiringCheckIn ? '✅' : '❌'}`);
    console.log(`   - Pedidos existentes para probar: ${hasOrders ? '✅' : '❌'}`);
    
    if (hasProductsRequiringCheckIn && hasOrders) {
      console.log('\n🎉 Sistema listo para probar escaneo QR de pedidos!');
    } else {
      console.log('\n⚠️ Sistema necesita configuración adicional antes de probar');
    }
    
  } catch (error) {
    console.error('❌ Error verificando configuración:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar solo si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  verifyProductsConfig()
    .then(() => {
      console.log('\n✅ Verificación completada');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error en verificación:', error);
      process.exit(1);
    });
}

export { verifyProductsConfig };
