// Script para abrir automáticamente Supabase con la solución
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

console.log('🚀 ABRIENDO SOLUCIÓN AUTOMÁTICA...');
console.log('');

if (!projectRef) {
  console.error('❌ No se pudo extraer el ID del proyecto de SUPABASE_URL');
  process.exit(1);
}

// Leer el archivo SQL
const sqlPath = join(__dirname, 'supabase-fix.sql');
let sqlContent;

try {
  sqlContent = readFileSync(sqlPath, 'utf8');
  console.log('✅ Archivo SQL cargado correctamente');
} catch (error) {
  console.error('❌ Error leyendo archivo SQL:', error.message);
  process.exit(1);
}

// URL del editor de Supabase
const editorUrl = `https://supabase.com/dashboard/project/${projectRef}/editor`;

console.log('📋 INSTRUCCIONES AUTOMÁTICAS:');
console.log('');
console.log('1️⃣  Abriendo Supabase SQL Editor...');
console.log(`   URL: ${editorUrl}`);
console.log('');
console.log('2️⃣  El SQL está listo en el portapapeles');
console.log('3️⃣  Solo pega (Ctrl+V) y presiona RUN');
console.log('');

// Copiar SQL al portapapeles (Windows)
const copyCommand = `echo "${sqlContent.replace(/"/g, '\"')}" | clip`;

exec(copyCommand, (error) => {
  if (error) {
    console.log('⚠️  No se pudo copiar al portapapeles automáticamente');
    console.log('');
    console.log('📋 COPIA ESTE SQL MANUALMENTE:');
    console.log('');
    console.log(sqlContent);
  } else {
    console.log('✅ SQL copiado al portapapeles');
  }
  
  console.log('');
  console.log('🌐 Abriendo navegador...');
  
  // Abrir navegador
  exec(`start "" "${editorUrl}"`, (browserError) => {
    if (browserError) {
      console.log('⚠️  No se pudo abrir el navegador automáticamente');
      console.log(`   Abre manualmente: ${editorUrl}`);
    } else {
      console.log('✅ Navegador abierto');
    }
    
    console.log('');
    console.log('🎯 PASOS FINALES:');
    console.log('   1. Pega el SQL (Ctrl+V)');
    console.log('   2. Presiona "RUN"');
    console.log('   3. Ejecuta: node test-supabase-client.js');
    console.log('');
    console.log('⚡ ¡Problema resuelto en 30 segundos!');
  });
});