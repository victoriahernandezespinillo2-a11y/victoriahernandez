#!/usr/bin/env node

/**
 * Script para eliminar TODAS las reservas de la base de datos
 * ⚠️  ADVERTENCIA: Este script elimina TODAS las reservas permanentemente
 * 
 * Uso:
 * node delete-all-reservations.js
 * 
 * Para confirmar la eliminación, debes escribir "CONFIRMAR" cuando se te solicite
 */

const { PrismaClient } = require('@prisma/client');
const readline = require('readline');

const prisma = new PrismaClient();

// Función para leer input del usuario
function askQuestion(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function main() {
  try {
    console.log('🗑️  SCRIPT DE ELIMINACIÓN DE RESERVAS');
    console.log('=====================================\n');

    // Contar reservas existentes
    const totalReservations = await prisma.reservation.count();
    console.log(`📊 Total de reservas encontradas: ${totalReservations}`);

    if (totalReservations === 0) {
      console.log('✅ No hay reservas para eliminar. El script termina aquí.');
      return;
    }

    // Mostrar estadísticas por estado
    const reservationsByStatus = await prisma.reservation.groupBy({
      by: ['status'],
      _count: {
        id: true
      }
    });

    console.log('\n📈 Reservas por estado:');
    reservationsByStatus.forEach(stat => {
      console.log(`   - ${stat.status}: ${stat._count.id} reservas`);
    });

    // Mostrar rango de fechas
    const dateRange = await prisma.reservation.aggregate({
      _min: {
        startTime: true
      },
      _max: {
        startTime: true
      }
    });

    if (dateRange._min.startTime && dateRange._max.startTime) {
      console.log(`\n📅 Rango de fechas:`);
      console.log(`   - Desde: ${dateRange._min.startTime.toLocaleDateString('es-ES')}`);
      console.log(`   - Hasta: ${dateRange._max.startTime.toLocaleDateString('es-ES')}`);
    }

    console.log('\n⚠️  ADVERTENCIA IMPORTANTE:');
    console.log('   - Este script eliminará TODAS las reservas de la base de datos');
    console.log('   - Esta acción NO se puede deshacer');
    console.log('   - Solo se eliminarán las reservas, NO otros datos (usuarios, canchas, etc.)');
    console.log('   - Las relaciones con usuarios y canchas se mantendrán intactas');

    // Solicitar confirmación
    const confirmation = await askQuestion('\n❓ Para confirmar la eliminación, escribe "CONFIRMAR": ');
    
    if (confirmation !== 'CONFIRMAR') {
      console.log('❌ Eliminación cancelada. El texto no coincide con "CONFIRMAR".');
      return;
    }

    console.log('\n🔄 Iniciando eliminación de reservas...');

    // Eliminar todas las reservas
    const result = await prisma.reservation.deleteMany({});

    console.log(`✅ Eliminación completada exitosamente`);
    console.log(`📊 Reservas eliminadas: ${result.count}`);

    // Verificar que no quedan reservas
    const remainingCount = await prisma.reservation.count();
    console.log(`🔍 Reservas restantes: ${remainingCount}`);

    if (remainingCount === 0) {
      console.log('✅ Verificación exitosa: No quedan reservas en la base de datos');
    } else {
      console.log('⚠️  Advertencia: Aún quedan reservas en la base de datos');
    }

    console.log('\n🎉 Script completado exitosamente');

  } catch (error) {
    console.error('❌ Error durante la eliminación:', error);
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

