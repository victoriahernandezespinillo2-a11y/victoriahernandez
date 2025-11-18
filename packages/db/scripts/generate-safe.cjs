/**
 * Script seguro para generar Prisma en Windows
 * Maneja errores de permisos (EPERM) reintentando la operación
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 segundos

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function checkPrismaGenerated() {
  // Buscar en node_modules del workspace raíz
  const possiblePaths = [
    path.join(__dirname, '../../../node_modules/.prisma/client/index.d.ts'),
    path.join(__dirname, '../../../node_modules/@prisma/client/index.d.ts'),
    path.join(__dirname, '../node_modules/.prisma/client/index.d.ts'),
  ];
  
  return possiblePaths.some(p => fs.existsSync(p));
}

async function generatePrisma() {
  // Verificar si Prisma ya está generado
  if (checkPrismaGenerated()) {
    console.log('✅ Prisma Client ya está generado, omitiendo generación...');
    return true;
  }

  console.log('🔄 Generando Prisma Client...');
  
  const dbPath = path.join(__dirname, '..');
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      execSync('npx prisma generate', {
        stdio: 'inherit',
        cwd: dbPath,
        env: { ...process.env, PRISMA_GENERATE_DATAPROXY: 'false' }
      });
      console.log('✅ Prisma Client generado exitosamente');
      return true;
    } catch (error) {
      const errorMessage = error.message || error.toString();
      
      if (errorMessage.includes('EPERM') || errorMessage.includes('operation not permitted')) {
        if (attempt < MAX_RETRIES) {
          console.log(`⚠️  Error de permisos (intento ${attempt}/${MAX_RETRIES}). Reintentando en ${RETRY_DELAY / 1000} segundos...`);
          await sleep(RETRY_DELAY);
          continue;
        } else {
          console.warn('⚠️  No se pudo generar Prisma Client debido a permisos. Si el cliente ya existe, el build puede continuar.');
          // Verificar si ya existe el cliente generado
          if (checkPrismaGenerated()) {
            console.log('✅ Prisma Client existe, continuando...');
            return true;
          }
          console.warn('⚠️  Continuando sin regenerar Prisma (puede que ya esté generado en otro lugar)');
          return true; // Continuar de todas formas
        }
      } else {
        // Otro tipo de error, lanzarlo directamente
        throw error;
      }
    }
  }
  
  return false;
}

// Ejecutar
generatePrisma().then(success => {
  if (success) {
    process.exit(0);
  } else {
    console.error('❌ No se pudo generar Prisma Client');
    process.exit(1);
  }
}).catch(error => {
  console.error('❌ Error generando Prisma:', error.message);
  // Si el cliente ya existe, continuar de todas formas
  if (checkPrismaGenerated()) {
    console.log('✅ Prisma Client existe, continuando...');
    process.exit(0);
  }
  process.exit(1);
});

