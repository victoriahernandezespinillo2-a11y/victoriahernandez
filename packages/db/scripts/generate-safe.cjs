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
  // En producción, siempre regenerar para asegurar que no hay cache de Data Proxy
  const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';

  // Verificar si Prisma ya está generado (solo en desarrollo)
  if (!isProduction && checkPrismaGenerated()) {
    console.log('✅ Prisma Client ya está generado, omitiendo generación...');
    return true;
  }

  if (isProduction) {
    console.log('🔄 [PRODUCCIÓN] Forzando regeneración de Prisma Client...');
    // Limpiar solo los directorios esenciales de Prisma Client
    try {
      const rootDir = path.join(__dirname, '../../..');
      const dbDir = path.join(__dirname, '..');

      // Solo eliminar los directorios principales de Prisma Client
      const prismaCachePaths = [
        path.join(rootDir, 'node_modules/.prisma'),
        path.join(dbDir, 'node_modules/.prisma'),
        path.join(dbDir, 'node_modules/@prisma/client'),
      ];

      console.log('🧹 Limpiando cache de Prisma Client...');
      prismaCachePaths.forEach(cachePath => {
        if (fs.existsSync(cachePath)) {
          console.log(`   Eliminando: ${cachePath}`);
          try {
            fs.rmSync(cachePath, { recursive: true, force: true });
            console.log(`   ✅ Eliminado`);
          } catch (e) {
            console.log(`   ⚠️  No se pudo eliminar: ${e.message}`);
          }
        }
      });

      console.log('✅ Limpieza completada');
    } catch (e) {
      console.warn('⚠️  Error durante limpieza (continuando):', e.message);
    }
  } else {
    console.log('🔄 Generando Prisma Client...');
  }

  const dbPath = path.join(__dirname, '..');

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      // Forzar regeneración eliminando cualquier cache primero
      // CRÍTICO: Eliminar TODAS las variables que puedan forzar Data Proxy
      const env = {
        ...process.env,
        PRISMA_GENERATE_DATAPROXY: 'false',
        PRISMA_CLI_QUERY_ENGINE_TYPE: 'library', // Forzar uso de engine library en lugar de binary
        PRISMA_CLIENT_ENGINE_TYPE: 'library',
      };
      // Eliminar variables que puedan forzar Data Proxy
      delete env.PRISMA_ACCELERATE;
      delete env.PRISMA_GENERATE_DATAPROXY;
      if (env.PRISMA_GENERATE_DATAPROXY) delete env.PRISMA_GENERATE_DATAPROXY;

      execSync('npx prisma generate', {
        stdio: 'inherit',
        cwd: dbPath,
        env: env
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

