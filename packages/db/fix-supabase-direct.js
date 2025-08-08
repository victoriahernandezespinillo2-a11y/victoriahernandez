// Solución directa para resolver RLS sin service_role key
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '../../.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY;

console.log('🚀 Solución directa para problema de RLS...');
console.log('');

if (!supabaseUrl || !anonKey) {
  console.error('❌ Faltan variables de entorno');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, anonKey);

async function solucionDirecta() {
  try {
    console.log('🧪 Verificando estado actual...');
    
    // Probar conexión
    const { data, error } = await supabase.from('users').select('count').limit(1);
    
    if (!error) {
      console.log('✅ ¡La conexión ya funciona!');
      return;
    }
    
    if (error.code === '42501') {
      console.log('❌ Error RLS confirmado');
      console.log('');
      
      const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
      
      console.log('🎯 SOLUCIÓN MANUAL RÁPIDA (2 minutos):');
      console.log('');
      console.log(`1️⃣  Abre: https://supabase.com/dashboard/project/${projectRef}/editor`);
      console.log('');
      console.log('2️⃣  Copia y pega este código SQL:');
      console.log('');
      console.log('-- Deshabilitar RLS en todas las tablas');
      console.log('ALTER TABLE IF EXISTS users DISABLE ROW LEVEL SECURITY;');
      console.log('ALTER TABLE IF EXISTS centers DISABLE ROW LEVEL SECURITY;');
      console.log('ALTER TABLE IF EXISTS courts DISABLE ROW LEVEL SECURITY;');
      console.log('ALTER TABLE IF EXISTS reservations DISABLE ROW LEVEL SECURITY;');
      console.log('ALTER TABLE IF EXISTS tournaments DISABLE ROW LEVEL SECURITY;');
      console.log('ALTER TABLE IF EXISTS memberships DISABLE ROW LEVEL SECURITY;');
      console.log('ALTER TABLE IF EXISTS pricing_rules DISABLE ROW LEVEL SECURITY;');
      console.log('ALTER TABLE IF EXISTS maintenance_schedules DISABLE ROW LEVEL SECURITY;');
      console.log('ALTER TABLE IF EXISTS tournament_users DISABLE ROW LEVEL SECURITY;');
      console.log('ALTER TABLE IF EXISTS waiting_lists DISABLE ROW LEVEL SECURITY;');
      console.log('');
      console.log('-- Crear tabla de prueba');
      console.log('CREATE TABLE IF NOT EXISTS test_connection (');
      console.log('  id SERIAL PRIMARY KEY,');
      console.log('  message TEXT DEFAULT \'RLS deshabilitado\',');
      console.log('  created_at TIMESTAMP DEFAULT NOW()');
      console.log(');');
      console.log('ALTER TABLE test_connection DISABLE ROW LEVEL SECURITY;');
      console.log('INSERT INTO test_connection (message) VALUES (\'Conexión exitosa\');');
      console.log('');
      console.log('3️⃣  Haz clic en "RUN" en el editor SQL');
      console.log('');
      console.log('4️⃣  Ejecuta: node test-supabase-client.js');
      console.log('');
      console.log('⚡ Esto resolverá el problema en menos de 2 minutos');
      console.log('');
      console.log('🔗 Link directo al editor:');
      console.log(`   https://supabase.com/dashboard/project/${projectRef}/editor`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('');
    console.log('💡 Ve directamente al dashboard y deshabilita RLS manualmente');
  }
}

solucionDirecta().catch(console.error);