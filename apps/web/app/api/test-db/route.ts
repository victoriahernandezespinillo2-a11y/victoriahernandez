import { NextResponse } from 'next/server';
import { db } from '@repo/db';

export async function GET() {
  try {
    console.log('=== PRUEBA DE CONEXIÓN A BASE DE DATOS ===');
    
    // Verificar conexión básica
    const connectionTest = await db.testConnection();
    console.log('✅ Conexión básica exitosa:', connectionTest);
    
    // Verificar si la tabla users existe
    const tables = await db.pool.query(`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`);
    console.log('✅ Tablas disponibles:', tables.rows);
    
    // Intentar crear un usuario de prueba
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
      gdprConsent: false,
      gdprConsentDate: null
    });
    
    console.log('✅ Usuario de prueba creado:', testUser.id);
    
    // Eliminar el usuario de prueba
    await db.pool.query('DELETE FROM users WHERE id = $1', [testUser.id]);
    
    console.log('✅ Usuario de prueba eliminado');
    
    return NextResponse.json({
      success: true,
      message: 'Base de datos funcionando correctamente',
      testResults: {
        connection: 'OK',
        tables: tables,
        userCreation: 'OK',
        userDeletion: 'OK'
      }
    });
    
  } catch (error) {
    console.error('=== ERROR EN PRUEBA DE BASE DE DATOS ===');
    console.error('Error completo:', error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack available');
    
    return NextResponse.json({
      success: false,
      error: 'Error en la base de datos',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
