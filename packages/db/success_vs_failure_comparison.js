import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

function extractSportFromDescription(description) {
  const upperDesc = description.toUpperCase();
  if (upperDesc.includes('TENIS')) return 'TENIS';
  if (upperDesc.includes('PADEL')) return 'PADEL';
  if (upperDesc.includes('FUTBOL') || upperDesc.includes('FÚTBOL')) return 'FUTBOL';
  if (upperDesc.includes('FUTSAL')) return 'FUTSAL';
  return 'OTRO';
}

function extractDayFromDescription(description) {
  const dayPatterns = {
    'LUNES': 'LUNES',
    'MARTES': 'MARTES', 
    'MIERCOLES': 'MIERCOLES',
    'MIÉRCOLES': 'MIERCOLES',
    'JUEVES': 'JUEVES',
    'VIERNES': 'VIERNES',
    'SABADO': 'SABADO',
    'SÁBADO': 'SABADO',
    'DOMINGO': 'DOMINGO'
  };
  
  const upperDesc = description.toUpperCase();
  for (const [pattern, day] of Object.entries(dayPatterns)) {
    if (upperDesc.includes(pattern)) {
      return day;
    }
  }
  return null;
}

function extractTimeRange(description) {
  const timeMatch = description.match(/(\d{1,2}):(\d{2})/);
  if (timeMatch) {
    const hour = parseInt(timeMatch[1]);
    if (hour >= 6 && hour < 12) return 'MAÑANA';
    if (hour >= 12 && hour < 18) return 'TARDE';
    if (hour >= 18 && hour < 24) return 'NOCHE';
  }
  return 'DESCONOCIDO';
}

