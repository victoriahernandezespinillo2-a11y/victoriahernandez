#!/usr/bin/env node

/**
 * Script para limpiar cookies específicas de cada aplicación
 * Ejecutar: node clear-cookies.js
 */

const fs = require('fs');
const path = require('path');

console.log('🧹 Limpiando cookies y sesiones...\n');

// Función para limpiar cookies específicas
function clearCookies() {
  const cookieNames = [
    'next-auth.session-token',
    'next-auth.session-token-admin',
    'next-auth.session-token-web',
    '__Secure-next-auth.session-token',
    'authjs.session-token',
    'next-auth.csrf-token',
    'next-auth.callback-url'
  ];

  console.log('📋 Cookies a limpiar:');
  cookieNames.forEach(name => console.log(`  - ${name}`));

  console.log('\n🌐 Dominios a limpiar:');
  const domains = [
    'localhost',
    'localhost:3001',
    'localhost:3002', 
    'localhost:3003'
  ];
  domains.forEach(domain => console.log(`  - ${domain}`));

  console.log('\n💡 Instrucciones para limpiar manualmente:');
  console.log('1. Abre las herramientas de desarrollador (F12)');
  console.log('2. Ve a la pestaña "Application" o "Storage"');
  console.log('3. En "Cookies", busca y elimina las cookies listadas arriba');
  console.log('4. En "Local Storage" y "Session Storage", limpia todo');
  console.log('5. Recarga la página');

  console.log('\n🔧 Alternativa automática:');
  console.log('1. Ve a /auth-status en la app admin');
  console.log('2. Haz clic en "🧹 Limpiar Cookies"');
  console.log('3. Esto limpiará automáticamente todas las cookies');

  console.log('\n⚠️  IMPORTANTE:');
  console.log('- Después de limpiar, cierra todas las pestañas del navegador');
  console.log('- Abre cada aplicación en una pestaña separada');
  console.log('- Inicia sesión en cada aplicación por separado');
  console.log('- No compartas sesiones entre aplicaciones');

  console.log('\n🎯 Configuración recomendada:');
  console.log('- Web App (3001): Usuario normal (USER)');
  console.log('- Admin (3003): Usuario admin (ADMIN)');
  console.log('- API (3002): Solo backend, no requiere login');
}

// Función para verificar archivos de configuración
function checkConfigFiles() {
  console.log('\n📁 Verificando archivos de configuración...\n');

  const configFiles = [
    'packages/auth/src/config.ts',
    'apps/admin/src/app/api/auth/[...nextauth]/route.ts',
    'apps/web/src/app/api/auth/[...nextauth]/route.ts'
  ];

  configFiles.forEach(file => {
    const fullPath = path.join(__dirname, file);
    if (fs.existsSync(fullPath)) {
      console.log(`✅ ${file}`);
    } else {
      console.log(`❌ ${file} - NO ENCONTRADO`);
    }
  });

  console.log('\n🔍 Verificando configuración de cookies...');
  console.log('Las aplicaciones ahora usan nombres de cookies separados:');
  console.log('  - Admin: next-auth.session-token-admin');
  console.log('  - Web: next-auth.session-token-web');
  console.log('  - API: No usa cookies de sesión');
}

// Función principal
function main() {
  console.log('🚀 SCRIPT DE LIMPIEZA DE COOKIES');
  console.log('================================\n');

  clearCookies();
  checkConfigFiles();

  console.log('\n✅ Script completado');
  console.log('\n📖 Próximos pasos:');
  console.log('1. Ejecuta este script');
  console.log('2. Limpia las cookies manualmente o usa el botón en /auth-status');
  console.log('3. Reinicia todas las aplicaciones');
  console.log('4. Inicia sesión en cada aplicación por separado');
}

// Ejecutar el script
main();






