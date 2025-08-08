// Script para resolver el problema de RLS automáticamente
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔧 Resolviendo problema de RLS en Supabase...');
console.log('Valor de serviceRoleKey (depuración): ', serviceRoleKey ? 'Cargada' : 'No cargada');
console.log('');

if (!serviceRoleKey || serviceRoleKey === 'REEMPLAZAR_CON_SERVICE_ROLE_KEY_DE_SUPABASE') {
  console.log('❌ Necesitas la SERVICE_ROLE_KEY para configurar RLS automáticamente.');
  console.log('');
  console.log('📋 SOLUCIÓN RÁPIDA:');
  console.log('');
  console.log('1. Ve a: https://supabase.com/dashboard/project/rcknclvzxheitotnhmhn/settings/api');
  console.log('2. Busca "service_role" key (la que dice "secret, server-side")');
  console.log('3. Copia esa key y reemplaza en .env:');
  console.log('   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...');
  console.log('');
  console.log('4. Ejecuta nuevamente: node setup-rls-automated.js');
  console.log('');
  console.log('⚡ ALTERNATIVA MANUAL:');
  console.log('   Ve al SQL Editor en Supabase y ejecuta:');
  console.log('');
  console.log('   -- Deshabilitar RLS temporalmente para desarrollo');
  console.log('   ALTER TABLE users DISABLE ROW LEVEL SECURITY;');
  console.log('   ALTER TABLE centers DISABLE ROW LEVEL SECURITY;');
  console.log('   ALTER TABLE courts DISABLE ROW LEVEL SECURITY;');
  console.log('   ALTER TABLE reservations DISABLE ROW LEVEL SECURITY;');
  console.log('   ALTER TABLE tournaments DISABLE ROW LEVEL SECURITY;');
  console.log('   ALTER TABLE memberships DISABLE ROW LEVEL SECURITY;');
  console.log('   ALTER TABLE pricing_rules DISABLE ROW LEVEL SECURITY;');
  console.log('   ALTER TABLE maintenance_schedules DISABLE ROW LEVEL SECURITY;');
  console.log('   ALTER TABLE tournament_users DISABLE ROW LEVEL SECURITY;');
  console.log('   ALTER TABLE waiting_lists DISABLE ROW LEVEL SECURITY;');
  console.log('');
  console.log('   ⚠️  NOTA: Esto deshabilita la seguridad para desarrollo.');
  console.log('   En producción deberás configurar políticas RLS apropiadas.');
  process.exit(1);
}

// Configurar RLS automáticamente
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const tables = [
  'users', 'centers', 'courts', 'reservations', 'tournaments',
  'memberships', 'pricing_rules', 'maintenance_schedules', 
  'tournament_users', 'waiting_lists'
];

async function resolverRLS() {
  console.log('✅ SERVICE_ROLE_KEY encontrada. Configurando RLS...');
  console.log('');
  
  try {
    // Opción 1: Deshabilitar RLS para desarrollo rápido
    console.log('🚀 Deshabilitando RLS para desarrollo...');
    for (const table of tables) {
      const { error } = await supabase.rpc('exec_sql', {
        sql: `ALTER TABLE ${table} DISABLE ROW LEVEL SECURITY;`
      });
      
      if (error && !error.message.includes('does not exist')) {
        console.log(`   ⚠️  ${table}: ${error.message}`);
      } else {
        console.log(`   ✅ ${table}: RLS deshabilitado`);
      }
    }
    
    console.log('');
    console.log('🧪 Probando conexión...');
    
    // Probar conexión
    const anonClient = createClient(supabaseUrl, process.env.SUPABASE_ANON_KEY);
    const { data, error } = await anonClient.from('users').select('count').limit(1);
    
    if (error) {
      console.log('❌ Error:', error.message);
      
      // Si aún hay error, intentar crear las tablas básicas
      console.log('');
      console.log('🔧 Intentando crear estructura básica...');
      
      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          email TEXT UNIQUE NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        CREATE TABLE IF NOT EXISTS centers (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `;
      
      const { error: createError } = await supabase.rpc('exec_sql', {
        sql: createTableSQL
      });
      
      if (createError) {
        console.log('❌ Error creando tablas:', createError.message);
      } else {
        console.log('✅ Tablas básicas creadas');
      }
      
    } else {
      console.log('🎉 ¡PROBLEMA RESUELTO! La conexión a Supabase funciona correctamente.');
      console.log('');
      console.log('✅ Ahora puedes usar tu aplicación sin errores de permisos.');
      console.log('⚠️  Recuerda: RLS está deshabilitado para desarrollo.');
      console.log('   En producción deberás configurar políticas de seguridad apropiadas.');
    }
    
  } catch (error) {
    console.error('❌ Error durante la configuración:', error.message);
  }
}

resolverRLS().catch(console.error);