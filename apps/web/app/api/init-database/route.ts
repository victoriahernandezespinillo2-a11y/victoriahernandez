import { NextRequest, NextResponse } from 'next/server';
import { db } from '@repo/db';

// Configurar para usar Node.js Runtime en lugar de Edge Runtime
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  console.log('=== INICIALIZANDO BASE DE DATOS ===');
  
  try {
    // Verificar que la conexión funciona
    const connectionTest = await db.testConnection();
    
    if (!connectionTest) {
      console.error('❌ Error de conexión a Supabase');
      return NextResponse.json({
        success: false,
        error: 'Error de conexión a Supabase',
        message: 'Verifica que la URL de conexión sea correcta'
      }, { status: 500 });
    }
    
    console.log('✅ Conexión exitosa, iniciando creación de tablas...');
    
    // Crear tabla de usuarios
    const createUsersTable = `
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255),
        phone VARCHAR(50),
        password VARCHAR(255),
        role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin', 'staff')),
        date_of_birth DATE,
        membership_type VARCHAR(50),
        membership_expires_at TIMESTAMP WITH TIME ZONE,
        credits_balance INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        gdpr_consent BOOLEAN DEFAULT false,
        gdpr_consent_date TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;
    
    await db.pool.query(createUsersTable);
    console.log('✅ Tabla users creada');
    
    // Crear tabla de centros
    const createCentersTable = `
      CREATE TABLE IF NOT EXISTS centers (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(255) NOT NULL,
        address TEXT,
        phone VARCHAR(50),
        email VARCHAR(255),
        settings JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;
    
    await db.pool.query(createCentersTable);
    console.log('✅ Tabla centers creada');
    
    // Crear tabla de canchas
    const createCourtsTable = `
      CREATE TABLE IF NOT EXISTS courts (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        center_id UUID NOT NULL REFERENCES centers(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        sport_type VARCHAR(100) NOT NULL,
        capacity INTEGER,
        base_price_per_hour DECIMAL(10,2) NOT NULL,
        is_active BOOLEAN DEFAULT true,
        maintenance_status VARCHAR(50) DEFAULT 'operational',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;
    
    await db.pool.query(createCourtsTable);
    console.log('✅ Tabla courts creada');
    
    console.log('🎉 Base de datos inicializada correctamente');
    return NextResponse.json({
      success: true,
      message: 'Base de datos inicializada correctamente',
      details: 'Tablas principales creadas en Supabase'
    });
    
  } catch (error) {
    console.error('=== ERROR INICIALIZANDO BASE DE DATOS ===');
    console.error('Error:', error);
    console.error('Stack:', error instanceof Error ? error.stack : 'No stack');
    
    return NextResponse.json({
      success: false,
      error: 'Error inicializando base de datos',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
