import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixTrainingTimes() {
  try {
    console.log('🔧 CORRIGIENDO HORARIOS DE ENTRENAMIENTOS...\n');
    
    // Buscar la cancha de prueba
    const testCourt = await prisma.court.findFirst({
      where: {
        name: 'TEST 1 NO UTILIZAR',
        sportType: 'FOOTBALL'
      }
    });
    
    if (!testCourt) {
      console.log('❌ No se encontró la cancha de prueba');
      return;
    }
    
    // Buscar entrenamientos de prueba con horarios incorrectos
    const badTrainings = await prisma.maintenanceSchedule.findMany({
      where: {
        courtId: testCourt.id,
        description: {
          startsWith: 'MASSIVE TEST'
        }
      },
      orderBy: {
        scheduledAt: 'asc'
      }
    });
    
    console.log(`📋 Entrenamientos encontrados: ${badTrainings.length}`);
    
    let fixed = 0;
    const today = new Date();
    
    for (const training of badTrainings) {
      const originalDate = new Date(training.scheduledAt);
      
      // Crear nueva fecha: hoy + índice de días, a las 18:00
      const dayIndex = Math.floor(fixed / 30); // 30 entrenamientos por día
      const sessionIndex = fixed % 30;
      
      const newDate = new Date(today);
      newDate.setDate(today.getDate() + dayIndex);
      newDate.setHours(18, 0, 0, 0); // 18:00:00
      
      // Actualizar el entrenamiento
      await prisma.maintenanceSchedule.update({
        where: { id: training.id },
        data: {
          scheduledAt: newDate
        }
      });
      
      if (fixed < 5) { // Mostrar solo los primeros 5 para no saturar
        console.log(`✅ Corregido: ${training.description.substring(0, 50)}...`);
        console.log(`   Antes: ${originalDate.toLocaleString()}`);
        console.log(`   Después: ${newDate.toLocaleString()}`);
        console.log('');
      }
      
      fixed++;
    }
    
    console.log(`🎯 Total entrenamientos corregidos: ${fixed}`);
    console.log('✅ Horarios actualizados a 18:00 y fechas a partir de hoy');
    
  } catch (error) {
    console.error('💥 Error al corregir horarios:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixTrainingTimes();