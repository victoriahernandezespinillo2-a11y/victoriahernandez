import { db } from './src/index.js';

async function checkDatabase() {
  try {
    console.log('🔍 Verificando base de datos de Supabase...');
    
    // Verificar conexión
    console.log('\n1. Probando conexión...');
    await db.$queryRaw`SELECT 1 as test`;
    console.log('✅ Conexión exitosa');
    
    // Verificar tablas existentes
    console.log('\n2. Verificando tablas existentes...');
    const tables = await db.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `;
    
    console.log('📋 Tablas encontradas:');
    tables.forEach((table, index) => {
      console.log(`   ${index + 1}. ${table.table_name}`);
    });
    
    // Verificar usuarios usando consulta directa
    console.log('\n3. Verificando usuarios registrados...');
    try {
      const users = await db.$queryRaw`SELECT id, email, name, role, created_at FROM users ORDER BY created_at DESC`;
      console.log(`📊 Total de usuarios: ${users.length}`);
      
      if (users.length > 0) {
        console.log('\n👥 Usuarios encontrados:');
        users.forEach((user, index) => {
          console.log(`   ${index + 1}. ${user.email} (${user.role}) - ${user.created_at}`);
        });
      } else {
        console.log('⚠️  No hay usuarios registrados');
      }
    } catch (userError) {
      console.log('⚠️  Error al consultar usuarios:', userError.message);
    }
    
    // Verificar centros
    console.log('\n4. Verificando centros deportivos...');
    try {
      const centers = await db.$queryRaw`SELECT id, name, address FROM centers`;
      console.log(`🏢 Total de centros: ${centers.length}`);
      if (centers.length > 0) {
        centers.forEach((center, index) => {
          console.log(`   ${index + 1}. ${center.name} - ${center.address || 'Sin dirección'}`);
        });
      }
    } catch (centerError) {
      console.log('⚠️  Error al consultar centros:', centerError.message);
    }
    
    // Verificar canchas
    console.log('\n5. Verificando canchas...');
    try {
      const courts = await db.$queryRaw`SELECT id, name, sport_type FROM courts`;
      console.log(`🏀 Total de canchas: ${courts.length}`);
      if (courts.length > 0) {
        courts.forEach((court, index) => {
          console.log(`   ${index + 1}. ${court.name} (${court.sport_type})`);
        });
      }
    } catch (courtError) {
      console.log('⚠️  Error al consultar canchas:', courtError.message);
    }
    
    // Verificar reservas
    console.log('\n6. Verificando reservas...');
    try {
      const reservations = await db.$queryRaw`SELECT COUNT(*) as count FROM reservations`;
      console.log(`📅 Total de reservas: ${reservations[0].count}`);
    } catch (reservationError) {
      console.log('⚠️  Error al consultar reservas:', reservationError.message);
    }
    
    // Verificar torneos
    console.log('\n7. Verificando torneos...');
    try {
      const tournaments = await db.$queryRaw`SELECT COUNT(*) as count FROM tournaments`;
      console.log(`🏆 Total de torneos: ${tournaments[0].count}`);
    } catch (tournamentError) {
      console.log('⚠️  Error al consultar torneos:', tournamentError.message);
    }
    
    console.log('\n✅ Verificación completada');
    
  } catch (error) {
    console.error('❌ Error verificando base de datos:', error);
    if (error.code) {
      console.error('Código de error:', error.code);
    }
    if (error.message) {
      console.error('Mensaje:', error.message);
    }
  } finally {
    await db.$disconnect();
  }
}

checkDatabase();