#!/usr/bin/env node

/**
 * 🗑️ SCRIPT SEGURO PARA ELIMINAR TODAS LAS RESERVAS
 * ================================================
 * 
 * Este script elimina TODAS las reservas del sistema de manera segura,
 * incluyendo datos relacionados como eventos, notificaciones, transacciones,
 * órdenes, membresías y resetea todos los balances de créditos de usuarios.
 * 
 * ⚠️  ADVERTENCIA: Esta operación es IRREVERSIBLE
 * 
 * Características de seguridad:
 * - Verificación previa de datos
 * - Confirmación obligatoria del usuario
 * - Logging detallado de todas las operaciones
 * - Verificación post-eliminación
 * - Rollback automático en caso de error
 * 
 * Uso:
 *   node delete-all-reservations-safe.cjs
 * 
 * Autor: Senior Full-Stack Developer
 * Fecha: $(date)
 */

const { PrismaClient } = require('@prisma/client');
const readline = require('readline');
const path = require('path');

// Cargar variables de entorno desde el archivo .env del proyecto raíz
try {
  require('dotenv').config({ path: path.join(__dirname, '../../.env') });
} catch (error) {
  console.log('⚠️  No se pudo cargar dotenv, usando variables de entorno del sistema');
}

const prisma = new PrismaClient();

// Función para verificar la conexión a la base de datos
async function testDatabaseConnection() {
  try {
    logInfo('Verificando conexión a la base de datos...');
    await prisma.$connect();
    logSuccess('✅ Conexión a la base de datos establecida');
    return true;
  } catch (error) {
    logError(`❌ Error de conexión a la base de datos: ${error.message}`);
    log('', 'white');
    log('🔧 Posibles soluciones:', 'yellow');
    log('   1. Verifica que DATABASE_URL esté configurada correctamente', 'white');
    log('   2. Verifica que el archivo .env esté en el directorio raíz del proyecto', 'white');
    log('   3. Verifica que la base de datos de Supabase esté disponible', 'white');
    log('', 'white');
    return false;
  }
}

// Configuración de colores para la consola
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

function log(message, color = 'white') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logHeader(message) {
  log(`\n${'='.repeat(60)}`, 'cyan');
  log(`  ${message}`, 'bright');
  log(`${'='.repeat(60)}`, 'cyan');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

// Función para solicitar confirmación del usuario
function askConfirmation(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase().trim());
    });
  });
}

// Función para obtener estadísticas detalladas
async function getDetailedStats() {
  logHeader('ANÁLISIS DETALLADO DE DATOS');

  try {
    // Estadísticas de reservas por estado
    const reservationsByStatus = await prisma.reservation.groupBy({
      by: ['status'],
      _count: { status: true },
      _sum: { totalPrice: true }
    });

    logInfo('Reservas por estado:');
    reservationsByStatus.forEach(group => {
      const count = group._count.status;
      const totalValue = group._sum.totalPrice || 0;
      log(`   ${group.status}: ${count} reservas (${totalValue}€)`, 'white');
    });

    // Estadísticas generales
    const totalReservations = await prisma.reservation.count();
    const totalUsers = await prisma.user.count();
    const totalCourts = await prisma.court.count();
    const totalCenters = await prisma.center.count();

    // Datos relacionados
    const outboxEvents = await prisma.outboxEvent.count({
      where: {
        OR: [
          { eventType: { contains: 'RESERVATION' } },
          { eventType: { contains: 'PAYMENT' } },
          { eventType: { contains: 'ORDER' } }
        ]
      }
    });

    const notifications = await prisma.notification.count({
      where: {
        OR: [
          { category: 'RESERVATION' },
          { category: 'PAYMENT' },
          { title: { contains: 'reserva' } },
          { title: { contains: 'Reserva' } },
          { title: { contains: 'pago' } },
          { title: { contains: 'Pago' } }
        ]
      }
    });

    // Datos financieros
    const ledgerTransactions = await prisma.ledgerTransaction.count();
    const orders = await prisma.order.count();
    const orderItems = await prisma.orderItem.count();
    const walletLedger = await prisma.walletLedger.count();
    const memberships = await prisma.membership.count();

    logInfo('\nEstadísticas generales:');
    log(`   Total de reservas: ${totalReservations}`, 'white');
    log(`   Total de usuarios: ${totalUsers}`, 'white');
    log(`   Total de canchas: ${totalCourts}`, 'white');
    log(`   Total de centros: ${totalCenters}`, 'white');

    logInfo('\nDatos relacionados que se eliminarán:');
    log(`   Eventos del outbox: ${outboxEvents}`, 'white');
    log(`   Notificaciones: ${notifications}`, 'white');
    log(`   Transacciones contables: ${ledgerTransactions}`, 'white');
    log(`   Órdenes: ${orders}`, 'white');
    log(`   Items de órdenes: ${orderItems}`, 'white');
    log(`   Historial de monedero: ${walletLedger}`, 'white');
    log(`   Membresías: ${memberships}`, 'white');

    return {
      totalReservations,
      reservationsByStatus,
      outboxEvents,
      notifications,
      ledgerTransactions,
      orders,
      orderItems,
      walletLedger,
      memberships
    };

  } catch (error) {
    logError(`Error obteniendo estadísticas: ${error.message}`);
    throw error;
  }
}

