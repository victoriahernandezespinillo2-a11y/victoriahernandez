// Script para probar la API de canchas y verificar los precios por deporte
const testCourtAPI = async () => {
  try {
    console.log('🔍 Probando API de canchas...');
    
    const response = await fetch('http://localhost:3002/api/courts', {
      headers: {
        'Content-Type': 'application/json',
        // Necesitarás agregar headers de autenticación si es necesario
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('✅ Respuesta de API:', JSON.stringify(data, null, 2));
    
    // Buscar la cancha TEST 1 NO UTILIZAR
    const testCourt = data.courts?.find(court => court.name === 'TEST 1 NO UTILIZAR');
    
    if (testCourt) {
      console.log('🎯 Cancha TEST 1 NO UTILIZAR encontrada:');
      console.log('- ID:', testCourt.id);
      console.log('- Es multiuso:', testCourt.isMultiuse);
      console.log('- Deportes permitidos:', testCourt.allowedSports);
      console.log('- Precio base:', testCourt.pricePerHour);
      console.log('- Precios por deporte:', testCourt.sportPricing);
      
      if (testCourt.sportPricing) {
        Object.entries(testCourt.sportPricing).forEach(([sport, price]) => {
          console.log(`  - ${sport}: €${price}/hora`);
        });
      }
    } else {
      console.log('❌ Cancha TEST 1 NO UTILIZAR no encontrada');
    }
    
  } catch (error) {
    console.error('❌ Error probando API:', error);
  }
};

// Ejecutar si se llama directamente
if (typeof window !== 'undefined') {
  testCourtAPI();
} else {
  console.log('Este script debe ejecutarse en el navegador o con fetch disponible');
}
