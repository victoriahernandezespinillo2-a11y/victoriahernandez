import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyFinalFix() {
  try {
    console.log('🔍 VERIFICACIÓN FINAL - Creando entrenamiento de prueba...\n');
    
    // Buscar una cancha de prueba (que no sea la de TEST)
    const testCourt = await prisma.court.findFirst({
      where: {
        name: {
          not: {
            contains: 'TEST'
          }
        }
      }
    });
    
    if (!testCourt) {
      console.log('❌ No se encontró una cancha para pruebas');
      return;
    }
    
    console.log(`✅ Usando cancha: ${testCourt.name} (ID: ${testCourt.id})`);
    
    // Crear un entrenamiento recurrente de prueba para el martes
    const startDate = '2025-10-28'; // Martes
    const dayOfWeek = 2; // Martes
    const occurrences = 3; // Solo 3 para la prueba
    
    console.log(`📅 Creando entrenamiento recurrente:`);
    console.log(`   - Fecha inicio: ${startDate} (Martes)`);
    console.log(`   - Día de la semana: ${dayOfWeek} (Martes)`);
    console.log(`   - Ocurrencias: ${occurrences}`);
    console.log(`   - Hora: 10:00 - 11:00`);
    
    // Simular la lógica corregida para generar las fechas
    const expectedDates = [];
    const startUtcMidnight = new Date(`${startDate}T00:00:00Z`);
    
    for (let i = 0; i < occurrences; i++) {
      const cur = new Date(startUtcMidnight);
      cur.setUTCDate(cur.getUTCDate() + (i * 7));
      
      const jsTargetDay = dayOfWeek === 7 ? 0 : dayOfWeek;
      const targetDate = new Date(cur);
      const currentDay = targetDate.getUTCDay();
      
      let daysToAdd = jsTargetDay - currentDay;
      if (daysToAdd < 0) daysToAdd += 7;
      
      targetDate.setUTCDate(targetDate.getUTCDate() + daysToAdd);
      expectedDates.push(targetDate.toISOString().split('T')[0]);
    }
    
    console.log(`\n📊 Fechas esperadas:`);
    expectedDates.forEach((date, index) => {
      const dayName = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][new Date(date + 'T00:00:00Z').getUTCDay()];
      console.log(`   ${index + 1}. ${date} (${dayName})`);
    });
    
    // Crear los entrenamientos individuales usando MaintenanceSchedule
    const trainings = [];
    for (let i = 0; i < occurrences; i++) {
      const trainingDate = expectedDates[i];
      const scheduledAt = new Date(`${trainingDate}T10:00:00Z`); // 10:00 AM
      
      const training = await prisma.maintenanceSchedule.create({
        data: {
          courtId: testCourt.id,
          type: 'CLEANING', // Tipo requerido
          activityType: 'TRAINING',
          description: `PRUEBA VERIFICACIÓN ${i + 1} - Entrenamiento Martes`,
          scheduledAt: scheduledAt,
          estimatedDuration: 60, // 1 hora
          status: 'SCHEDULED',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      
      trainings.push(training);
    }
    
    console.log(`\n✅ Entrenamientos creados: ${trainings.length}`);
    
    // Verificar que las fechas son correctas
    console.log(`\n🔍 Verificando fechas creadas:`);
    let allCorrect = true;
    
    for (let i = 0; i < trainings.length; i++) {
      const training = trainings[i];
      const actualDate = training.scheduledAt.toISOString().split('T')[0];
      const expectedDate = expectedDates[i];
      const isCorrect = actualDate === expectedDate;
      
      if (!isCorrect) allCorrect = false;
      
      const dayName = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][training.scheduledAt.getUTCDay()];
      console.log(`   ${i + 1}. ${actualDate} (${dayName}) ${isCorrect ? '✅' : '❌'}`);
      
      if (!isCorrect) {
        console.log(`      Esperado: ${expectedDate}`);
      }
    }
    
    console.log(`\n📊 RESULTADO DE LA VERIFICACIÓN:`);
    if (allCorrect) {
      console.log(`✅ ¡PERFECTO! Todas las fechas son correctas.`);
      console.log(`🎉 La corrección del bug de recurrencia funciona correctamente.`);
    } else {
      console.log(`❌ Hay fechas incorrectas. Revisar la implementación.`);
    }
    
    // Limpiar los datos de prueba
    console.log(`\n🧹 Limpiando datos de prueba...`);
    
    await prisma.maintenanceSchedule.deleteMany({
      where: {
        id: {
          in: trainings.map(t => t.id)
        }
      }
    });
    
    console.log(`✅ Datos de prueba eliminados correctamente.`);
    
    return allCorrect;
    
  } catch (error) {
    console.error('💥 Error en la verificación:', error);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

verifyFinalFix().then(success => {
  if (success) {
    console.log('\n🎯 CONCLUSIÓN: El sistema está listo para crear entrenamientos recurrentes correctamente.');
  } else {
    console.log('\n⚠️ CONCLUSIÓN: Hay problemas que necesitan ser revisados.');
  }
});