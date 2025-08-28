import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [TEST-DB-SIMPLE] Iniciando prueba de BD simple');
    
    // Importar la base de datos dinámicamente para evitar problemas de inicialización
    const { db } = await import('@repo/db');
    console.log('🔍 [TEST-DB-SIMPLE] Cliente de BD importado');
    
    // Probar conexión básica
    const result = await db.$queryRaw`SELECT 1 as test`;
    console.log('🔍 [TEST-DB-SIMPLE] Query básica exitosa:', result);
    
    return NextResponse.json({
      success: true,
      message: 'Conexión a base de datos exitosa',
      timestamp: new Date().toISOString(),
      testResult: result
    });
  } catch (error) {
    console.error('❌ [TEST-DB-SIMPLE] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function OPTIONS() {
  return NextResponse.json({ success: true });
}






