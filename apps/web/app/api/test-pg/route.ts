import { NextRequest, NextResponse } from 'next/server';

// Configurar para usar Node.js Runtime
export const runtime = 'nodejs';

export async function GET() {
  try {
    console.log('🧪 Probando importación de pg...');
    
    // Probar importación dinámica
    const { Pool } = await import('pg');
    console.log('✅ pg importado correctamente');
    
    // Crear pool
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      }
    });
    
    console.log('🔌 Pool creado, conectando...');
    const client = await pool.connect();
    console.log('✅ Conectado a la base de datos');
    
    // Probar consulta simple
    const result = await client.query('SELECT NOW() as current_time');
    console.log('✅ Consulta exitosa:', result.rows[0]);
    
    client.release();
    await pool.end();
    
    return NextResponse.json({
      success: true,
      message: 'pg funciona correctamente',
      currentTime: result.rows[0].current_time
    });
    
  } catch (error) {
    console.error('❌ Error probando pg:', error);
    
    return NextResponse.json(
      { error: 'Error con pg', details: error.message },
      { status: 500 }
    );
  }
}
