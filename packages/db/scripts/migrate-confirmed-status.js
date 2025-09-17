/**
 * Script de migración para actualizar el estado 'CONFIRMED' a 'PAID'
 * Este script corrige la discrepancia entre frontend y backend
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateConfirmedStatus() {
  try {
    console.log('🔄 Iniciando migración de estado CONFIRMED a PAID...');
    
    // Verificar si hay reservas con estado CONFIRMED
    const confirmedReservations = await prisma.reservation.findMany({
      where: {
        status: 'CONFIRMED'
      },
      select: {
        id: true,
        status: true,
        createdAt: true
      }
    });

    if (confirmedReservations.length === 0) {
      console.log('✅ No se encontraron reservas con estado CONFIRMED. Migración no necesaria.');
      return;
    }

    console.log(`📊 Encontradas ${confirmedReservations.length} reservas con estado CONFIRMED`);

    // Actualizar todas las reservas con estado CONFIRMED a PAID
    const updateResult = await prisma.reservation.updateMany({
      where: {
        status: 'CONFIRMED'
      },
      data: {
        status: 'PAID'
      }
    });

    console.log(`✅ Migración completada: ${updateResult.count} reservas actualizadas de CONFIRMED a PAID`);

    // Verificar que no queden reservas con estado CONFIRMED
    const remainingConfirmed = await prisma.reservation.count({
      where: {
        status: 'CONFIRMED'
      }
    });

    if (remainingConfirmed === 0) {
      console.log('✅ Verificación exitosa: No quedan reservas con estado CONFIRMED');
    } else {
      console.log(`⚠️  Advertencia: Aún quedan ${remainingConfirmed} reservas con estado CONFIRMED`);
    }

  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar migración si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateConfirmedStatus()
    .then(() => {
      console.log('🎉 Migración completada exitosamente');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Error en la migración:', error);
      process.exit(1);
    });
}

export { migrateConfirmedStatus };
