#!/usr/bin/env node

/**
 * Script para limpiar reservas y órdenes sin afectar productos, canchas o usuarios
 * Ubicado en packages/db para acceso directo a Prisma
 * Uso: node clean-reservations-and-orders.cjs
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function cleanReservationsAndOrders() {
  console.log('🧹 Iniciando limpieza de reservas y órdenes...');
  
  try {
    // 1. Limpiar eventos del outbox relacionados con reservas y pagos
    console.log('📦 Limpiando eventos del outbox...');
    const outboxDeleted = await prisma.outboxEvent.deleteMany({
      where: {
        OR: [
          { eventType: { contains: 'RESERVATION' } },
          { eventType: { contains: 'PAYMENT' } },
          { eventType: { contains: 'ORDER' } },
          { eventType: { contains: 'CHECK_IN' } },
          { eventType: { contains: 'REFUND' } }
        ]
      }
    });
    console.log(`✅ Eliminados ${outboxDeleted.count} eventos del outbox`);

    // 2. Limpiar notificaciones relacionadas con reservas
    console.log('🔔 Limpiando notificaciones de reservas...');
    const notificationsDeleted = await prisma.notification.deleteMany({
      where: {
        OR: [
          { category: 'RESERVATION' },
          { category: 'PAYMENT' },
          { title: { contains: 'reserva' } },
          { title: { contains: 'Reserva' } },
          { title: { contains: 'pago' } },
          { title: { contains: 'Pago' } },
          { title: { contains: 'check-in' } },
          { title: { contains: 'Check-in' } }
        ]
      }
    });
    console.log(`✅ Eliminadas ${notificationsDeleted.count} notificaciones`);

    // 3. Limpiar órdenes y sus items
    console.log('🛒 Limpiando órdenes y items...');
    const orderItemsDeleted = await prisma.orderItem.deleteMany({});
    console.log(`✅ Eliminados ${orderItemsDeleted.count} items de órdenes`);

    const ordersDeleted = await prisma.order.deleteMany({});
    console.log(`✅ Eliminadas ${ordersDeleted.count} órdenes`);

    // 4. Limpiar reservas
    console.log('📅 Limpiando reservas...');
    const reservationsDeleted = await prisma.reservation.deleteMany({});
    console.log(`✅ Eliminadas ${reservationsDeleted.count} reservas`);

    // 5. Limpiar historial de créditos (si existe)
    console.log('⭐ Limpiando historial de créditos...');
    let creditHistoryDeleted = { count: 0 };
    try {
      creditHistoryDeleted = await prisma.creditHistory.deleteMany({});
    } catch (error) {
      console.log('⚠️ Tabla creditHistory no existe, saltando...');
    }
    console.log(`✅ Eliminadas ${creditHistoryDeleted.count} entradas de historial de créditos`);

    // 6. Limpiar membresías de usuarios (mantener usuarios pero resetear membresías)
    console.log('👤 Reseteando membresías de usuarios...');
    const usersUpdated = await prisma.user.updateMany({
      data: {
        membershipType: null,
        membershipExpiresAt: null,
        creditsBalance: 0
      }
    });
    console.log(`✅ Reseteadas membresías de ${usersUpdated.count} usuarios`);

    // 7. Verificar que productos, canchas y usuarios siguen intactos
    console.log('🔍 Verificando integridad de datos...');
    
    const productsCount = await prisma.product.count();
    const courtsCount = await prisma.court.count();
    const centersCount = await prisma.center.count();
    const usersCount = await prisma.user.count();
    const sportsCount = await prisma.sport.count();
    
    let categoriesCount = 0;
    try {
      categoriesCount = await prisma.sportCategory.count();
    } catch (error) {
      console.log('⚠️ Tabla sportCategory no existe, saltando...');
    }

    console.log('\n📊 Estado final de datos:');
    console.log(`✅ Productos: ${productsCount}`);
    console.log(`✅ Canchas: ${courtsCount}`);
    console.log(`✅ Centros: ${centersCount}`);
    console.log(`✅ Usuarios: ${usersCount}`);
    console.log(`✅ Deportes: ${sportsCount}`);
    console.log(`✅ Categorías: ${categoriesCount}`);

    console.log('\n🎉 Limpieza completada exitosamente!');
    console.log('📝 Datos eliminados:');
    console.log(`   - ${reservationsDeleted.count} reservas`);
    console.log(`   - ${ordersDeleted.count} órdenes`);
    console.log(`   - ${orderItemsDeleted.count} items de órdenes`);
    console.log(`   - ${outboxDeleted.count} eventos del outbox`);
    console.log(`   - ${notificationsDeleted.count} notificaciones`);
    console.log(`   - ${creditHistoryDeleted.count} entradas de historial de créditos`);
    console.log(`   - ${usersUpdated.count} membresías de usuarios reseteadas`);

  } catch (error) {
    console.error('❌ Error durante la limpieza:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar el script
cleanReservationsAndOrders()
  .then(() => {
    console.log('✅ Script ejecutado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error ejecutando script:', error);
    process.exit(1);
  });
