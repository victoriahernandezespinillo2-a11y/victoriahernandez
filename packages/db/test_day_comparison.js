// Script para debuggear la comparación de días

const testDate = new Date('2025-10-28T17:00:00.000Z'); // Martes 28 de octubre 2025

console.log('🔍 DEBUGGEANDO COMPARACIÓN DE DÍAS\n');

console.log(`📅 Fecha de prueba: ${testDate.toLocaleString()}`);
console.log(`📅 Día de la semana (getDay()): ${testDate.getDay()}`); // 0=Domingo, 1=Lunes, 2=Martes, etc.

// Array de días esperados (como está en el script original)
const expectedDays = ['DOMINGO', 'LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO'];

const dayOfWeek = testDate.getDay();
const expectedDayName = expectedDays[dayOfWeek];

console.log(`📅 Día esperado según getDay(): ${expectedDayName}`);

// Obtener día actual en español
const actualDayName = testDate.toLocaleDateString('es-ES', { weekday: 'long' }).toUpperCase();
console.log(`📅 Día actual en español: ${actualDayName}`);

// Simular extracción del título
const testTitle = "MASSIVE TEST MARTES #1 - Entrenamiento masivo";
const titleMatch = testTitle.match(/MASSIVE TEST (\w+)/);
const expectedFromTitle = titleMatch ? titleMatch[1] : 'UNKNOWN';

console.log(`📅 Día extraído del título: ${expectedFromTitle}`);

// Comparaciones
console.log('\n🔍 COMPARACIONES:');
console.log(`expectedFromTitle === expectedDayName: ${expectedFromTitle === expectedDayName}`);
console.log(`expectedFromTitle === actualDayName: ${expectedFromTitle === actualDayName}`);

console.log('\n📊 RESUMEN:');
console.log(`- Fecha: ${testDate.toLocaleDateString()}`);
console.log(`- getDay(): ${dayOfWeek} (${expectedDayName})`);
console.log(`- Día en español: ${actualDayName}`);
console.log(`- Día del título: ${expectedFromTitle}`);
console.log(`- ¿Coincide título con día real?: ${expectedFromTitle === expectedDayName}`);