import { NextRequest, NextResponse } from 'next/server';
import { db } from '@repo/db';

/**
 * POST /api/debug/reservations
 * Endpoint de prueba para identificar problemas en la creación de reservas
 * VERSIÓN SIMPLIFICADA PARA DIAGNÓSTICO
 */
export async function POST(request: NextRequest) {
  const diagnostics = {
    timestamp: new Date().toISOString(),
    step: 'initial',
    success: false,
    errors: [] as any[],
    data: null as any
  };

  try {
    // 🔍 PASO 1: VERIFICAR DATOS DE ENTRADA
    diagnostics.step = 'input_validation';
    console.log('🔍 [DEBUG-RESERVATIONS] Paso 1: Validando datos de entrada...');
    
    const body = await request.json();
    console.log('📝 [DEBUG-RESERVATIONS] Datos recibidos:', body);

    // Validación básica
    if (!body.courtId || !body.startTime || !body.duration) {
      diagnostics.errors.push({
        step: 'input_validation',
        error: 'Datos incompletos',
        received: body
      });
      return NextResponse.json({
        success: false,
        error: 'Datos incompletos',
        diagnostics
      }, { status: 400 });
    }

    // 🔍 PASO 2: VERIFICAR CONEXIÓN A BASE DE DATOS
    diagnostics.step = 'database_check';
    console.log('🔍 [DEBUG-RESERVATIONS] Paso 2: Verificando conexión a base de datos...');
    
    try {
      await db.$queryRaw`SELECT 1`;
      console.log('✅ [DEBUG-RESERVATIONS] Base de datos conectada');
      diagnostics.data = { database: 'connected' };
    } catch (dbError: any) {
      console.error('❌ [DEBUG-RESERVATIONS] Error de base de datos:', dbError);
      diagnostics.errors.push({
        step: 'database_check',
        error: 'Error de conexión a base de datos',
        details: dbError.message
      });
      return NextResponse.json({
        success: false,
        error: 'Error de base de datos',
        diagnostics
      }, { status: 500 });
    }

    // 🔍 PASO 3: VERIFICAR EXISTENCIA DE CANCHA
    diagnostics.step = 'court_validation';
    console.log('🔍 [DEBUG-RESERVATIONS] Paso 3: Verificando existencia de cancha...');
    
    try {
      const court = await db.court.findUnique({
        where: { id: body.courtId },
        select: { id: true, name: true, isActive: true }
      });

      if (!court) {
        diagnostics.errors.push({
          step: 'court_validation',
          error: 'Cancha no encontrada',
          courtId: body.courtId
        });
        return NextResponse.json({
          success: false,
          error: 'Cancha no encontrada',
          diagnostics
        }, { status: 404 });
      }

      console.log('✅ [DEBUG-RESERVATIONS] Cancha encontrada:', court.name);
      diagnostics.data = { ...diagnostics.data, court: { id: court.id, name: court.name } };
    } catch (courtError: any) {
      console.error('❌ [DEBUG-RESERVATIONS] Error verificando cancha:', courtError);
      diagnostics.errors.push({
        step: 'court_validation',
        error: 'Error verificando cancha',
        details: courtError.message
      });
      return NextResponse.json({
        success: false,
        error: 'Error verificando cancha',
        diagnostics
      }, { status: 500 });
    }

    // 🔍 PASO 4: SIMULAR VALIDACIÓN DE DISPONIBILIDAD
    diagnostics.step = 'availability_simulation';
    console.log('🔍 [DEBUG-RESERVATIONS] Paso 4: Simulando validación de disponibilidad...');
    
    const startTime = new Date(body.startTime);
    const endTime = new Date(startTime.getTime() + body.duration * 60000);
    
    console.log('🕐 [DEBUG-RESERVATIONS] Horario solicitado:', {
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      duration: body.duration
    });

    diagnostics.data = { 
      ...diagnostics.data, 
      availability: {
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        duration: body.duration
      }
    };
    diagnostics.success = true;

    return NextResponse.json({
      success: true,
      message: 'Diagnóstico completado exitosamente',
      diagnostics,
      recommendations: [
        '✅ Conexión a base de datos funcionando',
        '✅ Cancha encontrada y válida',
        '✅ Datos de entrada válidos',
        '✅ Simulación de disponibilidad exitosa'
      ]
    });

  } catch (error: any) {
    console.error('🚨 [DEBUG-RESERVATIONS] Error en diagnóstico:', error);
    
    diagnostics.errors.push({
      step: diagnostics.step,
      error: {
        message: error.message,
        name: error.name,
        code: error.code,
        meta: error.meta
      }
    });

    return NextResponse.json({
      success: false,
      error: 'Error durante el diagnóstico',
      diagnostics,
      recommendations: [
        '🚨 Se detectó un error en el paso: ' + diagnostics.step,
        '🔍 Revisar logs del servidor para más detalles',
        '🔌 Verificar conexión a base de datos',
        '🔐 Verificar configuración de autenticación'
      ]
    }, { status: 500 });
  }
}
