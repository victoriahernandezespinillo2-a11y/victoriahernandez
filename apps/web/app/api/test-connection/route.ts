import { NextRequest, NextResponse } from 'next/server';

// Configurar para usar Node.js Runtime en lugar de Edge Runtime
export const runtime = 'nodejs';

export async function GET() {
  console.log('=== TESTING CONNECTION ===');
  
  try {
    // Paso 1: Importar pg
    console.log('Paso 1: Importando pg...');
    const { Pool } = await import('pg');
    console.log('✅ pg importado');
    
    // Paso 2: Crear pool de conexión
    console.log('Paso 2: Creando pool de conexión...');
    const pool = new Pool({
      connectionString: "postgresql://postgres:gYcTjJo2N7wWW8ut@db.rcknclvzxheitotnhmhn.supabase.co:5432/postgres",
      ssl: {
        rejectUnauthorized: false
      }
    });
    console.log('✅ Pool creado');
    
    // Paso 3: Probar conexión
    console.log('Paso 3: Probando conexión...');
    const client = await pool.connect();
    console.log('✅ Cliente conectado');
    
    // Paso 4: Ejecutar consulta simple
    console.log('Paso 4: Ejecutando consulta...');
    const result = await client.query('SELECT NOW() as current_time');
    console.log('✅ Consulta ejecutada:', result.rows[0]);
    
    // Paso 5: Verificar tablas
    console.log('Paso 5: Verificando tablas...');
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'centers', 'courts')
      ORDER BY table_name;
    `);
    console.log('✅ Tablas encontradas:', tablesResult.rows);
    
    client.release();
    await pool.end();
    
    return NextResponse.json({
      success: true,
      message: 'Conexión exitosa',
      currentTime: result.rows[0].current_time,
      tables: tablesResult.rows.map(row => row.table_name)
    });
    
  } catch (error) {
    console.error('=== ERROR EN CONEXIÓN ===');
    console.error('Error:', error);
    console.error('Stack:', error instanceof Error ? error.stack : 'No stack');
    
    return NextResponse.json({
      success: false,
      error: 'Error de conexión',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
