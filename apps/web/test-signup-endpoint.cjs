const fetch = require('node-fetch');

async function testSignupEndpoint() {
  try {
    console.log('🧪 Probando endpoint de signup...');
    
    const userData = {
      firstName: 'Test',
      lastName: 'Endpoint',
      email: `test-endpoint-${Date.now()}@example.com`,
      password: 'test123456',
      phone: '+1234567890',
      acceptTerms: true
    };
    
    console.log('📝 Datos a enviar:', userData);
    
    console.log('\n📡 Enviando petición POST a /api/auth/signup...');
    
    const response = await fetch('http://localhost:3001/api/auth/signup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData)
    });
    
    console.log('📊 Status de respuesta:', response.status);
    console.log('📊 Status text:', response.statusText);
    
    const responseText = await response.text();
    console.log('\n📄 Respuesta completa:');
    console.log(responseText);
    
    if (response.ok) {
      console.log('\n✅ ¡Registro exitoso!');
      try {
        const jsonResponse = JSON.parse(responseText);
        console.log('📧 Usuario creado:', jsonResponse.user);
      } catch (e) {
        console.log('⚠️ No se pudo parsear como JSON');
      }
    } else {
      console.log('\n❌ Error en el registro');
      console.log('🔍 Analizando error...');
      
      try {
        const errorResponse = JSON.parse(responseText);
        console.log('📄 Error JSON:', errorResponse);
      } catch (e) {
        console.log('📄 Error como texto:', responseText);
      }
    }
    
  } catch (error) {
    console.error('\n❌ ERROR EN PRUEBA DE ENDPOINT:');
    console.error('Tipo:', typeof error);
    console.error('Mensaje:', error.message);
    console.error('Stack:', error.stack);
  }
}

testSignupEndpoint();