import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixTrainingDistribution() {
  try {
    console.log('🔧 DISTRIBUYENDO ENTRENAMIENTOS POR DÍAS CORRECTOS...\n');
    
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
    
    // Buscar todos los entrenamientos de prueba
    const allTrainings = await prisma.maintenanceSchedule.findMany({
      where: {
        courtId: testCourt.id,
        description: {
          startsWith: 'MASSIVE TEST'
        }
      },
      orderBy: {
        description: 'asc'
      }
    });
    
    console.log(`📋 Entrenamientos encontrados: ${allTrainings.length}`);
    
    // Mapeo de días en español a números de día de la semana
    const dayMapping = {
      'LUNES': 1,    // Monday
      'MARTES': 2,   // Tuesday  
      'MIÉRCOLES': 3, // Wednesday
      'JUEVES': 4,   // Thursday
      'VIERNES': 5,  // Friday
      'SÁBADO': 6,   // Saturday
      'DOMINGO': 0   // Sunday
    };
    
    let fixed = 0;
    const today = new Date(); // 28 de octubre de 2025 (martes)
    
    for (const training of allTrainings) {
      // Extraer el día del nombre del entrenamiento (incluyendo caracteres con acentos)
      const titleMatch = training.description.match(/MASSIVE TEST ([A-ZÁÉÍÓÚÑ]+)/);
      const dayName = titleMatch ? titleMatch[1] : null;
      
      if (!dayName || !(dayName in dayMapping)) {
        console.log(`⚠️ No se pudo determinar el día para: ${training.description}`);
        continue;
      }
      
      const targetDayOfWeek = dayMapping[dayName];
      const currentDayOfWeek = today.getDay(); // 2 (martes)
      
      // Calcular cuántos días agregar para llegar al día objetivo
      let daysToAdd = targetDayOfWeek - currentDayOfWeek;
      if (daysToAdd < 0) {
        daysToAdd += 7; // Si el día ya pasó esta semana, ir a la próxima
      }
      
      // Crear la nueva fecha
      const newDate = new Date(today);
      newDate.setDate(today.getDate() + daysToAdd);
      newDate.setHours(18, 0, 0, 0); // 18:00:00
      
      // Actualizar el entrenamiento
      await prisma.maintenanceSchedule.update({
        where: { id: training.id },
        data: {
          scheduledAt: newDate
        }
      });
      
      if (fixed < 10) { // Mostrar solo los primeros 10
        console.log(`✅ ${dayName}: ${training.description.substring(0, 40)}...`);
        console.log(`   📅 Nueva fecha: ${newDate.toLocaleDateString()} (${newDate.toLocaleDateString('es-ES', { weekday: 'long' })})`);
        console.log('');
      }
      
      fixed++;
    }
    
    console.log(`🎯 Total entrenamientos redistribuidos: ${fixed}`);
    console.log('✅ Entrenamientos distribuidos correctamente por días de la semana');
    
  } catch (error) {
    console.error('💥 Error al redistribuir entrenamientos:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixTrainingDistribution();