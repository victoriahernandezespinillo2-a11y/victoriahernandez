const http = require('http');
const https = require('https');

const services = [
  { name: 'Web App', url: 'http://localhost:3001', port: 3001 },
  { name: 'API Server', url: 'http://localhost:3002', port: 3002 },
  { name: 'Admin App', url: 'http://localhost:3003', port: 3003 }
];

async function checkService(service) {
  return new Promise((resolve) => {
    const req = http.request({
      hostname: 'localhost',
      port: service.port,
      path: '/',
      method: 'GET',
      timeout: 5000
    }, (res) => {
      resolve({
        name: service.name,
        status: '✅ Online',
        port: service.port,
        statusCode: res.statusCode
      });
    });

    req.on('error', (err) => {
      resolve({
        name: service.name,
        status: '❌ Offline',
        port: service.port,
        error: err.message
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        name: service.name,
        status: '⏰ Timeout',
        port: service.port,
        error: 'Request timeout'
      });
    });

    req.end();
  });
}

async function checkApiEndpoints() {
  const endpoints = [
    '/api/test-products',
    '/api/products',
    '/api/test-db'
  ];

  console.log('\n🔍 Verificando endpoints de la API...');
  
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`http://localhost:3002${endpoint}`);
      const data = await response.json();
      console.log(`✅ ${endpoint}: ${response.status} - ${data.success ? 'Success' : 'Error'}`);
    } catch (error) {
      console.log(`❌ ${endpoint}: Error - ${error.message}`);
    }
  }
}

async function main() {
  console.log('🔍 Verificando servicios del polideportivo...\n');
  
  const results = await Promise.all(services.map(checkService));
  
  results.forEach(result => {
    console.log(`${result.status} ${result.name} (puerto ${result.port})`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  });

  // Verificar endpoints de la API
  await checkApiEndpoints();
  
  console.log('\n📋 Resumen:');
  const onlineCount = results.filter(r => r.status.includes('✅')).length;
  console.log(`Servicios online: ${onlineCount}/${services.length}`);
  
  if (onlineCount < services.length) {
    console.log('\n💡 Para iniciar los servicios:');
    console.log('pnpm dev');
  }
}

main().catch(console.error);



