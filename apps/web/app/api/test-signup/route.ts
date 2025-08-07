import { NextRequest, NextResponse } from 'next/server';

// Configurar para usar Node.js Runtime en lugar de Edge Runtime
export const runtime = 'nodejs';
import { db } from '@repo/db';

export async function POST(request: NextRequest) {
  console.log('=== TEST SIGNUP ENDPOINT ===');
  
  try {
    // Paso 1: Probar conexión a la base de datos
    console.log('Paso 1: Probando conexión...');
    const connectionTest = await db.testConnection();
    
    if (!connectionTest) {
      console.error('❌ Error de conexión a la base de datos');
      return NextResponse.json({
        success: false,
        error: 'Error de conexión a la base de datos',
        message: 'Verifica que Supabase esté configurado correctamente'
      }, { status: 500 });
    }
    
    console.log('✅ Conexión exitosa');
    
    // Paso 2: Leer datos de prueba
    console.log('Paso 2: Leyendo datos...');
    const body = await request.json();
    console.log('Body recibido:', body);
    
    // Paso 3: Verificar si el usuario existe
    console.log('Paso 3: Verificando usuario existente...');
    const existingUser = await db.findUserByEmail(body.email);
    
    if (existingUser) {
      console.log('❌ Usuario ya existe');
      return NextResponse.json({
        success: false,
        message: 'El usuario ya existe con este email',
        user: {
          id: existingUser.id,
          email: existingUser.email,
          name: existingUser.name,
          role: existingUser.role
        }
      }, { status: 400 });
    }
    
    console.log('✅ Usuario no existe');
    
    // Paso 4: Crear usuario de prueba
    console.log('Paso 4: Creando usuario de prueba...');
    const testUser = await db.createUser({
      email: `test-${Date.now()}@example.com`,
      name: 'Usuario de Prueba',
      phone: null,
      password: 'test123',
      role: 'user',
      dateOfBirth: null,
      membershipType: null,
      membershipExpiresAt: null,
      creditsBalance: 0,
      isActive: true,
      gdprConsent: true,
      gdprConsentDate: new Date(),
    });
    
    console.log('✅ Usuario de prueba creado:', testUser.id);
    
    // Paso 5: Eliminar usuario de prueba
    console.log('Paso 5: Eliminando usuario de prueba...');
    // Nota: No tenemos método deleteUser aún, pero podemos verificar que se creó
    
    return NextResponse.json({
      success: true,
      message: 'Base de datos funcionando correctamente',
      testResults: {
        connection: 'OK',
        userCreation: 'OK',
        userExists: existingUser ? 'Sí' : 'No',
        testUserCreated: testUser.id
      }
    });
    
  } catch (error) {
    console.error('=== ERROR EN TEST SIGNUP ===');
    console.error('Error:', error);
    console.error('Stack:', error instanceof Error ? error.stack : 'No stack');
    
    return NextResponse.json({
      success: false,
      error: 'Error en la prueba',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
