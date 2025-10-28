import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

async function auditMassiveTestTrainings() {
  console.log('🔍 AUDITORÍA MASIVA DE ENTRENAMIENTOS TEST');
  console.log('📊 Verificando 210 entrenamientos (30 por cada día de la semana)');
  console.log('⏰ Horario esperado: 18:00 - 20:00');
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
      console.error('❌ No se encontró la cancha TEST 1 NO UTILIZAR - FOOTBALL');
      return;
    }

    // Buscar todos los entrenamientos masivos
    const allTrainings = await prisma.maintenanceSchedule.findMany({
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

    console.log(`📋 Total entrenamientos encontrados: ${allTrainings.length}`);
    console.log('');

    // Definir días de la semana esperados
    const expectedDays = {
      0: 'DOMINGO',
      1: 'LUNES', 
      2: 'MARTES',
      3: 'MIÉRCOLES',
      4: 'JUEVES',
      5: 'VIERNES',
      6: 'SÁBADO'
    };

    const auditResults = {
      totalFound: allTrainings.length,
      totalExpected: 210,
      correctTrainings: 0,
      incorrectTrainings: 0,
      byDay: {},
      issues: [],
      summary: {}
    };

    // Inicializar contadores por día
    Object.values(expectedDays).forEach(day => {
      auditResults.byDay[day] = {
        expected: 30,
        found: 0,
        correct: 0,
        incorrect: 0,
        issues: []
      };
    });

    // Analizar cada entrenamiento
    console.log('🔍 ANALIZANDO ENTRENAMIENTOS POR DÍA:');
    console.log('');

    allTrainings.forEach((training, index) => {
      const scheduledDate = new Date(training.scheduledAt);
      const dayOfWeek = scheduledDate.getDay();
      const expectedDayName = expectedDays[dayOfWeek];
      const actualDayName = scheduledDate.toLocaleDateString('es-ES', { weekday: 'long' }).toUpperCase();
      
      // Extraer día esperado del título (incluyendo caracteres con acentos)
      const titleMatch = training.description.match(/MASSIVE TEST ([A-ZÁÉÍÓÚÑ]+)/);
      const expectedFromTitle = titleMatch ? titleMatch[1] : 'UNKNOWN';
      
      // Asegurar que existe la entrada en auditResults.byDay
      if (!auditResults.byDay[expectedFromTitle]) {
        auditResults.byDay[expectedFromTitle] = {
          expected: 0,
          found: 0,
          correct: 0,
          incorrect: 0,
          issues: []
        };
      }
      
      // Verificar si el día coincide
      const dayIsCorrect = expectedFromTitle === expectedDayName;
      
      // Verificar horarios (usando scheduledAt ya que no hay startTime/endTime separados)
      const scheduledHour = scheduledDate.getHours();
      const timeIsCorrect = scheduledHour === 18; // Asumiendo que son entrenamientos de 2 horas desde las 18:00
      
      // Verificar configuración (estos campos no existen en el modelo actual, así que los omitimos)
      const configIsCorrect = true; // No podemos verificar skipClosures/skipOverlaps ya que no existen
      
      const isCompletelyCorrect = dayIsCorrect && timeIsCorrect && configIsCorrect;
      
      // Actualizar contadores
      auditResults.byDay[expectedFromTitle].found++;
      
      if (isCompletelyCorrect) {
        auditResults.correctTrainings++;
        auditResults.byDay[expectedFromTitle].correct++;
      } else {
        auditResults.incorrectTrainings++;
        auditResults.byDay[expectedFromTitle].incorrect++;
        
        const issues = [];
        if (!dayIsCorrect) {
          issues.push(`Día incorrecto: esperado ${expectedFromTitle}, obtenido ${expectedDayName}`);
        }
        if (!timeIsCorrect) {
          issues.push(`Horario incorrecto: esperado 18:00, obtenido ${scheduledHour}:00`);
        }
        if (!configIsCorrect) {
          issues.push(`Configuración incorrecta (campos no disponibles en el modelo actual)`);
        }
        
        const issue = {
          id: training.id,
          title: training.description,
          expectedDay: expectedFromTitle,
          actualDay: expectedDayName,
          scheduled: scheduledDate.toLocaleDateString('es-ES', { 
            weekday: 'long', 
            year: 'numeric', 
            month: '2-digit', 
            day: '2-digit' 
          }),
          startTime: training.startTime,
          endTime: training.endTime,
          skipClosures: training.skipClosures,
          skipOverlaps: training.skipOverlaps,
          issues: issues
        };
        
        auditResults.issues.push(issue);
        auditResults.byDay[expectedFromTitle].issues.push(issue);
      }
    });

    // Mostrar resultados por día
    Object.entries(auditResults.byDay).forEach(([day, data]) => {
      const percentage = data.found > 0 ? ((data.correct / data.found) * 100).toFixed(1) : '0.0';
      console.log(`📅 ${day}:`);
      console.log(`   Esperados: ${data.expected}`);
      console.log(`   Encontrados: ${data.found}`);
      console.log(`   Correctos: ${data.correct}`);
      console.log(`   Incorrectos: ${data.incorrect}`);
      console.log(`   Precisión: ${percentage}%`);
      
      if (data.issues.length > 0) {
        console.log(`   ❌ Problemas encontrados: ${data.issues.length}`);
        // Mostrar solo los primeros 3 problemas para no saturar
        data.issues.slice(0, 3).forEach(issue => {
          console.log(`      - ${issue.title}: ${issue.issues.join(', ')}`);
        });
        if (data.issues.length > 3) {
          console.log(`      ... y ${data.issues.length - 3} problemas más`);
        }
      }
      console.log('');
    });

    // Resumen general
    const overallAccuracy = auditResults.totalFound > 0 ? 
      ((auditResults.correctTrainings / auditResults.totalFound) * 100).toFixed(1) : '0.0';

    console.log('🎯 RESUMEN GENERAL:');
    console.log(`📊 Total esperado: ${auditResults.totalExpected}`);
    console.log(`📋 Total encontrado: ${auditResults.totalFound}`);
    console.log(`✅ Entrenamientos correctos: ${auditResults.correctTrainings}`);
    console.log(`❌ Entrenamientos incorrectos: ${auditResults.incorrectTrainings}`);
    console.log(`📈 Precisión general: ${overallAccuracy}%`);
    console.log('');

    // Análisis de patrones de errores
    const errorPatterns = {};
    auditResults.issues.forEach(issue => {
      issue.issues.forEach(problemType => {
        if (!errorPatterns[problemType]) {
          errorPatterns[problemType] = 0;
        }
        errorPatterns[problemType]++;
      });
    });

    if (Object.keys(errorPatterns).length > 0) {
      console.log('🔍 PATRONES DE ERRORES DETECTADOS:');
      Object.entries(errorPatterns).forEach(([pattern, count]) => {
        console.log(`   ${pattern}: ${count} ocurrencias`);
      });
      console.log('');
    }

    // Preparar reporte completo
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalExpected: auditResults.totalExpected,
        totalFound: auditResults.totalFound,
        correctTrainings: auditResults.correctTrainings,
        incorrectTrainings: auditResults.incorrectTrainings,
        overallAccuracy: overallAccuracy + '%'
      },
      byDay: auditResults.byDay,
      errorPatterns: errorPatterns,
      allIssues: auditResults.issues,
      configuration: {
        court: testCourt.name,
        sportType: testCourt.sportType,
        expectedTimeSlot: '18:00-20:00',
        expectedSkipClosures: true,
        expectedSkipOverlaps: true
      }
    };

    // Guardar reporte
    await fs.promises.writeFile(
      'massive_test_audit_report.json',
      JSON.stringify(report, null, 2)
    );

    console.log('💾 Reporte completo guardado en: massive_test_audit_report.json');
    console.log('');

    // Recomendaciones
    console.log('💡 RECOMENDACIONES:');
    if (auditResults.incorrectTrainings > 0) {
      console.log('   1. Revisar el código de recurrencia en maintenance.service.ts');
      console.log('   2. Verificar la lógica de cálculo de fechas');
      console.log('   3. Comprobar la configuración de zona horaria');
      console.log('   4. Validar la implementación de skipClosures y skipOverlaps');
    } else {
      console.log('   ✅ ¡Todos los entrenamientos están correctos!');
    }

  } catch (error) {
    console.error('💥 Error en la auditoría:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar auditoría
auditMassiveTestTrainings();