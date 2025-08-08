// Test directo con PostgreSQL sin Supabase SDK
import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';

dotenv.config({ path: '../../.env' });

const databaseUrl = process.env.DATABASE_URL;

console.log('🔍 PROBANDO CONEXIÓN DIRECTA A POSTGRESQL...');
console.log('');
console.log('DATABASE_URL:', databaseUrl?.replace(/:[^:@]*@/, ':***@'));
console.log('');

if (!databaseUrl) {
  console.error('❌ DATABASE_URL no encontrada en .env');
  process.exit(1);
}

const client = new Client({
  connectionString: databaseUrl,
  ssl: {
    rejectUnauthorized: false
  }
});

async function testDirectConnection() {
  try {
    console.log('🔌 Conectando a PostgreSQL...');
    await client.connect();
    console.log('✅ Conexión establecida');
    
    // Test 1: Verificar permisos básicos
    console.log('');
    console.log('🧪 Test 1: Verificando permisos básicos...');
    const result1 = await client.query('SELECT current_user, session_user;');
    console.log('Usuario actual:', result1.rows[0]);
    
    // Test 2: Listar tablas
    console.log('');
    console.log('🧪 Test 2: Listando tablas...');
    const result2 = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    console.log('Tablas encontradas:', result2.rows.map(r => r.table_name));
    
    // Test 3: Probar SELECT en users
    console.log('');
    console.log('🧪 Test 3: Probando SELECT en tabla users...');
    try {
      const result3 = await client.query('SELECT COUNT(*) as count FROM users;');
      console.log('✅ SELECT exitoso. Total usuarios:', result3.rows[0].count);
    } catch (error) {
      console.log('❌ Error en SELECT users:', error.message);
    }
    
    // Test 4: Probar INSERT en connection_test
    console.log('');
    console.log('🧪 Test 4: Probando INSERT en connection_test...');
    try {
      const result4 = await client.query(`
        INSERT INTO connection_test (message) 
        VALUES ('Test desde Node.js directo') 
        RETURNING *;
      `);
      console.log('✅ INSERT exitoso:', result4.rows[0]);
    } catch (error) {
      console.log('❌ Error en INSERT:', error.message);
    }
    
    // Test 5: Verificar RLS status
    console.log('');
    console.log('🧪 Test 5: Verificando estado de RLS...');
    try {
      const result5 = await client.query(`
        SELECT 
          schemaname,
          tablename,
          rowsecurity
        FROM pg_tables 
        WHERE schemaname = 'public'
        ORDER BY tablename;
      `);
      console.log('Estado RLS de las tablas:');
      result5.rows.forEach(row => {
        console.log(`  ${row.tablename}: RLS ${row.rowsecurity ? 'HABILITADO' : 'DESHABILITADO'}`);
      });
    } catch (error) {
      console.log('❌ Error verificando RLS:', error.message);
    }
    
    console.log('');
    console.log('🎉 CONEXIÓN DIRECTA EXITOSA');
    
  } catch (error) {
    console.error('');
    console.error('❌ ERROR EN CONEXIÓN DIRECTA:');
    console.error('Código:', error.code);
    console.error('Mensaje:', error.message);
    console.error('Detalle:', error.detail);
  } finally {
    await client.end();
  }
}

testDirectConnection();