import { db } from './src/index';

async function checkOrdersStructure() {
  try {
    console.log('🔍 Verificando estructura de la tabla orders...');
    
    // Intentar hacer una consulta simple para ver qué columnas existen
    const result = await db.$queryRaw`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'orders' 
      AND table_schema = 'public'
      ORDER BY ordinal_position;
    `;
    
    console.log('📋 Columnas existentes en la tabla orders:');
    console.log(JSON.stringify(result, null, 2));
    
    // Intentar hacer una consulta básica para ver si funciona
    const count = await db.order.count();
    console.log(`\n📊 Total de órdenes en la base de datos: ${count}`);
    
  } catch (error) {
    console.error('❌ Error verificando estructura:', error);
    
    // Si falla, intentar ver qué error específico da
    try {
      await db.$queryRaw`SELECT 1`;
      console.log('✅ Conexión a la base de datos funciona');
    } catch (dbError) {
      console.error('❌ Error de conexión a la base de datos:', dbError);
    }
  } finally {
    await db.$disconnect();
  }
}

checkOrdersStructure();


