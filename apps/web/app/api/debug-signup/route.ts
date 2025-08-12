import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Configurar para usar Node.js Runtime en lugar de Edge Runtime
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const logs: string[] = [];
  
  try {
    logs.push('=== INICIO DIAGNÓSTICO SIGNUP ===');
    
    // Paso 1: Verificar que podemos leer el body
    logs.push('Paso 1: Leyendo body de la request...');
    const body = await request.json();
    logs.push(`✅ Body leído correctamente: ${JSON.stringify(body)}`);
    
    // Paso 2: Verificar que podemos importar las dependencias
    logs.push('Paso 2: Importando dependencias...');
    
    let bcryptjs: any;
    try {
      bcryptjs = await import('bcryptjs');
      logs.push('✅ bcryptjs importado correctamente');
    } catch (error) {
      logs.push(`❌ Error importando bcryptjs: ${error}`);
      throw error;
    }
    
    let zod: any;
    try {
      zod = await import('zod');
      logs.push('✅ zod importado correctamente');
    } catch (error) {
      logs.push(`❌ Error importando zod: ${error}`);
      throw error;
    }
    
    // Paso 3: Verificar que podemos importar la base de datos
    logs.push('Paso 3: Importando base de datos...');
    
    let db: any;
    try {
      const dbModule = await import('@repo/db');
      db = dbModule.db;
      logs.push('✅ Base de datos importada correctamente');
    } catch (error) {
      logs.push(`❌ Error importando base de datos: ${error}`);
      throw error;
    }
    
    // Paso 4: Verificar conexión a la base de datos
    logs.push('Paso 4: Probando conexión a la base de datos...');
    try {
      const result = await db.$queryRaw`SELECT 1 as test`;
      logs.push(`✅ Conexión a BD exitosa: ${JSON.stringify(result)}`);
    } catch (error) {
      logs.push(`❌ Error conectando a BD: ${error}`);
      throw error;
    }
    
    // Paso 5: Verificar validación de datos
    logs.push('Paso 5: Validando datos de entrada...');
    const signupSchema = z.object({
      firstName: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
      lastName: z.string().min(2, 'El apellido debe tener al menos 2 caracteres'),
      email: z.string().email('Email inválido'),
      phone: z.string().optional(),
      password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
      acceptTerms: z.boolean().refine(val => val === true, 'Debes aceptar los términos y condiciones')
    });
    
    try {
      const validatedData = signupSchema.parse(body);
      logs.push(`✅ Datos validados correctamente: ${JSON.stringify(validatedData)}`);
    } catch (error) {
      logs.push(`❌ Error validando datos: ${error}`);
      throw error;
    }
    
    // Paso 6: Verificar búsqueda de usuario existente
    logs.push('Paso 6: Verificando usuario existente...');
    try {
      const existingUser = await db.user.findUnique({
        where: { email: body.email }
      });
      logs.push(`✅ Búsqueda de usuario completada: ${existingUser ? 'Usuario existe' : 'Usuario no existe'}`);
    } catch (error) {
      logs.push(`❌ Error buscando usuario: ${error}`);
      throw error;
    }
    
    // Paso 7: Verificar hash de contraseña
    logs.push('Paso 7: Probando hash de contraseña...');
    try {
      const hashedPassword = await bcryptjs.hash(body.password, 12);
      logs.push(`✅ Hash de contraseña generado: ${hashedPassword.substring(0, 20)}...`);
    } catch (error) {
      logs.push(`❌ Error generando hash: ${error}`);
      throw error;
    }
    
    // Paso 8: Verificar creación de usuario (sin guardar)
    logs.push('Paso 8: Probando creación de usuario...');
    try {
      const testUser = await db.user.create({
        data: {
          email: `test-${Date.now()}@example.com`,
          name: 'Usuario de Prueba',
          password: 'test123',
          role: 'USER',
          isActive: true,
          creditsBalance: 0,
        },
      });
      logs.push(`✅ Usuario de prueba creado: ${testUser.id}`);
      
      // Eliminar usuario de prueba
      await db.user.delete({
        where: { id: testUser.id }
      });
      logs.push('✅ Usuario de prueba eliminado');
    } catch (error) {
      logs.push(`❌ Error creando usuario: ${error}`);
      throw error;
    }
    
    logs.push('=== DIAGNÓSTICO COMPLETADO EXITOSAMENTE ===');
    
    return NextResponse.json({
      success: true,
      message: 'Todos los componentes funcionan correctamente',
      logs: logs
    });
    
  } catch (error) {
    logs.push(`=== ERROR EN DIAGNÓSTICO ===`);
    logs.push(`Error: ${error}`);
    logs.push(`Stack: ${error instanceof Error ? error.stack : 'No stack available'}`);
    
    return NextResponse.json({
      success: false,
      error: 'Error en el diagnóstico',
      details: error instanceof Error ? error.message : String(error),
      logs: logs
    }, { status: 500 });
  }
}
