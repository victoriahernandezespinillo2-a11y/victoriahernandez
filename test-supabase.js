const { Pool } = require('pg');

// Configuración de Supabase
const pool = new Pool({
  connectionString: "postgresql://postgres:gYcTjJo2N7wWW8ut@db.rcknclvzxheitotnhmhn.supabase.co:5432/postgres",
  ssl: {
    rejectUnauthorized: false
  }
});

async function testConnection() {
  try {
    console.log('🔌 Probando conexión a Supabase...');
    
    const client = await pool.connect();
    console.log('✅ Conexión exitosa!');
    
    // Probar una consulta simple
    const result = await client.query('SELECT NOW() as current_time');
    console.log('⏰ Hora del servidor:', result.rows[0].current_time);
    
    // Crear tabla de usuarios
    console.log('📝 Creando tabla users...');
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
    
    await client.query(createUsersTable);
    console.log('✅ Tabla users creada exitosamente!');
    
    // Crear tabla de centros
    console.log('📝 Creando tabla centers...');
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
    
    await client.query(createCentersTable);
    console.log('✅ Tabla centers creada exitosamente!');
    
    // Crear tabla de canchas
    console.log('📝 Creando tabla courts...');
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
    
    await client.query(createCourtsTable);
    console.log('✅ Tabla courts creada exitosamente!');
    
    // Verificar que las tablas existen
    console.log('🔍 Verificando tablas creadas...');
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'centers', 'courts')
      ORDER BY table_name;
    `);
    
    console.log('📋 Tablas encontradas:');
    tablesResult.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });
    
    client.release();
    console.log('🎉 ¡Todo funcionando correctamente!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

testConnection();
