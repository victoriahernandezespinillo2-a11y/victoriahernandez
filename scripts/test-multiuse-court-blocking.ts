/**
 * Script de prueba simplificado para verificar las reglas de bloqueo de canchas multiuso
 * 
 * Este script usa el API HTTP directamente en lugar de Prisma
 * 
 * Cancha: TEST 1 NO UTILIZAR
 * - Deporte Principal: FÚTBOL
 * - Deportes Permitidos: VOLEIBOL, BÁSKET
 * 
 * Reglas esperadas:
 * 1. FÚTBOL bloquea VOLEIBOL y BÁSKET
 * 2. VOLEIBOL bloquea FÚTBOL pero permite BÁSKET
 * 3. BÁSKET bloquea FÚTBOL pero permite VOLEIBOL
 * 4. VOLEIBOL + VOLEIBOL = Permitido
 * 5. BÁSKET + BÁSKET = Permitido
 * 6. VOLEIBOL + BÁSKET = Permitido
 */

interface TestScenario {
    name: string;
    firstReservation: {
        sport: string;
        user: string;
    };
    secondReservation: {
        sport: string;
        user: string;
    };
    expectedResult: 'PERMITIDO' | 'BLOQUEADO';
    reason: string;
}

const TEST_SCENARIOS: TestScenario[] = [
    {
        name: 'Escenario 1: FÚTBOL bloquea VOLEIBOL',
        firstReservation: { sport: 'FÚTBOL', user: 'Usuario 1' },
        secondReservation: { sport: 'VOLEIBOL', user: 'Usuario 2' },
        expectedResult: 'BLOQUEADO',
        reason: 'El deporte principal (FÚTBOL) bloquea todos los demás deportes'
    },
    {
        name: 'Escenario 2: FÚTBOL bloquea BÁSKET',
        firstReservation: { sport: 'FÚTBOL', user: 'Usuario 1' },
        secondReservation: { sport: 'BÁSKET', user: 'Usuario 2' },
        expectedResult: 'BLOQUEADO',
        reason: 'El deporte principal (FÚTBOL) bloquea todos los demás deportes'
    },
    {
        name: 'Escenario 3: VOLEIBOL bloquea FÚTBOL',
        firstReservation: { sport: 'VOLEIBOL', user: 'Usuario 1' },
        secondReservation: { sport: 'FÚTBOL', user: 'Usuario 2' },
        expectedResult: 'BLOQUEADO',
        reason: 'Un deporte secundario bloquea el deporte principal'
    },
    {
        name: 'Escenario 4: BÁSKET bloquea FÚTBOL',
        firstReservation: { sport: 'BÁSKET', user: 'Usuario 1' },
        secondReservation: { sport: 'FÚTBOL', user: 'Usuario 2' },
        expectedResult: 'BLOQUEADO',
        reason: 'Un deporte secundario bloquea el deporte principal'
    },
    {
        name: 'Escenario 5: VOLEIBOL permite BÁSKET',
        firstReservation: { sport: 'VOLEIBOL', user: 'Usuario 1' },
        secondReservation: { sport: 'BÁSKET', user: 'Usuario 2' },
        expectedResult: 'PERMITIDO',
        reason: 'Dos deportes secundarios pueden coexistir'
    },
    {
        name: 'Escenario 6: BÁSKET permite VOLEIBOL',
        firstReservation: { sport: 'BÁSKET', user: 'Usuario 1' },
        secondReservation: { sport: 'VOLEIBOL', user: 'Usuario 2' },
        expectedResult: 'PERMITIDO',
        reason: 'Dos deportes secundarios pueden coexistir'
    },
    {
        name: 'Escenario 7: VOLEIBOL permite VOLEIBOL',
        firstReservation: { sport: 'VOLEIBOL', user: 'Usuario 1' },
        secondReservation: { sport: 'VOLEIBOL', user: 'Usuario 2' },
        expectedResult: 'PERMITIDO',
        reason: 'Múltiples reservas del mismo deporte secundario pueden coexistir'
    },
    {
        name: 'Escenario 8: BÁSKET permite BÁSKET',
        firstReservation: { sport: 'BÁSKET', user: 'Usuario 1' },
        secondReservation: { sport: 'BÁSKET', user: 'Usuario 2' },
        expectedResult: 'PERMITIDO',
        reason: 'Múltiples reservas del mismo deporte secundario pueden coexistir'
    }
];

console.log('\n🧪 ========================================');
console.log('   TEST DE BLOQUEO DE CANCHA MULTIUSO');
console.log('   ========================================\n');

console.log('📋 ESCENARIOS DE PRUEBA:\n');
console.log('═'.repeat(80));

TEST_SCENARIOS.forEach((scenario, index) => {
    console.log(`\n${index + 1}. ${scenario.name}`);
    console.log(`   Primera reserva: ${scenario.firstReservation.sport} (${scenario.firstReservation.user})`);
    console.log(`   Segunda reserva: ${scenario.secondReservation.sport} (${scenario.secondReservation.user})`);
    console.log(`   Resultado esperado: ${scenario.expectedResult}`);
    console.log(`   Razón: ${scenario.reason}`);
    console.log('─'.repeat(80));
});

console.log('\n\n📝 INSTRUCCIONES PARA PRUEBA MANUAL:\n');
console.log('1. Asegúrate de que el servidor de desarrollo esté corriendo (pnpm run dev)');
console.log('2. Abre el navegador en http://localhost:3000');
console.log('3. Inicia sesión con dos usuarios diferentes en dos navegadores/pestañas privadas');
console.log('4. Para cada escenario:');
console.log('   a. Con el Usuario 1, crea una reserva en "TEST 1 NO UTILIZAR"');
console.log('      - Selecciona el deporte indicado en "Primera reserva"');
console.log('      - Elige una fecha y hora (ej: mañana a las 10:00)');
console.log('   b. Con el Usuario 2, intenta crear una reserva en la MISMA cancha');
console.log('      - Selecciona el deporte indicado en "Segunda reserva"');
console.log('      - Usa la MISMA fecha y hora que el Usuario 1');
console.log('   c. Verifica el resultado:');
console.log('      - Si es PERMITIDO: Deberías poder completar la reserva');
console.log('      - Si es BLOQUEADO: Deberías ver un mensaje de error');
console.log('\n5. Anota los resultados y compáralos con los esperados\n');

console.log('\n💡 TIPS:\n');
console.log('- Puedes ver los logs del servidor para ver la lógica de multiuso en acción');
console.log('- Busca logs que digan "[MULTIUSE-CHECK]" y "[MULTIUSE-DEBUG]"');
console.log('- Elimina las reservas de prueba después de cada escenario\n');

console.log('\n✅ Script de documentación completado\n');
