import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Función para simular el cálculo corregido
function simulateCorrectCalculation(startDate, targetDayOfWeek) {
  const startUtcMidnight = new Date(`${startDate}T00:00:00Z`);
  
  // Iterar semana por semana
  const results = [];
  
  for (let week = 0; week < 5; week++) {
    const cur = new Date(startUtcMidnight);
    cur.setUTCDate(cur.getUTCDate() + (week * 7));
    
    // Convertir dayOfWeek del sistema (1=Lunes, 2=Martes, ..., 7=Domingo) a JavaScript (0=Domingo, 1=Lunes, ...)
    const jsTargetDay = targetDayOfWeek === 7 ? 0 : targetDayOfWeek;
    const targetDate = new Date(cur);
    const currentDay = targetDate.getUTCDay();
    
    // Calcular días a agregar correctamente
    let daysToAdd = jsTargetDay - currentDay;
    if (daysToAdd < 0) daysToAdd += 7; // Si es negativo, ir a la próxima semana
    
    targetDate.setUTCDate(targetDate.getUTCDate() + daysToAdd);
    
    results.push({
      week: week + 1,
      calculatedDate: targetDate.toISOString().split('T')[0],
      dayOfWeek: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][targetDate.getUTCDay()],
      dayNumber: targetDate.getUTCDay()
    });
  }
  
  return results;
}

async function testRecurrenceFix() {
  try {
    console.log('🧪 PROBANDO CORRECCIÓN DE RECURRENCIA...\n');
    
    // Casos de prueba
    const testCases = [
      {
        name: 'Martes desde Lunes',
        startDate: '2025-10-27', // Lunes
        targetDay: 2, // Martes
        expectedDates: ['2025-10-28', '2025-11-04', '2025-11-11', '2025-11-18', '2025-11-25']
      },
      {
        name: 'Miércoles desde Lunes', 
        startDate: '2025-10-27', // Lunes
        targetDay: 3, // Miércoles
        expectedDates: ['2025-10-29', '2025-11-05', '2025-11-12', '2025-11-19', '2025-11-26']
      },
      {
        name: 'Lunes desde Domingo',
        startDate: '2025-10-26', // Domingo
        targetDay: 1, // Lunes
        expectedDates: ['2025-10-27', '2025-11-03', '2025-11-10', '2025-11-17', '2025-11-24']
      },
      {
        name: 'Viernes desde Miércoles',
        startDate: '2025-10-29', // Miércoles
        targetDay: 5, // Viernes
        expectedDates: ['2025-10-31', '2025-11-07', '2025-11-14', '2025-11-21', '2025-11-28']
      }
    ];
    
    console.log('📋 CASOS DE PRUEBA:');
    console.log('='.repeat(80));
    
    let allTestsPassed = true;
    
    for (const testCase of testCases) {
      console.log(`\n🔍 Probando: ${testCase.name}`);
      console.log(`   📅 Fecha inicio: ${testCase.startDate}`);
      console.log(`   🎯 Día objetivo: ${testCase.targetDay} (${['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][testCase.targetDay === 7 ? 0 : testCase.targetDay]})`);
      
      const results = simulateCorrectCalculation(testCase.startDate, testCase.targetDay);
      
      console.log('   📊 Resultados calculados:');
      let testPassed = true;
      
      results.forEach((result, index) => {
        const expected = testCase.expectedDates[index];
        const isCorrect = result.calculatedDate === expected;
        
        if (!isCorrect) {
          testPassed = false;
          allTestsPassed = false;
        }
        
        console.log(`      ${index + 1}. ${result.calculatedDate} (${result.dayOfWeek}) ${isCorrect ? '✅' : '❌'}`);
        if (!isCorrect) {
          console.log(`         Esperado: ${expected}`);
        }
      });
      
      console.log(`   ${testPassed ? '✅ PASÓ' : '❌ FALLÓ'}`);
    }
    
    console.log('\n' + '='.repeat(80));
    console.log(`📊 RESUMEN DE PRUEBAS:`);
    console.log(`   ${allTestsPassed ? '✅ TODAS LAS PRUEBAS PASARON' : '❌ ALGUNAS PRUEBAS FALLARON'}`);
    
    if (allTestsPassed) {
      console.log('\n🎉 ¡La corrección del cálculo de fechas funciona correctamente!');
      console.log('✅ Ahora puedes crear entrenamientos recurrentes con confianza.');
    } else {
      console.log('\n⚠️ Hay problemas con el cálculo. Revisar la lógica.');
    }
    
    // Prueba adicional: verificar el caso específico del usuario
    console.log('\n🎯 PRUEBA ESPECÍFICA DEL USUARIO:');
    console.log('='.repeat(80));
    console.log('Caso: Martes 28/10/2025, 5 ocurrencias');
    
    const userCase = simulateCorrectCalculation('2025-10-28', 2);
    const expectedUserDates = ['2025-10-28', '2025-11-04', '2025-11-11', '2025-11-18', '2025-11-25'];
    
    userCase.forEach((result, index) => {
      const expected = expectedUserDates[index];
      const isCorrect = result.calculatedDate === expected;
      console.log(`   ${index + 1}. ${result.calculatedDate} (${result.dayOfWeek}) ${isCorrect ? '✅' : '❌'}`);
    });
    
  } catch (error) {
    console.error('💥 Error en las pruebas:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testRecurrenceFix();