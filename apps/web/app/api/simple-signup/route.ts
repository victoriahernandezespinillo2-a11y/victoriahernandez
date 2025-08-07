import { NextRequest, NextResponse } from 'next/server';

// Configurar para usar Node.js Runtime en lugar de Edge Runtime
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  console.log('=== SIMPLE SIGNUP ENDPOINT ===');
  
  try {
    // Paso 1: Leer el body
    console.log('Paso 1: Leyendo body...');
    const body = await request.json();
    console.log('Body recibido:', body);
    
    // Paso 2: Validación básica
    console.log('Paso 2: Validación básica...');
    if (!body.email || !body.password || !body.firstName || !body.lastName) {
      return NextResponse.json({
        success: false,
        message: 'Faltan campos requeridos'
      }, { status: 400 });
    }
    
    // Paso 3: Intentar importar la base de datos
    console.log('Paso 3: Importando base de datos...');
    let db: any;
    try {
      const dbModule = await import('@repo/db');
      db = dbModule.db;
      console.log('✅ Base de datos importada');
    } catch (error) {
      console.error('❌ Error importando BD:', error);
      return NextResponse.json({
        success: false,
        message: 'Error importando base de datos',
        details: error instanceof Error ? error.message : String(error)
      }, { status: 500 });
    }
    
    // Paso 4: Probar conexión a la base de datos
    console.log('Paso 4: Probando conexión...');
    try {
      const result = await db.$queryRaw`SELECT 1 as test`;
      console.log('✅ Conexión exitosa:', result);
    } catch (error) {
      console.error('❌ Error de conexión:', error);
      return NextResponse.json({
        success: false,
        message: 'Error de conexión a la base de datos',
        details: error instanceof Error ? error.message : String(error)
      }, { status: 500 });
    }
    
    // Paso 5: Verificar si el usuario existe
    console.log('Paso 5: Verificando usuario existente...');
    try {
      const existingUser = await db.user.findUnique({
        where: { email: body.email }
      });
      
      if (existingUser) {
        return NextResponse.json({
          success: false,
          message: 'El usuario ya existe con este email'
        }, { status: 400 });
      }
      console.log('✅ Usuario no existe, puede proceder');
    } catch (error) {
      console.error('❌ Error verificando usuario:', error);
      return NextResponse.json({
        success: false,
        message: 'Error verificando usuario existente',
        details: error instanceof Error ? error.message : String(error)
      }, { status: 500 });
    }
    
    // Paso 6: Importar bcryptjs
    console.log('Paso 6: Importando bcryptjs...');
    let bcryptjs: any;
    try {
      bcryptjs = await import('bcryptjs');
      console.log('✅ bcryptjs importado');
    } catch (error) {
      console.error('❌ Error importando bcryptjs:', error);
      return NextResponse.json({
        success: false,
        message: 'Error importando bcryptjs',
        details: error instanceof Error ? error.message : String(error)
      }, { status: 500 });
    }
    
    // Paso 7: Generar hash de contraseña
    console.log('Paso 7: Generando hash...');
    let hashedPassword: string;
    try {
      hashedPassword = await bcryptjs.hash(body.password, 12);
      console.log('✅ Hash generado');
    } catch (error) {
      console.error('❌ Error generando hash:', error);
      return NextResponse.json({
        success: false,
        message: 'Error generando hash de contraseña',
        details: error instanceof Error ? error.message : String(error)
      }, { status: 500 });
    }
    
    // Paso 8: Crear usuario
    console.log('Paso 8: Creando usuario...');
    try {
      const user = await db.user.create({
        data: {
          email: body.email,
          name: `${body.firstName} ${body.lastName}`,
          phone: body.phone || null,
          password: hashedPassword,
          role: 'user',
          isActive: true,
          creditsBalance: 0,
        },
      });
      
      console.log('✅ Usuario creado exitosamente:', user.id);
      
      return NextResponse.json({
        success: true,
        message: 'Usuario registrado exitosamente',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        }
      }, { status: 201 });
      
    } catch (error) {
      console.error('❌ Error creando usuario:', error);
      return NextResponse.json({
        success: false,
        message: 'Error creando usuario',
        details: error instanceof Error ? error.message : String(error)
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('=== ERROR GENERAL ===');
    console.error('Error:', error);
    console.error('Stack:', error instanceof Error ? error.stack : 'No stack');
    
    return NextResponse.json({
      success: false,
      message: 'Error interno del servidor',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
