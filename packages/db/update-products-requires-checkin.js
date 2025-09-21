/**
 * Script para actualizar productos existentes con requiresCheckIn correcto
 * Este script es seguro y no destructivo - solo actualiza el campo requiresCheckIn
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateProductsRequiresCheckIn() {
  try {
    console.log('🔧 Actualizando configuración de requiresCheckIn para productos...');
    
    // 1. Productos físicos que SÍ requieren check-in
    const physicalProducts = await prisma.product.updateMany({
      where: {
        type: 'PHYSICAL',
        requiresCheckIn: false // Solo actualizar los que aún no tienen el campo configurado
      },
      data: {
        requiresCheckIn: true
      }
    });
    
    console.log(`✅ ${physicalProducts.count} productos físicos configurados para requerir check-in`);
    
    // 2. Productos digitales que NO requieren check-in
    const digitalProducts = await prisma.product.updateMany({
      where: {
        type: 'DIGITAL',
        requiresCheckIn: true // Solo actualizar los que incorrectamente tienen check-in
      },
      data: {
        requiresCheckIn: false
      }
    });
    
    console.log(`✅ ${digitalProducts.count} productos digitales configurados para NO requerir check-in`);
    
    // 3. Productos específicos por categoría
    const categoryUpdates = await prisma.product.updateMany({
      where: {
        category: {
          in: ['bebidas', 'snacks', 'comida', 'merchandise', 'agua', 'refrescos']
        },
        requiresCheckIn: false
      },
      data: {
        requiresCheckIn: true
      }
    });
    
    console.log(`✅ ${categoryUpdates.count} productos por categoría configurados para requerir check-in`);
    
    // 4. Verificar estado final
    const summary = await prisma.product.groupBy({
      by: ['requiresCheckIn'],
      _count: {
        id: true
      }
    });
    
    console.log('\n📊 Resumen final:');
    summary.forEach(item => {
      const status = item.requiresCheckIn ? 'SÍ requieren check-in' : 'NO requieren check-in';
      console.log(`   - ${item._count.id} productos ${status}`);
    });
    
    // 5. Mostrar productos específicos que requieren check-in
    const productsRequiringCheckIn = await prisma.product.findMany({
      where: {
        requiresCheckIn: true
      },
      select: {
        id: true,
        name: true,
        type: true,
        category: true
      }
    });
    
    console.log('\n🛒 Productos que requieren check-in:');
    productsRequiringCheckIn.forEach(product => {
      console.log(`   - ${product.name} (${product.type}, ${product.category})`);
    });
    
    console.log('\n🎉 Actualización completada exitosamente!');
    
  } catch (error) {
    console.error('❌ Error actualizando productos:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar solo si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  updateProductsRequiresCheckIn()
    .then(() => {
      console.log('✅ Script completado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error en script:', error);
      process.exit(1);
    });
}

export { updateProductsRequiresCheckIn };


