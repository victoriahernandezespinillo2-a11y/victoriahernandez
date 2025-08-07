const bcryptjs = require('bcryptjs');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: "postgresql://postgres:gYcTjJo2N7wWW8ut@db.rcknclvzxheitotnhmhn.supabase.co:5432/postgres",
  ssl: {
    rejectUnauthorized: false
  }
});

async function testPassword() {
  try {
    console.log('🔐 Probando validación de contraseña...');
    
    const client = await pool.connect();
    
    // Obtener el usuario y su contraseña hasheada
    const userResult = await client.query(
      'SELECT email, password FROM users WHERE email = $1',
      ['test@gmail.com']
    );
    
    if (userResult.rows.length === 0) {
      console.log('❌ Usuario no encontrado');
      return;
    }
    
    const user = userResult.rows[0];
    console.log('✅ Usuario encontrado:', user.email);
    console.log('🔑 Hash de contraseña:', user.password.substring(0, 20) + '...');
    
    // Probar diferentes contraseñas
    const testPasswords = ['admin123', '123456', 'password', 'test123', 'admin', 'arturo123', 'nieve123'];
    
    for (const testPassword of testPasswords) {
      try {
        const isValid = await bcryptjs.compare(testPassword, user.password);
        console.log(`🔐 Contraseña '${testPassword}': ${isValid ? '✅ VÁLIDA' : '❌ INVÁLIDA'}`);
        
        if (isValid) {
          console.log(`🎉 ¡Contraseña correcta encontrada: '${testPassword}'!`);
          break;
        }
      } catch (error) {
        console.log(`❌ Error probando '${testPassword}':`, error.message);
      }
    }
    
    client.release();
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

testPassword();