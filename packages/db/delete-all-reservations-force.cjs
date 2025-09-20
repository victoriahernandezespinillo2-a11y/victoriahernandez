#!/usr/bin/env node

/**
 * Script para eliminar TODAS las reservas de la base de datos (SIN CONFIRMACIÓN)
 * ⚠️  ADVERTENCIA: Este script elimina TODAS las reservas inmediatamente
 * 
 * Uso:
 * node delete-all-reservations-force.js
 * 
 * SOLO PARA DESARROLLO - NO USAR EN PRODUCCIÓN
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🗑️  SCRIPT DE ELIMINACIÓN FORZADA DE RESERVAS');
    console.log('=============================================\n');

    // Contar reservas existentes
    const totalReservations = await prisma.reservation.count();
    console.log(`📊 Total de reservas encontradas: ${totalReservations}`);

    if (totalReservations === 0) {
      console.log('✅ No hay reservas para eliminar.');
      return;
    }

    console.log('🔄 Eliminando todas las reservas...');

    // Eliminar todas las reservas
    const result = await prisma.reservation.deleteMany({});

    console.log(`✅ Eliminación completada`);
    console.log(`📊 Reservas eliminadas: ${result.count}`);

    // Verificar
    const remainingCount = await prisma.reservation.count();
    console.log(`🔍 Reservas restantes: ${remainingCount}`);

    console.log('🎉 Script completado');

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
