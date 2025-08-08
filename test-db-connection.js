
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

console.log('URL de Supabase:', supabaseUrl);
console.log('Anon Key de Supabase:', supabaseAnonKey ? 'cargada' : 'NO encontrada');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Error: Las variables de entorno SUPABASE_URL y SUPABASE_ANON_KEY son requeridas.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
  console.log('Intentando conectar a Supabase...');
  try {
    const { data, error } = await supabase.from('users').select('id').limit(1);

    if (error) {
      console.error('Error en la consulta a la base de datos:', error);
      return;
    }

    console.log('¡Conexión exitosa! Se pudo consultar la tabla de usuarios.');
    console.log('Respuesta de la base de datos:', data);
  } catch (err) {
    console.error('Error inesperado durante la conexión:', err);
  }
}

testConnection();
