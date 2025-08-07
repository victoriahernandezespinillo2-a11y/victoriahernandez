const { Pool } = require('pg');

const pool = new Pool({
  connectionString: "postgresql://postgres:gYcTjJo2N7wWW8ut@db.rcknclvzxheitotnhmhn.supabase.co:5432/postgres",
  ssl: {
    rejectUnauthorized: false
  }
});

async function checkUser() {
  try {
    console.log('🔍 Verificando usuario test@gmail.com...');
    
    const client = await pool.connect();
    
    // Verificar si el usuario existe con todos los detalles
    const userResult = await client.query(
      'SELECT id, email, name, role, is_active, password, created_at FROM users WHERE email = $1',
      ['test@gmail.com']
    );
    
    if (userResult.rows.length > 0) {
      const user = userResult.rows[0];
      console.log('✅ Usuario encontrado:');
      console.log('  - ID:', user.id);
      console.log('  - Email:', user.email);
      console.log('  - Nombre:', user.name);
      console.log('  - Rol:', user.role);
      console.log('  - Activo:', user.is_active);
      console.log('  - Tiene contraseña:', user.password ? 'SÍ' : 'NO');
      console.log('  - Contraseña (primeros 20 chars):', user.password ? user.password.substring(0, 20) + '...' : 'NULL');
      console.log('  - Fecha de creación:', user.created_at);
    } else {
      console.log('❌ Usuario NO encontrado');
    }
    
    // Listar todos los usuarios
    console.log('\n📋 Todos los usuarios en la base de datos:');
    const allUsersResult = await client.query(
      'SELECT id, email, name, role, is_active, password IS NOT NULL as has_password, created_at FROM users ORDER BY created_at DESC LIMIT 10'
    );
    
    allUsersResult.rows.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.email} (${user.name}) - ${user.role} - Activo: ${user.is_active} - Contraseña: ${user.has_password ? 'SÍ' : 'NO'}`);
    });
    
    client.release();
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

checkUser();
