import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function analyzeRecurrenceIssue() {
  try {
    console.log('🔍 ANALIZANDO PROBLEMA DE RECURRENCIA...\n');
    
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
    
    // Buscar entrenamientos recurrentes recientes
    const recentTrainings = await prisma.maintenanceSchedule.findMany({
      where: {
        courtId: testCourt.id,
        description: 'test recurrente',
        activityType: 'TRAINING'
      },
      orderBy: {
        scheduledAt: 'asc'
      }
    });
    
    console.log(`📋 Entrenamientos recurrentes encontrados: ${recentTrainings.length}\n`);
    
    if (recentTrainings.length === 0) {
      console.log('ℹ️ No se encontraron entrenamientos recurrentes para analizar');
      return;
    }
    
    console.log('📅 ANÁLISIS DE FECHAS:');
    console.log('='.repeat(80));
    
    recentTrainings.forEach((training, index) => {
      const scheduledDate = new Date(training.scheduledAt);
      const dayOfWeek = scheduledDate.getDay(); // 0=Domingo, 1=Lunes, 2=Martes, etc.
      const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
      
      console.log(`${index + 1}. ID: ${training.id}`);
      console.log(`   📅 Fecha programada: ${scheduledDate.toLocaleDateString('es-ES')}`);
      console.log(`   🕐 Hora: ${scheduledDate.toLocaleTimeString('es-ES')}`);
      console.log(`   📆 Día de la semana: ${dayNames[dayOfWeek]} (${dayOfWeek})`);
      console.log(`   📝 Descripción: ${training.description}`);
      console.log(`   🏷️ Tipo: ${training.type} | Actividad: ${training.activityType}`);
      console.log(`   📊 Estado: ${training.status}`);
      
      // Verificar si hay un patrón de desfase
      if (index > 0) {
        const prevDate = new Date(recentTrainings[index - 1].scheduledAt);
        const daysDiff = Math.round((scheduledDate - prevDate) / (1000 * 60 * 60 * 24));
        console.log(`   📏 Días desde anterior: ${daysDiff}`);
        
        if (daysDiff !== 7) {
          console.log(`   ⚠️ ANOMALÍA: Se esperaban 7 días, pero hay ${daysDiff} días`);
        }
      }
      
      console.log('');
    });
    
    // Análisis de patrones
    console.log('🔍 ANÁLISIS DE PATRONES:');
    console.log('='.repeat(80));
    
    const expectedDates = [
      '2025-10-28', // martes, 28/10/2025
      '2025-11-04', // martes, 04/11/2025  
      '2025-11-11', // martes, 11/11/2025
      '2025-11-18', // martes, 18/11/2025
      '2025-11-25'  // martes, 25/11/2025
    ];
    
    const actualDates = recentTrainings.map(t => {
      const date = new Date(t.scheduledAt);
      return date.toISOString().split('T')[0];
    });
    
    console.log('📅 Fechas esperadas (según UI):');
    expectedDates.forEach((date, index) => {
      console.log(`   ${index + 1}. ${date}`);
    });
    
    console.log('\n📅 Fechas reales (en BD):');
    actualDates.forEach((date, index) => {
      console.log(`   ${index + 1}. ${date}`);
    });
    
    console.log('\n🔍 COMPARACIÓN:');
    expectedDates.forEach((expected, index) => {
      const actual = actualDates[index];
      if (actual) {
        const expectedDate = new Date(expected);
        const actualDate = new Date(actual);
        const daysDiff = Math.round((actualDate - expectedDate) / (1000 * 60 * 60 * 24));
        
        console.log(`   ${index + 1}. Esperado: ${expected} | Real: ${actual} | Diferencia: ${daysDiff} días`);
        
        if (daysDiff !== 0) {
          console.log(`      ⚠️ DESFASE DETECTADO: ${daysDiff > 0 ? '+' : ''}${daysDiff} días`);
        }
      }
    });
    
    // Verificar zona horaria
    console.log('\n🌍 INFORMACIÓN DE ZONA HORARIA:');
    console.log('='.repeat(80));
    const now = new Date();
    console.log(`📅 Fecha/hora actual del sistema: ${now.toLocaleString()}`);
    console.log(`🌍 Zona horaria: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`);
    console.log(`⏰ Offset UTC: ${now.getTimezoneOffset()} minutos`);
    
  } catch (error) {
    console.error('💥 Error al analizar recurrencia:', error);
  } finally {
    await prisma.$disconnect();
  }
}

analyzeRecurrenceIssue();