// Script para configurar políticas RLS básicas en Supabase
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '../../.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Faltan variables de entorno SUPABASE_URL o SUPABASE_ANON_KEY');
  process.exit(1);
}

// Crear cliente con service_role para poder ejecutar comandos administrativos
// NOTA: Necesitarías la service_role key para esto, no la anon key
console.log('🔧 Configurando políticas RLS básicas...');
console.log('');
console.log('⚠️ IMPORTANTE: Este script requiere la SERVICE_ROLE key, no la anon key.');
console.log('Para configurar RLS, necesitas:');
console.log('');
console.log('1. Ir al dashboard de Supabase:');
console.log('   https://supabase.com/dashboard/project/rcknclvzxheitotnhmhn/editor');
console.log('');
console.log('2. Ir a SQL Editor y ejecutar estos comandos:');
console.log('');

// Políticas básicas para permitir acceso público de lectura
const sqlCommands = [
  '-- Habilitar RLS en todas las tablas principales',
  'ALTER TABLE users ENABLE ROW LEVEL SECURITY;',
  'ALTER TABLE centers ENABLE ROW LEVEL SECURITY;',
  'ALTER TABLE courts ENABLE ROW LEVEL SECURITY;',
  'ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;',
  'ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;',
  'ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;',
  'ALTER TABLE pricing_rules ENABLE ROW LEVEL SECURITY;',
  'ALTER TABLE maintenance_schedules ENABLE ROW LEVEL SECURITY;',
  'ALTER TABLE tournament_users ENABLE ROW LEVEL SECURITY;',
  'ALTER TABLE waiting_lists ENABLE ROW LEVEL SECURITY;',
  '',
  '-- Políticas básicas para permitir lectura pública (para desarrollo)',
  'CREATE POLICY "Allow public read access" ON users FOR SELECT TO anon USING (true);',
  'CREATE POLICY "Allow public read access" ON centers FOR SELECT TO anon USING (true);',
  'CREATE POLICY "Allow public read access" ON courts FOR SELECT TO anon USING (true);',
  'CREATE POLICY "Allow public read access" ON reservations FOR SELECT TO anon USING (true);',
  'CREATE POLICY "Allow public read access" ON tournaments FOR SELECT TO anon USING (true);',
  'CREATE POLICY "Allow public read access" ON memberships FOR SELECT TO anon USING (true);',
  'CREATE POLICY "Allow public read access" ON pricing_rules FOR SELECT TO anon USING (true);',
  'CREATE POLICY "Allow public read access" ON maintenance_schedules FOR SELECT TO anon USING (true);',
  'CREATE POLICY "Allow public read access" ON tournament_users FOR SELECT TO anon USING (true);',
  'CREATE POLICY "Allow public read access" ON waiting_lists FOR SELECT TO anon USING (true);',
  '',
  '-- Políticas para usuarios autenticados (CRUD completo)',
  'CREATE POLICY "Allow authenticated users full access" ON users FOR ALL TO authenticated USING (true) WITH CHECK (true);',
  'CREATE POLICY "Allow authenticated users full access" ON centers FOR ALL TO authenticated USING (true) WITH CHECK (true);',
  'CREATE POLICY "Allow authenticated users full access" ON courts FOR ALL TO authenticated USING (true) WITH CHECK (true);',
  'CREATE POLICY "Allow authenticated users full access" ON reservations FOR ALL TO authenticated USING (true) WITH CHECK (true);',
  'CREATE POLICY "Allow authenticated users full access" ON tournaments FOR ALL TO authenticated USING (true) WITH CHECK (true);',
  'CREATE POLICY "Allow authenticated users full access" ON memberships FOR ALL TO authenticated USING (true) WITH CHECK (true);',
  'CREATE POLICY "Allow authenticated users full access" ON pricing_rules FOR ALL TO authenticated USING (true) WITH CHECK (true);',
  'CREATE POLICY "Allow authenticated users full access" ON maintenance_schedules FOR ALL TO authenticated USING (true) WITH CHECK (true);',
  'CREATE POLICY "Allow authenticated users full access" ON tournament_users FOR ALL TO authenticated USING (true) WITH CHECK (true);',
  'CREATE POLICY "Allow authenticated users full access" ON waiting_lists FOR ALL TO authenticated USING (true) WITH CHECK (true);'
];

console.log('```sql');
sqlCommands.forEach(cmd => console.log(cmd));
console.log('```');
console.log('');
console.log('3. Después de ejecutar estos comandos, prueba la conexión nuevamente:');
console.log('   node test-supabase-client.js');
console.log('');
console.log('📝 NOTA: Estas son políticas básicas para desarrollo.');
console.log('   En producción, deberías configurar políticas más restrictivas.');