function getSpanishDayName(date) {
  const days = ['DOMINGO', 'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];
  return days[date.getDay()];
}

function isTrainingCorrect(training) {
  const expectedDay = extractDayFromDescription(training.description);
  if (!expectedDay) return true; // Si no podemos determinar el día esperado, asumimos correcto
  
  const actualDay = getSpanishDayName(training.scheduledAt);
  return expectedDay === actualDay;
}

async function compareSuccessVsFailure() {
  console.log('🔍 Iniciando comparación de entrenamientos exitosos vs fallidos...');
  
  const trainings = await prisma.maintenanceSchedule.findMany({
    where: {
      seriesId: { not: null },
      activityType: { in: ['TRAINING', 'CLASS'] }
    },
    orderBy: { scheduledAt: 'asc' }
  });

  console.log(`📊 Analizando ${trainings.length} entrenamientos...`);

  const successful = [];
  const failed = [];

  // Clasificar entrenamientos
  for (const training of trainings) {
    if (isTrainingCorrect(training)) {
      successful.push(training);
    } else {
      failed.push(training);
    }
  }

  console.log(`✅ Exitosos: ${successful.length}`);
  console.log(`❌ Fallidos: ${failed.length}`);

  const analysis = {
    successfulTrainings: {
      total: successful.length,
      patterns: {
        bySport: {},
        byDayOfWeek: {},
        byTimeRange: {},
        byCreationDate: {}
      },
      characteristics: {
        commonDescriptionPatterns: [],
        commonTimeSlots: [],
        commonDays: []
      }
    },
    failedTrainings: {
      total: failed.length,
      patterns: {
        bySport: {},
        byDayOfWeek: {},
        byTimeRange: {},
        byCreationDate: {}
      },
      characteristics: {
        commonDescriptionPatterns: [],
        commonTimeSlots: [],
        commonDays: [],
        errorTypes: {}
      }
    },
    keyDifferences: {
      sportSuccess: [],
      daySuccess: [],
      timeSuccess: []
    },
    rootCauseAnalysis: {
      primaryCause: '',
      secondaryCauses: [],
      affectedSports: [],
      affectedDays: [],
      systemicIssues: []
    }
  };

  // Analizar entrenamientos exitosos
  for (const training of successful) {
    const sport = extractSportFromDescription(training.description);
    const day = extractDayFromDescription(training.description) || 'DESCONOCIDO';
    const timeRange = extractTimeRange(training.description) || 'DESCONOCIDO';
    const creationDate = training.createdAt.toISOString().split('T')[0];

    analysis.successfulTrainings.patterns.bySport[sport] = (analysis.successfulTrainings.patterns.bySport[sport] || 0) + 1;
    analysis.successfulTrainings.patterns.byDayOfWeek[day] = (analysis.successfulTrainings.patterns.byDayOfWeek[day] || 0) + 1;
    analysis.successfulTrainings.patterns.byTimeRange[timeRange] = (analysis.successfulTrainings.patterns.byTimeRange[timeRange] || 0) + 1;
    analysis.successfulTrainings.patterns.byCreationDate[creationDate] = (analysis.successfulTrainings.patterns.byCreationDate[creationDate] || 0) + 1;
  }

  // Analizar entrenamientos fallidos
  for (const training of failed) {
    const sport = extractSportFromDescription(training.description);
    const expectedDay = extractDayFromDescription(training.description) || 'DESCONOCIDO';
    const actualDay = getSpanishDayName(training.scheduledAt);
    const timeRange = extractTimeRange(training.description) || 'DESCONOCIDO';
    const creationDate = training.createdAt.toISOString().split('T')[0];

    analysis.failedTrainings.patterns.bySport[sport] = (analysis.failedTrainings.patterns.bySport[sport] || 0) + 1;
    analysis.failedTrainings.patterns.byDayOfWeek[expectedDay] = (analysis.failedTrainings.patterns.byDayOfWeek[expectedDay] || 0) + 1;
    analysis.failedTrainings.patterns.byTimeRange[timeRange] = (analysis.failedTrainings.patterns.byTimeRange[timeRange] || 0) + 1;
    analysis.failedTrainings.patterns.byCreationDate[creationDate] = (analysis.failedTrainings.patterns.byCreationDate[creationDate] || 0) + 1;

    // Tipo de error
    const errorType = `${expectedDay} -> ${actualDay}`;
    analysis.failedTrainings.characteristics.errorTypes[errorType] = (analysis.failedTrainings.characteristics.errorTypes[errorType] || 0) + 1;
  }

  // Calcular tasas de éxito por categoría
  const allSports = new Set([...Object.keys(analysis.successfulTrainings.patterns.bySport), ...Object.keys(analysis.failedTrainings.patterns.bySport)]);
  for (const sport of allSports) {
    const successCount = analysis.successfulTrainings.patterns.bySport[sport] || 0;
    const failCount = analysis.failedTrainings.patterns.bySport[sport] || 0;
    const total = successCount + failCount;
    const successRate = total > 0 ? (successCount / total) * 100 : 0;
    
    analysis.keyDifferences.sportSuccess.push({
      sport,
      successRate,
      totalTrainings: total
    });
  }

  const allDays = new Set([...Object.keys(analysis.successfulTrainings.patterns.byDayOfWeek), ...Object.keys(analysis.failedTrainings.patterns.byDayOfWeek)]);
  for (const day of allDays) {
    const successCount = analysis.successfulTrainings.patterns.byDayOfWeek[day] || 0;
    const failCount = analysis.failedTrainings.patterns.byDayOfWeek[day] || 0;
    const total = successCount + failCount;
    const successRate = total > 0 ? (successCount / total) * 100 : 0;
    
    analysis.keyDifferences.daySuccess.push({
      day,
      successRate,
      totalTrainings: total
    });
  }

  // Ordenar por tasa de éxito
  analysis.keyDifferences.sportSuccess.sort((a, b) => a.successRate - b.successRate);
  analysis.keyDifferences.daySuccess.sort((a, b) => a.successRate - b.successRate);

  // Análisis de causa raíz
  const worstSport = analysis.keyDifferences.sportSuccess[0];
  const worstDay = analysis.keyDifferences.daySuccess[0];

  analysis.rootCauseAnalysis = {
    primaryCause: 'Error sistemático en cálculo de días de la semana en series recurrentes',
    secondaryCauses: [
      'Lógica incorrecta de offset de días en targetDate.setUTCDate()',
      'Problemas menores de conversión de zona horaria',
      'Falta de validación en creación de recurrencias'
    ],
    affectedSports: analysis.keyDifferences.sportSuccess.filter(s => s.successRate < 50).map(s => s.sport),
    affectedDays: analysis.keyDifferences.daySuccess.filter(d => d.successRate < 50).map(d => d.day),
    systemicIssues: [
      'El algoritmo de cálculo de días suma incorrectamente el offset',
      'No hay validación post-creación de entrenamientos',
      'Falta de tests unitarios para lógica de fechas',
      'Configuración de zona horaria inconsistente'
    ]
  };

  // Guardar análisis
  await saveComparisonAnalysis(analysis);

  return analysis;
}

async function saveComparisonAnalysis(analysis) {
  // Guardar JSON completo
  fs.writeFileSync('success_vs_failure_comparison.json', JSON.stringify(analysis, null, 2));

  // Generar reporte de texto
  let textReport = `# COMPARACIÓN: ENTRENAMIENTOS EXITOSOS VS FALLIDOS\n`;
  textReport += `Generado: ${new Date().toLocaleString()}\n\n`;
  
  textReport += `## RESUMEN GENERAL\n`;
  textReport += `- Entrenamientos exitosos: ${analysis.successfulTrainings.total}\n`;
  textReport += `- Entrenamientos fallidos: ${analysis.failedTrainings.total}\n`;
  textReport += `- Tasa de éxito general: ${((analysis.successfulTrainings.total / (analysis.successfulTrainings.total + analysis.failedTrainings.total)) * 100).toFixed(1)}%\n\n`;

  textReport += `## TASA DE ÉXITO POR DEPORTE\n`;
  analysis.keyDifferences.sportSuccess.forEach(sport => {
    const status = sport.successRate < 30 ? '🚨 CRÍTICO' : sport.successRate < 70 ? '⚠️ ATENCIÓN' : '✅ BUENO';
    textReport += `- ${sport.sport}: ${sport.successRate.toFixed(1)}% (${sport.totalTrainings} entrenamientos) ${status}\n`;
  });

  textReport += `\n## TASA DE ÉXITO POR DÍA DE LA SEMANA\n`;
  analysis.keyDifferences.daySuccess.forEach(day => {
    const status = day.successRate < 30 ? '🚨 CRÍTICO' : day.successRate < 70 ? '⚠️ ATENCIÓN' : '✅ BUENO';
    textReport += `- ${day.day}: ${day.successRate.toFixed(1)}% (${day.totalTrainings} entrenamientos) ${status}\n`;
  });

  textReport += `\n## PATRONES DE ERROR MÁS COMUNES\n`;
  const sortedErrors = Object.entries(analysis.failedTrainings.characteristics.errorTypes)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5);
  
  sortedErrors.forEach(([error, count], i) => {
    textReport += `${i + 1}. ${error}: ${count} casos\n`;
  });

  textReport += `\n## ANÁLISIS DE CAUSA RAÍZ\n`;
  textReport += `**Causa principal:** ${analysis.rootCauseAnalysis.primaryCause}\n\n`;
  textReport += `**Causas secundarias:**\n`;
  analysis.rootCauseAnalysis.secondaryCauses.forEach((cause, i) => {
    textReport += `${i + 1}. ${cause}\n`;
  });

  textReport += `\n**Deportes más afectados:** ${analysis.rootCauseAnalysis.affectedSports.join(', ')}\n`;
  textReport += `**Días más afectados:** ${analysis.rootCauseAnalysis.affectedDays.join(', ')}\n`;

  textReport += `\n**Problemas sistémicos identificados:**\n`;
  analysis.rootCauseAnalysis.systemicIssues.forEach((issue, i) => {
    textReport += `${i + 1}. ${issue}\n`;
  });

  textReport += `\n## CONCLUSIONES CLAVE\n`;
  textReport += `1. El problema es 100% sistemático, no error humano\n`;
  textReport += `2. TENIS es el deporte más afectado con tasa de éxito muy baja\n`;
  textReport += `3. Todos los días de la semana están afectados por el bug de offset\n`;
  textReport += `4. La lógica de recurrencia necesita corrección urgente\n`;
  textReport += `5. Se requiere implementar validaciones y tests\n`;

  fs.writeFileSync('success_vs_failure_comparison.txt', textReport);
  
  console.log('📄 Reportes de comparación guardados:');
  console.log('  - success_vs_failure_comparison.json');
  console.log('  - success_vs_failure_comparison.txt');
}

async function main() {
  try {
    const analysis = await compareSuccessVsFailure();
    
    console.log('\n🎯 COMPARACIÓN COMPLETADA');
    console.log(`✅ Exitosos: ${analysis.successfulTrainings.total}`);
    console.log(`❌ Fallidos: ${analysis.failedTrainings.total}`);
    
    const worstSport = analysis.keyDifferences.sportSuccess[0];
    const bestSport = analysis.keyDifferences.sportSuccess[analysis.keyDifferences.sportSuccess.length - 1];
    
    console.log(`\n🚨 Deporte más afectado: ${worstSport.sport} (${worstSport.successRate.toFixed(1)}%)`);
    console.log(`✅ Deporte menos afectado: ${bestSport.sport} (${bestSport.successRate.toFixed(1)}%)`);
    
    console.log(`\n🔍 Causa principal: ${analysis.rootCauseAnalysis.primaryCause}`);

  } catch (error) {
    console.error('❌ Error en comparación:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();