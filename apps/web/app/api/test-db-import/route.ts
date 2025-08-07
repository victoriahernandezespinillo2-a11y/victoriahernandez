import { NextRequest, NextResponse } from 'next/server';

// Configurar para usar Node.js Runtime en lugar de Edge Runtime
export const runtime = 'nodejs';

export async function GET() {
  console.log('=== TESTING DB IMPORT ===');
  
  try {
    // Paso 1: Importar el módulo de base de datos
    console.log('Paso 1: Importando @repo/db...');
    const dbModule = await import('@repo/db');
    console.log('✅ Módulo importado:', Object.keys(dbModule));
    
    // Paso 2: Verificar que tenemos db y UserRole
    console.log('Paso 2: Verificando exports...');
    const { db, UserRole } = dbModule;
    console.log('✅ db:', typeof db);
    console.log('✅ UserRole:', UserRole);
    
    // Paso 3: Probar testConnection
    console.log('Paso 3: Probando testConnection...');
    const connectionTest = await db.testConnection();
    console.log('✅ testConnection result:', connectionTest);
    
    // Paso 4: Probar findUserByEmail
    console.log('Paso 4: Probando findUserByEmail...');
    const user = await db.findUserByEmail('test@example.com');
    console.log('✅ findUserByEmail result:', user ? 'Usuario encontrado' : 'Usuario no encontrado');
    
    return NextResponse.json({
      success: true,
      message: 'Importación exitosa',
      moduleKeys: Object.keys(dbModule),
      connectionTest: connectionTest,
      userSearch: user ? 'Usuario encontrado' : 'Usuario no encontrado'
    });
    
  } catch (error) {
    console.error('=== ERROR EN IMPORTACIÓN ===');
    console.error('Error:', error);
    console.error('Stack:', error instanceof Error ? error.stack : 'No stack');
    
    return NextResponse.json({
      success: false,
      error: 'Error en importación',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
