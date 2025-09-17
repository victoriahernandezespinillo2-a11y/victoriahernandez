/**
 * Script de verificación de consistencia de estados de reservas
 * Verifica que frontend y backend estén sincronizados
 */

const fs = require('fs');
const path = require('path');

// Estados válidos del backend (desde el esquema de base de datos)
const BACKEND_VALID_STATUSES = [
  'PENDING',
  'PAID', 
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
  'NO_SHOW'
];

// Función para extraer estados de un archivo
function extractStatusFromFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Buscar patrones de enum o array de estados
    const enumMatch = content.match(/enum\s+\w+\s*\{[^}]*\}/g);
    const arrayMatch = content.match(/\[['"]([^'"]+)['"][,\s]*['"]([^'"]+)['"][,\s]*['"]([^'"]+)['"][,\s]*['"]([^'"]+)['"][,\s]*['"]([^'"]+)['"][,\s]*['"]([^'"]+)['"][,\s]*\]/);
    const zEnumMatch = content.match(/z\.enum\(\[['"]([^'"]+)['"][,\s]*['"]([^'"]+)['"][,\s]*['"]([^'"]+)['"][,\s]*['"]([^'"]+)['"][,\s]*['"]([^'"]+)['"][,\s]*['"]([^'"]+)['"][,\s]*\]\)/);
    
    let statuses = [];
    
    if (enumMatch) {
      const enumContent = enumMatch[0];
      const statusMatches = enumContent.match(/\b[A-Z_][A-Z0-9_]*\b/g);
      if (statusMatches) {
        statuses = statusMatches.filter(s => s !== 'enum' && s !== 'ReservationStatus');
      }
    }
    
    if (arrayMatch) {
      statuses = arrayMatch.slice(1).filter(Boolean);
    }
    
    if (zEnumMatch) {
      statuses = zEnumMatch.slice(1).filter(Boolean);
    }
    
    return statuses;
  } catch (error) {
    console.warn(`⚠️  No se pudo leer el archivo ${filePath}:`, error.message);
    return [];
  }
}

// Función para verificar consistencia
function verifyConsistency() {
  console.log('🔍 Verificando consistencia de estados de reservas...\n');
  
  const issues = [];
  
  // Archivos a verificar
  const filesToCheck = [
    '../packages/db/prisma/schema.prisma',
    '../apps/api/src/lib/validators/reservation.validator.ts',
    '../apps/admin/src/types/reservation.ts',
    '../apps/admin/src/app/reservations/page.tsx',
    '../apps/api/src/app/api/admin/reservations/[id]/route.ts'
  ];
  
  filesToCheck.forEach(filePath => {
    const fullPath = path.resolve(filePath);
    if (!fs.existsSync(fullPath)) {
      issues.push(`❌ Archivo no encontrado: ${filePath}`);
      return;
    }
    
    const statuses = extractStatusFromFile(fullPath);
    if (statuses.length === 0) {
      console.log(`⚠️  No se pudieron extraer estados de: ${filePath}`);
      return;
    }
    
    // Verificar que todos los estados sean válidos
    const invalidStatuses = statuses.filter(status => !BACKEND_VALID_STATUSES.includes(status));
    if (invalidStatuses.length > 0) {
      issues.push(`❌ ${filePath}: Estados inválidos encontrados: ${invalidStatuses.join(', ')}`);
    }
    
    // Verificar que no falten estados
    const missingStatuses = BACKEND_VALID_STATUSES.filter(status => !statuses.includes(status));
    if (missingStatuses.length > 0) {
      issues.push(`⚠️  ${filePath}: Estados faltantes: ${missingStatuses.join(', ')}`);
    }
    
    console.log(`✅ ${filePath}: Estados encontrados: ${statuses.join(', ')}`);
  });
  
  console.log('\n📊 Resumen de verificación:');
  
  if (issues.length === 0) {
    console.log('✅ Todos los archivos están sincronizados correctamente');
  } else {
    console.log('❌ Se encontraron problemas de consistencia:');
    issues.forEach(issue => console.log(`  ${issue}`));
  }
  
  return issues.length === 0;
}

// Función para generar reporte de consistencia
function generateConsistencyReport() {
  console.log('📋 Generando reporte de consistencia...\n');
  
  const report = {
    timestamp: new Date().toISOString(),
    backendValidStatuses: BACKEND_VALID_STATUSES,
    filesChecked: [],
    issues: []
  };
  
  const filesToCheck = [
    '../packages/db/prisma/schema.prisma',
    '../apps/api/src/lib/validators/reservation.validator.ts',
    '../apps/admin/src/types/reservation.ts',
    '../apps/admin/src/app/reservations/page.tsx',
    '../apps/api/src/app/api/admin/reservations/[id]/route.ts'
  ];
  
  filesToCheck.forEach(filePath => {
    const fullPath = path.resolve(filePath);
    if (!fs.existsSync(fullPath)) {
      report.issues.push(`Archivo no encontrado: ${filePath}`);
      return;
    }
    
    const statuses = extractStatusFromFile(fullPath);
    report.filesChecked.push({
      file: filePath,
      statuses: statuses,
      isValid: statuses.every(s => BACKEND_VALID_STATUSES.includes(s)),
      missingStatuses: BACKEND_VALID_STATUSES.filter(s => !statuses.includes(s)),
      invalidStatuses: statuses.filter(s => !BACKEND_VALID_STATUSES.includes(s))
    });
  });
  
  // Guardar reporte
  const reportPath = path.resolve('consistency-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`📄 Reporte guardado en: ${reportPath}`);
  
  return report;
}

// Ejecutar verificación
if (require.main === module) {
  const isConsistent = verifyConsistency();
  const report = generateConsistencyReport();
  
  if (isConsistent) {
    console.log('\n🎉 Verificación completada exitosamente');
    process.exit(0);
  } else {
    console.log('\n💥 Se encontraron problemas de consistencia');
    process.exit(1);
  }
}

module.exports = { verifyConsistency, generateConsistencyReport };
