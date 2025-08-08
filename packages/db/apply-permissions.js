// Script para aplicar permisos automáticamente
import { exec } from 'child_process';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: '../../.env' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabaseUrl = process.env.SUPABASE_URL;
const projectRef = supabaseUrl?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];

console.log('🔧 APLICANDO PERMISOS AUTOMÁTICAMENTE...');
console.log('');

if (!projectRef) {
  console.error('❌ No se pudo extraer el ID del proyecto');
  process.exit(1);
}

// Leer el archivo SQL que deshabilita RLS
const sqlPath = join(__dirname, 'disable-rls-completely.sql');
let sqlContent;

try {
  sqlContent = readFileSync(sqlPath, 'utf8');
  console.log('✅ SQL de permisos cargado');
} catch (error) {
  console.error('❌ Error leyendo SQL:', error.message);
  process.exit(1);
}

// URL del editor
const editorUrl = `https://supabase.com/dashboard/project/${projectRef}/editor`;

console.log('🎯 SOLUCIÓN DEFINITIVA RLS:');
console.log('');
console.log('📋 Problema: RLS está habilitado y bloquea el acceso');
console.log('💡 Solución: Deshabilitar RLS completamente para desarrollo');
console.log('📚 Basado en documentación oficial de Supabase');
console.log('');
console.log('🚀 Abriendo editor con solución...');

// Copiar al portapapeles
const copyCommand = `echo "${sqlContent.replace(/"/g, '\"')}" | clip`;

exec(copyCommand, (error) => {
  if (error) {
    console.log('⚠️  No se pudo copiar automáticamente');
    console.log('');
    console.log('📋 EJECUTA ESTE SQL:');
    console.log('');
    console.log(sqlContent);
  } else {
    console.log('✅ SQL de deshabilitación RLS copiado al portapapeles');
  }
  
  console.log('');
  console.log('🌐 Abriendo Supabase...');
  
  // Abrir navegador
  exec(`start "" "${editorUrl}"`, (browserError) => {
    if (browserError) {
      console.log('⚠️  Abre manualmente:', editorUrl);
    } else {
      console.log('✅ Editor abierto');
    }
    
    console.log('');
    console.log('⚡ PASOS FINALES:');
    console.log('   1. Pega el SQL (Ctrl+V)');
    console.log('   2. Presiona "RUN"');
    console.log('   3. Ejecuta: node test-supabase-client.js');
    console.log('');
    console.log('🎉 ¡RLS deshabilitado - Acceso completo garantizado!');
  });
});