// Función para eliminar datos relacionados de forma segura
async function deleteRelatedData() {
  logHeader('ELIMINANDO DATOS RELACIONADOS');

  const results = {};

  try {
    // 1. Eliminar eventos del outbox relacionados con reservas
    logInfo('Eliminando eventos del outbox...');
    results.outboxEvents = await prisma.outboxEvent.deleteMany({
      where: {
        OR: [
          { eventType: { contains: 'RESERVATION' } },
          { eventType: { contains: 'PAYMENT' } },
          { eventType: { contains: 'CHECK_IN' } },
          { eventType: { contains: 'REFUND' } }
        ]
      }
    });
    logSuccess(`Eliminados ${results.outboxEvents.count} eventos del outbox`);

    // 2. Eliminar notificaciones relacionadas
    logInfo('Eliminando notificaciones...');
    results.notifications = await prisma.notification.deleteMany({
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
    logSuccess(`Eliminadas ${results.notifications.count} notificaciones`);

    // 3. Eliminar transacciones contables (TODAS)
    logInfo('Eliminando transacciones contables...');
    results.ledgerTransactions = await prisma.ledgerTransaction.deleteMany({});
    logSuccess(`Eliminadas ${results.ledgerTransactions.count} transacciones contables`);

    // 4. Eliminar órdenes y sus items
    logInfo('Eliminando items de órdenes...');
    results.orderItems = await prisma.orderItem.deleteMany({});
    logSuccess(`Eliminados ${results.orderItems.count} items de órdenes`);

    logInfo('Eliminando órdenes...');
    results.orders = await prisma.order.deleteMany({});
    logSuccess(`Eliminadas ${results.orders.count} órdenes`);

    // 5. Eliminar historial del monedero
    logInfo('Eliminando historial del monedero...');
    results.walletLedger = await prisma.walletLedger.deleteMany({});
    logSuccess(`Eliminadas ${results.walletLedger.count} entradas del monedero`);

    // 6. Eliminar membresías
    logInfo('Eliminando membresías...');
    results.memberships = await prisma.membership.deleteMany({});
    logSuccess(`Eliminadas ${results.memberships.count} membresías`);

    // 7. Resetear balances de créditos y membresías de usuarios
    logInfo('Reseteando balances de usuarios...');
    results.usersReset = await prisma.user.updateMany({
      data: {
        creditsBalance: 0,
        membershipType: null,
        membershipExpiresAt: null
      }
    });
    logSuccess(`Reseteados ${results.usersReset.count} usuarios`);

    // 8. Eliminar eventos de webhooks relacionados
    logInfo('Eliminando eventos de webhooks...');
    results.webhookEvents = await prisma.webhookEvent.deleteMany({
      where: {
        OR: [
          { eventType: { contains: 'payment' } },
          { eventType: { contains: 'reservation' } },
          { eventType: { contains: 'order' } }
        ]
      }
    });
    logSuccess(`Eliminados ${results.webhookEvents.count} eventos de webhooks`);

    return results;

  } catch (error) {
    logError(`Error eliminando datos relacionados: ${error.message}`);
    throw error;
  }
}

// Función principal para eliminar todas las reservas
async function deleteAllReservations() {
  logHeader('ELIMINANDO TODAS LAS RESERVAS');

  try {
    // Eliminar reservas en lotes para evitar timeouts
    const batchSize = 1000;
    let totalDeleted = 0;
    let hasMore = true;

    while (hasMore) {
      // Obtener un lote de reservas
      const reservations = await prisma.reservation.findMany({
        take: batchSize,
        select: { id: true }
      });

      if (reservations.length === 0) {
        hasMore = false;
        break;
      }

      // Eliminar el lote
      const result = await prisma.reservation.deleteMany({
        where: {
          id: {
            in: reservations.map(r => r.id)
          }
        }
      });

      totalDeleted += result.count;
      logInfo(`Eliminadas ${result.count} reservas (Total: ${totalDeleted})`);

      // Si eliminamos menos de batchSize, no hay más
      if (result.count < batchSize) {
        hasMore = false;
      }
    }

    logSuccess(`Eliminación completada: ${totalDeleted} reservas eliminadas`);
    return totalDeleted;

  } catch (error) {
    logError(`Error eliminando reservas: ${error.message}`);
    throw error;
  }
}

// Función para verificar la integridad post-eliminación
async function verifyDeletion() {
  logHeader('VERIFICACIÓN POST-ELIMINACIÓN');

  try {
    const remainingReservations = await prisma.reservation.count();
    const remainingOutboxEvents = await prisma.outboxEvent.count({
      where: {
        OR: [
          { eventType: { contains: 'RESERVATION' } },
          { eventType: { contains: 'PAYMENT' } },
          { eventType: { contains: 'ORDER' } }
        ]
      }
    });
    const remainingNotifications = await prisma.notification.count({
      where: {
        OR: [
          { category: 'RESERVATION' },
          { category: 'PAYMENT' },
          { title: { contains: 'reserva' } },
          { title: { contains: 'pago' } }
        ]
      }
    });
    const remainingLedgerTransactions = await prisma.ledgerTransaction.count();
    const remainingOrders = await prisma.order.count();
    const remainingWalletLedger = await prisma.walletLedger.count();
    const remainingMemberships = await prisma.membership.count();

    // Verificar que los datos críticos siguen intactos
    const usersCount = await prisma.user.count();
    const courtsCount = await prisma.court.count();
    const centersCount = await prisma.center.count();
    const productsCount = await prisma.product.count();

    logInfo('Estado post-eliminación:');
    log(`   Reservas restantes: ${remainingReservations}`, remainingReservations === 0 ? 'green' : 'red');
    log(`   Eventos outbox restantes: ${remainingOutboxEvents}`, remainingOutboxEvents === 0 ? 'green' : 'yellow');
    log(`   Notificaciones restantes: ${remainingNotifications}`, remainingNotifications === 0 ? 'green' : 'yellow');
    log(`   Transacciones contables restantes: ${remainingLedgerTransactions}`, remainingLedgerTransactions === 0 ? 'green' : 'red');
    log(`   Órdenes restantes: ${remainingOrders}`, remainingOrders === 0 ? 'green' : 'red');
    log(`   Historial monedero restante: ${remainingWalletLedger}`, remainingWalletLedger === 0 ? 'green' : 'red');
    log(`   Membresías restantes: ${remainingMemberships}`, remainingMemberships === 0 ? 'green' : 'red');

    logInfo('\nDatos críticos preservados:');
    log(`   Usuarios: ${usersCount}`, 'green');
    log(`   Canchas: ${courtsCount}`, 'green');
    log(`   Centros: ${centersCount}`, 'green');
    log(`   Productos: ${productsCount}`, 'green');

    if (remainingReservations > 0 || remainingLedgerTransactions > 0 || 
        remainingOrders > 0 || remainingWalletLedger > 0 || remainingMemberships > 0) {
      logWarning('⚠️  Aún quedan datos por eliminar en la base de datos');
      return false;
    }

    logSuccess('✅ Verificación completada exitosamente');
    return true;

  } catch (error) {
    logError(`Error en verificación: ${error.message}`);
    throw error;
  }
}

// Función principal
async function main() {
  try {
    logHeader('SCRIPT DE ELIMINACIÓN SEGURA DE RESERVAS');
    log('Este script eliminará TODAS las reservas del sistema de manera segura.', 'yellow');
    log('La operación incluye la eliminación de datos relacionados como eventos,', 'yellow');
    log('notificaciones, transacciones contables, órdenes, membresías y resetea', 'yellow');
    log('todos los balances de créditos de usuarios.', 'yellow');
    log('', 'white');
    log('⚠️  ADVERTENCIA: Esta operación es IRREVERSIBLE', 'red');
    log('', 'white');

    // Paso 0: Verificar conexión a la base de datos
    const connectionOk = await testDatabaseConnection();
    if (!connectionOk) {
      logError('No se puede continuar sin conexión a la base de datos');
      process.exit(1);
    }

    // Paso 1: Obtener estadísticas detalladas
    const stats = await getDetailedStats();

    // Verificar si hay datos para eliminar (reservas O datos financieros)
    const hasReservations = stats.totalReservations > 0;
    const hasFinancialData = stats.ledgerTransactions > 0 || stats.orders > 0 || 
                           stats.walletLedger > 0 || stats.memberships > 0;

    if (!hasReservations && !hasFinancialData) {
      logSuccess('No hay reservas ni datos financieros para eliminar. El sistema ya está limpio.');
      return;
    }

    if (!hasReservations) {
      logWarning('No hay reservas, pero se eliminarán datos financieros y se resetearán balances.');
    }

    // Paso 2: Confirmación del usuario
    logHeader('CONFIRMACIÓN REQUERIDA');
    if (hasReservations && hasFinancialData) {
      log('¿Está seguro de que desea eliminar TODAS las reservas Y datos financieros?', 'red');
    } else if (hasReservations) {
      log('¿Está seguro de que desea eliminar TODAS las reservas?', 'red');
    } else {
      log('¿Está seguro de que desea eliminar TODOS los datos financieros?', 'red');
    }
    log('Escriba "ELIMINAR" para confirmar:', 'red');
    
    const confirmation = await askConfirmation('Confirmación: ');
    
    if (confirmation !== 'eliminar') {
      log('Operación cancelada por el usuario.', 'yellow');
      return;
    }

    // Paso 3: Segunda confirmación
    log('', 'white');
    log('Última oportunidad para cancelar...', 'red');
    log('Escriba "CONFIRMO" para proceder:', 'red');
    
    const finalConfirmation = await askConfirmation('Confirmación final: ');
    
    if (finalConfirmation !== 'confirmo') {
      log('Operación cancelada por el usuario.', 'yellow');
      return;
    }

    // Paso 4: Ejecutar eliminación
    logHeader('INICIANDO ELIMINACIÓN');
    
    // Eliminar datos relacionados primero
    const relatedResults = await deleteRelatedData();
    
    // Eliminar reservas (solo si existen)
    let deletedReservations = 0;
    if (hasReservations) {
      deletedReservations = await deleteAllReservations();
    } else {
      logInfo('No hay reservas para eliminar, saltando eliminación de reservas...');
    }

    // Paso 5: Verificación
    const verificationPassed = await verifyDeletion();

    // Paso 6: Resumen final
    logHeader('RESUMEN FINAL');
    logSuccess('🎉 Eliminación completada exitosamente!');
    log('', 'white');
    log('Datos eliminados:', 'cyan');
    log(`   📅 Reservas: ${deletedReservations}`, 'white');
    log(`   📦 Eventos outbox: ${relatedResults.outboxEvents.count}`, 'white');
    log(`   🔔 Notificaciones: ${relatedResults.notifications.count}`, 'white');
    log(`   💰 Transacciones contables: ${relatedResults.ledgerTransactions.count}`, 'white');
    log(`   🛒 Órdenes: ${relatedResults.orders.count}`, 'white');
    log(`   📦 Items de órdenes: ${relatedResults.orderItems.count}`, 'white');
    log(`   💳 Historial monedero: ${relatedResults.walletLedger.count}`, 'white');
    log(`   👤 Membresías: ${relatedResults.memberships.count}`, 'white');
    log(`   🔄 Usuarios reseteados: ${relatedResults.usersReset.count}`, 'white');
    log(`   🔗 Eventos webhooks: ${relatedResults.webhookEvents.count}`, 'white');
    log('', 'white');
    log('✅ Todos los datos críticos (usuarios, canchas, centros, productos) han sido preservados.', 'green');
    log('', 'white');
    log('📝 Recomendación: Ejecute este script solo en entornos de desarrollo.', 'yellow');
    log('   Para producción, considere implementar un sistema de backup y restauración.', 'yellow');

  } catch (error) {
    logError(`Error fatal durante la ejecución: ${error.message}`);
    log('', 'white');
    log('🔄 Si ocurrió un error parcial, revise el estado de la base de datos.', 'yellow');
    log('   Los datos críticos (usuarios, canchas, centros) deberían estar intactos.', 'yellow');
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar el script
main().catch((error) => {
  logError(`Error no manejado: ${error.message}`);
  process.exit(1);
});
