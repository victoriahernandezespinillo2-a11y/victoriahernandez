import { simpleClient } from './src/simple-client.js';

async function testSimpleClient() {
  try {
    console.log('ðŸ” Probando cliente Prisma simple...');
    const result = await simpleClient.$queryRaw`SELECT 1 as test`;
    console.log('âœ… Cliente simple funciona:', result);
    await simpleClient.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('âŒ Error con cliente simple:', error.message);
    if (error.code === 'P6001') {
      console.error('âŒ P6001: El problema estÃ¡ en el cliente generado, no en nuestro cÃ³digo');
    }
    process.exit(1);
  }
}

testSimpleClient();
