import { NextRequest, NextResponse } from 'next/server';
import { db } from '@repo/db';

export async function POST(request: NextRequest) {
  console.log('🔄 [TEST-CREATE] Endpoint de prueba POST llamado');
  
  try {
    const body = await request.json();
    console.log('🔄 [TEST-CREATE] Body recibido:', body);
    
    // Probar conexión a base de datos
    console.log('🔄 [TEST-CREATE] Probando conexión a base de datos...');
    const count = await db.promotion.count();
    console.log('🔄 [TEST-CREATE] Total de promociones existentes:', count);
    
    // Probar validación de código único
    if (body.code) {
      console.log('🔄 [TEST-CREATE] Verificando código único:', body.code);
      const existing = await db.promotion.findUnique({
        where: { code: body.code.toUpperCase() }
      });
      console.log('🔄 [TEST-CREATE] Promoción existente:', existing);
      
      if (existing) {
        return NextResponse.json({
          success: false,
          error: 'Ya existe una promoción con ese código'
        }, { status: 400 });
      }
    }
    
    // Probar creación sin guardar realmente
    console.log('🔄 [TEST-CREATE] Simulando creación...');
    console.log('🔄 [TEST-CREATE] Datos que se crearían:', {
      name: body.name,
      code: body.code?.toUpperCase(),
      type: body.type,
      status: 'ACTIVE',
      conditions: body.conditions,
      rewards: body.rewards,
      validFrom: body.validFrom,
      validTo: body.validTo,
      usageLimit: body.usageLimit,
      usageCount: 0
    });
    
    return NextResponse.json({
      success: true,
      message: 'Test POST exitoso - simulación de creación',
      receivedData: body,
      databaseConnection: 'OK',
      totalPromotions: count
    });
    
  } catch (error) {
    console.error('❌ [TEST-CREATE] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Error en test POST',
      details: error instanceof Error ? error.message : 'Error desconocido',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}



