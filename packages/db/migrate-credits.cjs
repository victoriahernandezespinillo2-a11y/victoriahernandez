#!/usr/bin/env node

// Script para ejecutar migración de créditos a decimal
// Usa las variables de entorno que ya tienes configuradas

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Variables de entorno que mencionaste
const envVars = {
  DATABASE_URL: "postgresql://postgres:gYcTjJo2N7wWW8ut@db.rcknclvzxheitotnhmhn.supabase.co:5432/postgres?sslmode=require",
  DIRECT_DATABASE_URL: "postgresql://postgres:gYcTjJo2N7wWW8ut@db.rcknclvzxheitotnhmhn.supabase.co:5432/postgres?sslmode=require",
  SUPABASE_URL: "https://rcknclvzxheitotnhmhn.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJja25jbHZ6eGhlaXRvdG5obWhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1ODUzMzksImV4cCI6MjA3MDE2MTMzOX0.n4iTzTdQrsvI8-u5cin8W6X3UZPyaMQPk2lLUpZfthg",
  SUPABASE_SERVICE_ROLE_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJja25jbHZ6eGhlaXRvdG5obWhuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDU4NTMzOSwiZXhwIjoyMDcwMTYxMzM5fQ.sOJRAN-vb3kaohXtg2I1sVPOLX1E5-cLLg1bzCi7MLU"
};

console.log('🔧 Configurando variables de entorno para migración...');

// Crear archivo .env temporal
const envContent = Object.entries(envVars)
  .map(([key, value]) => `${key}="${value}"`)
  .join('\n');

const envPath = path.join(__dirname, '.env');
fs.writeFileSync(envPath, envContent);
console.log('✅ Archivo .env temporal creado');

try {
  console.log('🚀 Ejecutando migración de créditos a decimal...');
  
  // Ejecutar migración
  execSync('npx prisma migrate dev --name "change-credits-to-decimal"', {
    stdio: 'inherit',
    cwd: __dirname,
    env: {
      ...process.env,
      ...envVars
    }
  });
  
  console.log('✅ Migración completada exitosamente!');
  
} catch (error) {
  console.error('❌ Error en la migración:', error.message);
  process.exit(1);
} finally {
  // Limpiar archivo .env temporal
  try {
    fs.unlinkSync(envPath);
    console.log('🧹 Archivo .env temporal eliminado');
  } catch (e) {
    console.warn('⚠️ No se pudo eliminar el archivo .env temporal:', e.message);
  }
}

console.log('🎉 ¡Migración de créditos a decimal completada!');
