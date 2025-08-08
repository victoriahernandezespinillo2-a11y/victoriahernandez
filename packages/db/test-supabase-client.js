import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '../../.env' });

const databaseUrl = process.env.DATABASE_URL;
console.log('DATABASE_URL:', databaseUrl);

// Extraer información de la URL
// Intentar formato pooler primero
let poolerMatch = databaseUrl.match(/postgresql:\/\/postgres\.([^:]+):([^@]+)@[^.]+\.pooler\.supabase\.com/);
// Si no es pooler, intentar formato directo
if (!poolerMatch) {
  poolerMatch = databaseUrl.match(/postgresql:\/\/postgres:([^@]+)@db\.([^.]+)\.supabase\.co/);
  if (poolerMatch) {
    // Reordenar para que coincida con el formato esperado [, projectRef, password]
    poolerMatch = [poolerMatch[0], poolerMatch[2], poolerMatch[1]];
  }
}

if (poolerMatch) {
  const [, projectRef, password] = poolerMatch;
  const supabaseUrl = `https://${projectRef}.supabase.co`;
  
  // ❌ PROBLEMA IDENTIFICADO: Estamos usando la contraseña de la DB como API key
  console.log('\n🚨 PROBLEMA DETECTADO:');
  console.log('Project Ref:', projectRef);
  console.log('Supabase URL:', supabaseUrl);
  console.log('❌ Usando contraseña de DB como API key:', password.substring(0, 10) + '...');
  console.log('\n💡 SOLUCIÓN:');
  console.log('1. Ve a: https://supabase.com/dashboard/project/' + projectRef + '/settings/api');
  console.log('2. Copia la "anon key" (JWT largo que empieza con eyJ...)');
  console.log('3. Actualiza SUPABASE_ANON_KEY en el archivo .env');
  console.log('4. Lee el archivo SUPABASE_API_KEY_SETUP.md para instrucciones detalladas');
  
  // Intentar usar la variable de entorno si existe
  const supabaseKey = process.env.SUPABASE_ANON_KEY || password;
  
  if (supabaseKey === password) {
    console.log('\n⚠️ USANDO CONTRASEÑA DE DB COMO API KEY (INCORRECTO)');
  } else if (supabaseKey === 'REEMPLAZAR_CON_API_KEY_REAL_DE_SUPABASE') {
    console.log('\n⚠️ NECESITAS CONFIGURAR LA API KEY REAL EN .env');
  } else {
    console.log('\n✅ Usando API key de variable de entorno');
  }
  
  console.log('Supabase Key:', supabaseKey.substring(0, 10) + '...');
  
  // Crear cliente de Supabase
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    db: {
      schema: 'public',
    },
  });
  
  // Probar conexión
  async function testConnection() {
    try {
      console.log('\nProbando conexión a Supabase...');
      
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .limit(1);
      
      if (error) {
        console.error('Error de Supabase:', error);
        return;
      }
      
      console.log('✅ Conexión exitosa!');
      console.log('Datos:', data);
      
      // Probar tabla tournaments
      console.log('\nProbando tabla tournaments...');
      const { data: tournaments, error: tournamentsError } = await supabase
        .from('tournaments')
        .select('*')
        .limit(5);
      
      if (tournamentsError) {
        console.error('Error en tournaments:', tournamentsError);
        return;
      }
      
      console.log('✅ Tabla tournaments funciona!');
      console.log('Torneos encontrados:', tournaments?.length || 0);
      
    } catch (error) {
      console.error('Error general:', error);
    }
  }
  
  testConnection();
  
} else {
  console.error('No se pudo parsear la URL de Supabase');
}