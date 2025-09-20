/**
 * Script para verificar el estado de una reserva específica
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkReservationStatus() {
  try {
    console.log('🔍 Verificando estado de reservas...\n');
    
    // Buscar reservas del usuario cieloyverdad@gmail.com
    const user = await prisma.user.findUnique({
      where: { email: 'cieloyverdad@gmail.com' }
    });
    
    if (!user) {
      console.log('❌ Usuario no encontrado');
      return;
    }
    
    console.log(`👤 Usuario: ${user.name} (${user.email})`);
    
    // Obtener todas las reservas del usuario
    const reservations = await prisma.reservation.findMany({
      where: { userId: user.id },
      include: {
        court: {
          include: {
            center: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log(`\n📅 Total de reservas: ${reservations.length}\n`);
    
    reservations.forEach((reservation, index) => {
      console.log(`🏟️ RESERVA #${index + 1}:`);
      console.log(`   - ID: ${reservation.id}`);
      console.log(`   - Cancha: ${reservation.court.name}`);
      console.log(`   - Centro: ${reservation.court.center.name}`);
      console.log(`   - Estado: ${reservation.status}`);
      console.log(`   - Fecha: ${reservation.startTime.toISOString()}`);
      console.log(`   - Horario: ${reservation.startTime.toLocaleTimeString()} - ${reservation.endTime.toLocaleTimeString()}`);
      console.log(`   - Precio: ${reservation.totalPrice}€`);
      console.log(`   - Método de pago: ${reservation.paymentMethod || 'No especificado'}`);
      console.log(`   - Check-in: ${reservation.checkInTime ? reservation.checkInTime.toISOString() : 'No realizado'}`);
      
      // Verificar si puede generar pase
      const validPassStatuses = ['PAID', 'IN_PROGRESS'];
      const canGeneratePass = validPassStatuses.includes(reservation.status);
      const isExpired = reservation.endTime < new Date();
      
      console.log(`   - ¿Puede generar pase?: ${canGeneratePass ? '✅ SÍ' : '❌ NO'}`);
      console.log(`   - ¿Está expirada?: ${isExpired ? '⏰ SÍ' : '⏰ NO'}`);
      
      if (!canGeneratePass) {
        if (reservation.status === 'COMPLETED') {
          console.log('   - Razón: Reserva completada');
        } else if (reservation.status === 'NO_SHOW') {
          console.log('   - Razón: No se presentó');
        } else if (reservation.status === 'CANCELLED') {
          console.log('   - Razón: Reserva cancelada');
        } else if (reservation.status === 'PENDING') {
          console.log('   - Razón: Pago pendiente');
        }
      }
      
      if (isExpired && canGeneratePass) {
        console.log('   - ⚠️ Reserva expirada pero en estado válido');
      }
      
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

checkReservationStatus()
  .then(() => {
    console.log('✅ Verificación completada');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
