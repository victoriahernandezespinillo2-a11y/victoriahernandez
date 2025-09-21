#!/usr/bin/env node

/**
 * Script para verificar saldos de billetera antes de eliminar reservas
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('💰 VERIFICACIÓN DE SALDOS DE BILLETERA');
    console.log('=====================================\n');

    // Verificar usuarios con saldo positivo en billetera
    const usersWithBalance = await prisma.user.findMany({
      where: {
        creditsBalance: {
          gt: 0
        }
      },
      select: {
        id: true,
        email: true,
        name: true,
        creditsBalance: true,
        createdAt: true
      },
      orderBy: {
        creditsBalance: 'desc'
      }
    });

    console.log(`📊 Usuarios con saldo positivo: ${usersWithBalance.length}`);

    if (usersWithBalance.length > 0) {
      console.log('\n👥 USUARIOS CON SALDO EN BILLETERA:');
      console.log('=====================================');
      
      let totalCredits = 0;
      usersWithBalance.forEach((user, index) => {
        console.log(`${index + 1}. ${user.name || 'Sin nombre'} (${user.email})`);
        console.log(`   - Saldo: ${user.creditsBalance} créditos`);
        console.log(`   - Usuario desde: ${user.createdAt.toLocaleDateString('es-ES')}`);
        console.log('');
        totalCredits += user.creditsBalance;
      });

      console.log(`💳 TOTAL DE CRÉDITOS EN CIRCULACIÓN: ${totalCredits}`);
    } else {
      console.log('✅ No hay usuarios con saldo positivo en billetera');
    }

    // Verificar movimientos de billetera recientes
    console.log('\n📈 MOVIMIENTOS DE BILLETERA RECIENTES:');
    console.log('======================================');

    const recentMovements = await prisma.walletLedger.findMany({
      take: 10,
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        user: {
          select: {
            email: true,
            name: true
          }
        }
      }
    });

    if (recentMovements.length > 0) {
      recentMovements.forEach((movement, index) => {
        console.log(`${index + 1}. ${movement.user.name || 'Usuario'} (${movement.user.email})`);
        console.log(`   - Tipo: ${movement.type}`);
        console.log(`   - Monto: ${movement.amount} créditos`);
        console.log(`   - Fecha: ${movement.createdAt.toLocaleString('es-ES')}`);
        console.log(`   - Descripción: ${movement.description || 'Sin descripción'}`);
        console.log('');
      });
    } else {
      console.log('📝 No hay movimientos de billetera registrados');
    }

    // Verificar reservas pendientes de pago
    console.log('\n🔄 RESERVAS PENDIENTES DE PAGO:');
    console.log('===============================');

    const pendingReservations = await prisma.reservation.findMany({
      where: {
        status: 'PENDING'
      },
      include: {
        user: {
          select: {
            email: true,
            name: true,
            creditsBalance: true
          }
        },
        court: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`📋 Reservas pendientes: ${pendingReservations.length}`);

    if (pendingReservations.length > 0) {
      pendingReservations.forEach((reservation, index) => {
        console.log(`${index + 1}. ${reservation.user.name || 'Usuario'} (${reservation.user.email})`);
        console.log(`   - Cancha: ${reservation.court.name}`);
        console.log(`   - Precio: ${reservation.totalPrice}€`);
        console.log(`   - Créditos disponibles: ${reservation.user.creditsBalance}`);
        console.log(`   - Fecha: ${reservation.startTime.toLocaleDateString('es-ES')} ${reservation.startTime.toLocaleTimeString('es-ES')}`);
        console.log('');
      });
    } else {
      console.log('✅ No hay reservas pendientes de pago');
    }

    // Resumen final
    console.log('\n📊 RESUMEN:');
    console.log('===========');
    console.log(`👥 Usuarios con saldo: ${usersWithBalance.length}`);
    console.log(`💳 Total créditos: ${usersWithBalance.reduce((sum, user) => sum + user.creditsBalance, 0)}`);
    console.log(`📋 Reservas pendientes: ${pendingReservations.length}`);
    console.log(`📈 Movimientos recientes: ${recentMovements.length}`);

    if (usersWithBalance.length > 0 || pendingReservations.length > 0) {
      console.log('\n⚠️  ADVERTENCIA:');
      console.log('   - Hay usuarios con saldo en billetera');
      console.log('   - Hay reservas pendientes de pago');
      console.log('   - Considera esto antes de eliminar las reservas');
    } else {
      console.log('\n✅ Todo limpio para eliminar reservas');
    }

  } catch (error) {
    console.error('❌ Error verificando saldos:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar el script
main().catch((error) => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});



