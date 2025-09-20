#!/usr/bin/env node

/**
 * Script de verificación de build enterprise
 * 
 * Verifica que el build de producción funcione correctamente
 * y que no haya errores de chunks
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 [BUILD-TEST] Iniciando verificación de build enterprise...\n');

// Función para ejecutar comandos con logging
function runCommand(command, description) {
  console.log(`📋 [BUILD-TEST] ${description}...`);
  try {
    const output = execSync(command, { 
      encoding: 'utf8', 
      stdio: 'pipe',
      cwd: process.cwd()
    });
    console.log(`✅ [BUILD-TEST] ${description} completado`);
    return output;
  } catch (error) {
    console.error(`❌ [BUILD-TEST] Error en ${description}:`, error.message);
    throw error;
  }
}

// Función para verificar archivos de build
function verifyBuildFiles() {
  console.log('\n🔍 [BUILD-TEST] Verificando archivos de build...');
  
  const buildDir = path.join(process.cwd(), '.next');
  const staticDir = path.join(buildDir, 'static');
  
  if (!fs.existsSync(buildDir)) {
    throw new Error('Directorio .next no encontrado. Ejecuta "npm run build" primero.');
  }
  
  if (!fs.existsSync(staticDir)) {
    throw new Error('Directorio .next/static no encontrado.');
  }
  
  // Verificar chunks principales
  const chunksDir = path.join(staticDir, 'chunks');
  if (fs.existsSync(chunksDir)) {
    const chunkFiles = fs.readdirSync(chunksDir);
    console.log(`📦 [BUILD-TEST] Chunks encontrados: ${chunkFiles.length}`);
    
    // Verificar que los chunks principales existan
    const requiredChunks = [
      'app/layout',
      'app/page',
      'webpack'
    ];
    
    for (const chunk of requiredChunks) {
      const found = chunkFiles.some(file => file.includes(chunk));
      if (!found) {
        console.warn(`⚠️ [BUILD-TEST] Chunk ${chunk} no encontrado`);
      } else {
        console.log(`✅ [BUILD-TEST] Chunk ${chunk} encontrado`);
      }
    }
  }
  
  console.log('✅ [BUILD-TEST] Archivos de build verificados');
}

// Función para verificar configuración de Next.js
function verifyNextConfig() {
  console.log('\n🔧 [BUILD-TEST] Verificando configuración de Next.js...');
  
  const configPath = path.join(process.cwd(), 'next.config.js');
  if (!fs.existsSync(configPath)) {
    throw new Error('next.config.js no encontrado');
  }
  
  const configContent = fs.readFileSync(configPath, 'utf8');
  
  // Verificar configuraciones importantes
  const checks = [
    {
      name: 'Configuración de webpack',
      pattern: /webpack:\s*\(/,
      required: true
    },
    {
      name: 'Configuración de splitChunks',
      pattern: /splitChunks:/,
      required: true
    },
    {
      name: 'Configuración de headers',
      pattern: /async headers\(\)/,
      required: true
    },
    {
      name: 'Configuración de rewrites',
      pattern: /async rewrites\(\)/,
      required: true
    }
  ];
  
  for (const check of checks) {
    const found = check.pattern.test(configContent);
    if (found) {
      console.log(`✅ [BUILD-TEST] ${check.name} encontrado`);
    } else if (check.required) {
      console.warn(`⚠️ [BUILD-TEST] ${check.name} no encontrado`);
    }
  }
  
  console.log('✅ [BUILD-TEST] Configuración de Next.js verificada');
}

// Función para verificar dependencias
function verifyDependencies() {
  console.log('\n📦 [BUILD-TEST] Verificando dependencias...');
  
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    throw new Error('package.json no encontrado');
  }
  
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  // Verificar dependencias críticas
  const criticalDeps = [
    'next',
    'react',
    'react-dom',
    'next-auth'
  ];
  
  for (const dep of criticalDeps) {
    if (packageJson.dependencies[dep]) {
      console.log(`✅ [BUILD-TEST] ${dep}: ${packageJson.dependencies[dep]}`);
    } else {
      console.warn(`⚠️ [BUILD-TEST] ${dep} no encontrado en dependencias`);
    }
  }
  
  console.log('✅ [BUILD-TEST] Dependencias verificadas');
}

// Función para verificar archivos de error handling
function verifyErrorHandling() {
  console.log('\n🛡️ [BUILD-TEST] Verificando archivos de error handling...');
  
  const errorFiles = [
    'app/components/ErrorBoundary.tsx',
    'lib/chunk-error-handler.ts'
  ];
  
  for (const file of errorFiles) {
    const filePath = path.join(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      console.log(`✅ [BUILD-TEST] ${file} encontrado`);
    } else {
      console.warn(`⚠️ [BUILD-TEST] ${file} no encontrado`);
    }
  }
  
  console.log('✅ [BUILD-TEST] Archivos de error handling verificados');
}

// Función principal
async function main() {
  try {
    // Verificar que estamos en el directorio correcto
    if (!fs.existsSync('package.json')) {
      throw new Error('No se encontró package.json. Ejecuta este script desde el directorio de la app web.');
    }
    
    // Verificar dependencias
    verifyDependencies();
    
    // Verificar configuración
    verifyNextConfig();
    
    // Verificar archivos de error handling
    verifyErrorHandling();
    
    // Limpiar build anterior
    console.log('\n🧹 [BUILD-TEST] Limpiando build anterior...');
    try {
      runCommand('npm run clean', 'Limpieza de build anterior');
    } catch (error) {
      console.log('ℹ️ [BUILD-TEST] No se pudo limpiar build anterior (normal si no existe)');
    }
    
    // Ejecutar build
    console.log('\n🔨 [BUILD-TEST] Ejecutando build de producción...');
    runCommand('npm run build', 'Build de producción');
    
    // Verificar archivos de build
    verifyBuildFiles();
    
    console.log('\n🎉 [BUILD-TEST] ¡Verificación de build completada exitosamente!');
    console.log('\n📊 [BUILD-TEST] Resumen:');
    console.log('  ✅ Dependencias verificadas');
    console.log('  ✅ Configuración de Next.js verificada');
    console.log('  ✅ Archivos de error handling verificados');
    console.log('  ✅ Build de producción ejecutado');
    console.log('  ✅ Archivos de build verificados');
    
    console.log('\n🚀 [BUILD-TEST] El proyecto está listo para producción en Vercel!');
    
  } catch (error) {
    console.error('\n❌ [BUILD-TEST] Error en la verificación:', error.message);
    process.exit(1);
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  main();
}

module.exports = { main };










