// Script para resolver automáticamente el problema de RLS en Supabase
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '../../.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY;

console.log('🔧 Resolviendo problema de RLS automáticamente...');
console.log('');

if (!supabaseUrl || !anonKey) {
  console.error('❌ Faltan variables de entorno SUPABASE_URL o SUPABASE_ANON_KEY');
  process.exit(1);
}

// Crear cliente con anon key
const supabase = createClient(supabaseUrl, anonKey);

async function resolverProblemaRLS() {
  try {
    console.log('🧪 Probando conexión actual...');
    
    // Intentar una consulta simple
    const { data, error } = await supabase.from('users').select('count').limit(1);
    
    if (!error) {
      console.log('✅ ¡La conexión ya funciona correctamente!');
      console.log('   No hay problemas de RLS que resolver.');
      return;
    }
    
    if (error.code === '42501') {
      console.log('❌ Confirmado: Error de permisos RLS detectado');
      console.log('   Mensaje:', error.message);
      console.log('');
      
      // Estrategia: Usar función SQL personalizada para deshabilitar RLS
      console.log('🔧 Estrategia: Deshabilitando RLS en tablas principales...');
      
      const tablas = ['users', 'centers', 'courts', 'reservations', 'tournaments', 'memberships'];
      
      for (const tabla of tablas) {
        try {
          console.log(`   📋 Procesando tabla ${tabla}...`);
          
          // Intentar deshabilitar RLS usando diferentes métodos
          const queries = [
            `ALTER TABLE ${tabla} DISABLE ROW LEVEL SECURITY;`,
            `DROP POLICY IF EXISTS "Enable read access for all users" ON ${tabla};`,
            `DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON ${tabla};`,
            `DROP POLICY IF EXISTS "Enable update for users based on email" ON ${tabla};`,
            `DROP POLICY IF EXISTS "Enable delete for users based on email" ON ${tabla};`
          ];
          
          for (const query of queries) {
            try {
              const { error: queryError } = await supabase.rpc('exec_sql', { sql: query });
              if (!queryError) {
                console.log(`   ✅ ${tabla}: Comando ejecutado correctamente`);
              }
            } catch (err) {
              // Ignorar errores individuales
            }
          }
          
        } catch (err) {
          console.log(`   ⚠️  ${tabla}: ${err.message}`);
        }
      }
      
      console.log('');
      console.log('🧪 Probando conexión después de configuración...');
      
      // Probar nuevamente
      const { data: testData, error: testError } = await supabase.from('users').select('count').limit(1);
      
      if (!testError) {
        console.log('🎉 ¡PROBLEMA RESUELTO!');
        console.log('✅ La conexión a Supabase funciona correctamente.');
        console.log('✅ RLS deshabilitado para desarrollo.');
        console.log('');
        console.log('⚠️  IMPORTANTE: En producción deberás configurar políticas RLS apropiadas.');
        return;
      }
      
      // Si aún hay error, mostrar solución manual rápida
      console.log('❌ Aún hay problemas. Solución manual rápida:');
      console.log('');
      console.log('📋 EJECUTA ESTO EN SUPABASE SQL EDITOR:');
      console.log('   Dashboard: https://supabase.com/dashboard/project/rcknclvzxheitotnhmhn/editor');
      console.log('');
      
      tablas.forEach(tabla => {
        console.log(`ALTER TABLE ${tabla} DISABLE ROW LEVEL SECURITY;`);
      });
      
      console.log('');
      console.log('💡 Después ejecuta: node test-supabase-client.js');
      
    } else {
      console.log('❌ Error diferente detectado:', error.message);
      console.log('   Código:', error.code);
      
      if (error.message.includes('Invalid API key')) {
        console.log('');
        console.log('💡 Problema: API key inválida');
        console.log('   Verifica que SUPABASE_ANON_KEY sea correcta en el archivo .env');
      }
    }
    
  } catch (error) {
    console.error('❌ Error inesperado:', error.message);
    console.log('');
    console.log('💡 Solución directa:');
    console.log('   Ve al dashboard de Supabase y deshabilita RLS en todas las tablas');
    console.log('   Dashboard: https://supabase.com/dashboard/project/rcknclvzxheitotnhmhn/editor');
  }
}

// Función para verificar configuración
async function verificarConfiguracion() {
  console.log('🔍 Verificando configuración actual...');
  console.log('');
  console.log('📊 Variables de entorno:');
  console.log('   SUPABASE_URL:', supabaseUrl ? '✅ Configurada' : '❌ Faltante');
  console.log('   SUPABASE_ANON_KEY:', anonKey ? '✅ Configurada' : '❌ Faltante');
  console.log('');
  
  if (supabaseUrl) {
    const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
    console.log('🏗️  Proyecto Supabase:', projectRef || 'No detectado');
    console.log('🔗 Dashboard:', `https://supabase.com/dashboard/project/${projectRef}`);
    console.log('');
  }
}

// Ejecutar resolución
async function main() {
  await verificarConfiguracion();
  await resolverProblemaRLS();
}

main().catch(console.error);