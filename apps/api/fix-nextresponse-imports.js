const fs = require('fs');
const path = require('path');

// Función para arreglar un archivo
function fixFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Verificar si el archivo usa NextResponse
    if (content.includes('NextResponse')) {
      // Verificar si ya tiene la importación
      if (!content.includes('import { NextRequest, NextResponse }') && 
          !content.includes('import { NextResponse }')) {
        
        // Buscar la línea de importación de NextRequest
        const lines = content.split('\n');
        let nextRequestImportIndex = -1;
        
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes('import { NextRequest }')) {
            nextRequestImportIndex = i;
            break;
          }
        }
        
        if (nextRequestImportIndex !== -1) {
          // Modificar la importación existente
          lines[nextRequestImportIndex] = lines[nextRequestImportIndex].replace(
            'import { NextRequest }',
            'import { NextRequest, NextResponse }'
          );
          modified = true;
        } else {
          // Buscar otras importaciones de next/server
          let nextServerImportIndex = -1;
          for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes("from 'next/server'")) {
              nextServerImportIndex = i;
              break;
            }
          }
          
          if (nextServerImportIndex !== -1) {
            // Agregar NextResponse a la importación existente
            lines[nextServerImportIndex] = lines[nextServerImportIndex].replace(
              /import { ([^}]+) }/,
              'import { $1, NextResponse }'
            );
            modified = true;
          } else {
            // Agregar nueva importación al principio
            lines.unshift("import { NextResponse } from 'next/server';");
            modified = true;
          }
        }
        
        if (modified) {
          fs.writeFileSync(filePath, lines.join('\n'));
          console.log(`✅ Fixed: ${filePath}`);
        }
      }
    }
  } catch (error) {
    console.error(`❌ Error fixing ${filePath}:`, error.message);
  }
}

// Función recursiva para buscar archivos
function findFiles(dir, pattern) {
  const files = [];
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      files.push(...findFiles(fullPath, pattern));
    } else if (pattern.test(item)) {
      files.push(fullPath);
    }
  }
  
  return files;
}

// Buscar todos los archivos .ts en el directorio src
const srcDir = path.join(__dirname, 'src');
const tsFiles = findFiles(srcDir, /\.ts$/);

console.log(`🔍 Found ${tsFiles.length} TypeScript files`);

// Procesar cada archivo
tsFiles.forEach(fixFile);

console.log('✅ Finished fixing NextResponse imports');





