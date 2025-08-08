// Script para limpiar todos los datos de la base de datos
import { db } from './src/index.js';

async function cleanDatabase() {
  console.log('🧹 Limpiando base de datos de Supabase...');
  console.log('⚠️  ADVERTENCIA: Esto eliminará TODOS los datos');
  
  try {
    console.log('\n1. Eliminando datos en orden correcto...');
    
    // Eliminar datos en orden correcto para evitar errores de foreign key
    console.log('   - Eliminando listas de espera...');
    await db.waitingList.deleteMany();
    
    console.log('   - Eliminando participantes de torneos...');
    await db.tournamentUser.deleteMany();
    
    console.log('   - Eliminando torneos...');
    await db.tournament.deleteMany();
    
    console.log('   - Eliminando membresías...');
    await db.membership.deleteMany();
    
    console.log('   - Eliminando reservas...');
    await db.reservation.deleteMany();
    
    console.log('   - Eliminando programación de mantenimiento...');
    await db.maintenanceSchedule.deleteMany();
    
    console.log('   - Eliminando reglas de precios...');
    await db.pricingRule.deleteMany();
    
    console.log('   - Eliminando canchas...');
    await db.court.deleteMany();
    
    console.log('   - Eliminando centros deportivos...');
    await db.center.deleteMany();
    
    console.log('   - Eliminando usuarios...');
    await db.user.deleteMany();
    
    console.log('\n2. Verificando limpieza...');
    
    // Verificar que todas las tablas estén vacías
    const tables = [
      { name: 'users', query: 'SELECT COUNT(*) as count FROM users' },
      { name: 'centers', query: 'SELECT COUNT(*) as count FROM centers' },
      { name: 'courts', query: 'SELECT COUNT(*) as count FROM courts' },
      { name: 'reservations', query: 'SELECT COUNT(*) as count FROM reservations' },
      { name: 'tournaments', query: 'SELECT COUNT(*) as count FROM tournaments' },
      { name: 'memberships', query: 'SELECT COUNT(*) as count FROM memberships' },
      { name: 'pricing_rules', query: 'SELECT COUNT(*) as count FROM pricing_rules' },
      { name: 'maintenance_schedules', query: 'SELECT COUNT(*) as count FROM maintenance_schedules' },
      { name: 'tournament_users', query: 'SELECT COUNT(*) as count FROM tournament_users' },
      { name: 'waiting_lists', query: 'SELECT COUNT(*) as count FROM waiting_lists' }
    ];
    
    for (const table of tables) {
      try {
        const result = await db.$queryRaw`SELECT COUNT(*) as count FROM ${table.name}`;
        const count = result[0].count;
        console.log(`   ✓ ${table.name}: ${count} registros`);
      } catch (error) {
        console.log(`   ⚠️  ${table.name}: Error al verificar`);
      }
    }
    
    console.log('\n✅ Base de datos limpiada exitosamente');
    console.log('📊 La base de datos está completamente vacía y lista para datos reales');
    console.log('\n🎯 Próximos pasos:');
    console.log('   1. Agregar datos reales del polideportivo');
    console.log('   2. Crear usuarios administrativos reales');
    console.log('   3. Configurar canchas y horarios reales');
    
  } catch (error) {
    console.error('❌ Error al limpiar la base de datos:', error);
    throw error;
  } finally {
    await db.$disconnect();
  }
}

cleanDatabase()
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });