import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

async function createMassiveTestTrainings() {
  console.log('🚀 INICIANDO CREACIÓN MASIVA DE ENTRENAMIENTOS TEST');
  console.log('📊 Total a crear: 210 entrenamientos (30 por cada día de la semana)');
  console.log('⏰ Horario: 18:00 - 20:00');
  console.log('🏟️ Cancha: TEST 1 NO UTILIZAR - FOOTBALL');
  console.log('');

  try {
    // Buscar la cancha TEST
    const testCourt = await prisma.court.findFirst({
      where: {
        name: 'TEST 1 NO UTILIZAR',
        sportType: 'FOOTBALL'
      }
    });

    if (!testCourt) {
      console.log('❌ No se encontró la cancha TEST 1 NO UTILIZAR - FOOTBALL');
      return;
    }

    console.log(`✅ Cancha encontrada: ${testCourt.name} (ID: ${testCourt.id})`);
    console.log(`   Deporte: ${testCourt.sportType}`);
    console.log('');

    // Definir los días de la semana
    const daysOfWeek = [
      { name: 'LUNES', dayOfWeek: 1 },
      { name: 'MARTES', dayOfWeek: 2 },
      { name: 'MIÉRCOLES', dayOfWeek: 3 },
      { name: 'JUEVES', dayOfWeek: 4 },
      { name: 'VIERNES', dayOfWeek: 5 },
      { name: 'SÁBADO', dayOfWeek: 6 },
      { name: 'DOMINGO', dayOfWeek: 0 }
    ];

    const results = {
      created: 0,
      errors: 0,
      details: []
    };

    // Crear 30 entrenamientos para cada día de la semana
    for (const day of daysOfWeek) {
      console.log(`📅 Creando entrenamientos para ${day.name}...`);
      
      const dayResults = {
        day: day.name,
        created: 0,
        errors: 0,
        errorDetails: []
      };

      for (let i = 1; i <= 30; i++) {
        try {
          // Calcular fecha de inicio (próximo día de la semana + semanas adicionales)
          const startDate = new Date();
          const currentDay = startDate.getDay();
          const daysUntilTarget = (day.dayOfWeek - currentDay + 7) % 7;
          startDate.setDate(startDate.getDate() + daysUntilTarget + (i - 1) * 7);

          const maintenanceTask = await prisma.maintenanceSchedule.create({
            data: {
              courtId: testCourt.id,
              description: `MASSIVE TEST ${day.name} #${i} - Entrenamiento masivo de prueba para ${day.name} - Sesión ${i}/30. Horario 18:00-20:00. Omitir cierres y solapes habilitado.`,
              scheduledAt: startDate,
              status: 'SCHEDULED',
              type: 'INSPECTION',
              activityType: 'TRAINING',
              activityCategory: 'MASSIVE_TEST',
              capacity: 20,
              instructor: 'Sistema Automatico',
              isPublic: true,
              requirements: 'Entrenamiento de prueba masiva',
              seriesId: `MASSIVE_TEST_${day.name}_SERIES`,
              estimatedDuration: 120, // 2 horas en minutos
              notes: `Sesión ${i} de 30 para ${day.name}. Horario: 18:00-20:00`
            }
          });

          dayResults.created++;
          results.created++;

          if (i <= 3 || i >= 28) { // Mostrar solo los primeros 3 y últimos 3
            console.log(`  ✅ ${day.name} #${i}: ${startDate.toLocaleDateString('es-ES', { 
              weekday: 'long', 
              year: 'numeric', 
              month: '2-digit', 
              day: '2-digit' 
            })} 18:00-20:00`);
          } else if (i === 4) {
            console.log(`  ... (creando entrenamientos ${i}-27) ...`);
          }

        } catch (error) {
          dayResults.errors++;
          results.errors++;
          dayResults.errorDetails.push({
            session: i,
            error: error.message
          });
          console.log(`  ❌ ${day.name} #${i}: Error - ${error.message}`);
        }
      }

      results.details.push(dayResults);
      console.log(`  📊 ${day.name}: ${dayResults.created} creados, ${dayResults.errors} errores`);
      console.log('');
    }

    // Resumen final
    console.log('🎯 RESUMEN FINAL:');
    console.log(`✅ Total creados: ${results.created}`);
    console.log(`❌ Total errores: ${results.errors}`);
    console.log(`📊 Tasa de éxito: ${((results.created / 210) * 100).toFixed(1)}%`);
    console.log('');

    // Detalles por día
    console.log('📋 DETALLES POR DÍA:');
    results.details.forEach(day => {
      console.log(`${day.day}: ${day.created}/30 (${((day.created/30)*100).toFixed(1)}%)`);
      if (day.errors > 0) {
        console.log(`  Errores: ${day.errors}`);
        day.errorDetails.forEach(error => {
          console.log(`    - Sesión ${error.session}: ${error.error}`);
        });
      }
    });

    // Guardar reporte
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalExpected: 210,
        totalCreated: results.created,
        totalErrors: results.errors,
        successRate: ((results.created / 210) * 100).toFixed(1) + '%'
      },
      configuration: {
        court: testCourt.name,
        sportType: testCourt.sportType,
        timeSlot: '18:00-20:00',
        skipClosures: true,
        skipOverlaps: true,
        recurrenceType: 'WEEKLY',
        sessionsPerDay: 30
      },
      detailsByDay: results.details
    };

    await fs.promises.writeFile(
      'massive_test_creation_report.json',
      JSON.stringify(report, null, 2)
    );

    console.log('');
    console.log('💾 Reporte guardado en: massive_test_creation_report.json');
    console.log('🔍 Listo para ejecutar auditoría con el script de verificación');

  } catch (error) {
    console.error('💥 Error general:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar
createMassiveTestTrainings();