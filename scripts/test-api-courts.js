// Script simple para probar la API de canchas
const fetch = require('node-fetch');

async function testCourtsAPI() {
  console.log('🔍 Probando API de canchas...\n');

  try {
    // Probar endpoint de canchas
    const response = await fetch('http://localhost:3002/api/courts');
    
    if (!response.ok) {
      console.error(`❌ Error HTTP: ${response.status} ${response.statusText}`);
      return;
    }

    const data = await response.json();
    console.log('✅ API responde correctamente');
    
    // Buscar la cancha TEST 1 NO UTILIZAR
    const testCourt = data.find(court => court.name.includes('TEST 1'));
    
    if (!testCourt) {
      console.error('❌ No se encontró la cancha TEST 1 NO UTILIZAR');
      console.log('Canchas disponibles:', data.map(c => c.name));
      return;
    }

    console.log('\n📊 Cancha TEST 1 NO UTILIZAR:');
    console.log(`   ID: ${testCourt.id}`);
    console.log(`   Nombre: ${testCourt.name}`);
    console.log(`   Es multiuso: ${testCourt.isMultiuse}`);
    console.log(`   Deportes permitidos: ${JSON.stringify(testCourt.allowedSports)}`);
    console.log(`   Precio base: €${testCourt.pricePerHour}`);
    console.log(`   Precios por deporte:`, testCourt.sportPricing);

    if (!testCourt.sportPricing || Object.keys(testCourt.sportPricing).length === 0) {
      console.log('\n❌ La cancha no tiene precios por deporte configurados');
      console.log('💡 Esto explica por qué no aparecen los precios dinámicos');
    } else {
      console.log('\n✅ La cancha tiene precios por deporte configurados');
      Object.entries(testCourt.sportPricing).forEach(([sport, price]) => {
        console.log(`   ${sport}: €${price}/hora`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testCourtsAPI();
