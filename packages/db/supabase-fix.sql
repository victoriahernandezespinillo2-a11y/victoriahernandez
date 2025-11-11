-- SOLUCIÓN AUTOMÁTICA PARA RLS - Ejecutar en Supabase SQL Editor
-- Dashboard: https://supabase.com/dashboard/project/rcknclvzxheitotnhmhn/editor

-- 1. Configurar permisos del schema
CREATE SCHEMA IF NOT EXISTS public;
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON SCHEMA public TO anon, authenticated;

-- 2. Crear tablas principales sin RLS
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  phone TEXT,
  role TEXT DEFAULT 'user',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS centers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  email TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS courts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  center_id UUID REFERENCES centers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sport_type TEXT NOT NULL,
  hourly_rate DECIMAL(10,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  court_id UUID REFERENCES courts(id) ON DELETE CASCADE,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  total_amount DECIMAL(10,2) DEFAULT 0,
  status TEXT DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  center_id UUID REFERENCES centers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sport_type TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  max_participants INTEGER DEFAULT 16,
  entry_fee DECIMAL(10,2) DEFAULT 0,
  status TEXT DEFAULT 'upcoming',
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  center_id UUID REFERENCES centers(id) ON DELETE CASCADE,
  membership_type TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  monthly_fee DECIMAL(10,2) DEFAULT 0,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Deshabilitar RLS en todas las tablas
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE centers DISABLE ROW LEVEL SECURITY;
ALTER TABLE courts DISABLE ROW LEVEL SECURITY;
ALTER TABLE reservations DISABLE ROW LEVEL SECURITY;
ALTER TABLE tournaments DISABLE ROW LEVEL SECURITY;
ALTER TABLE memberships DISABLE ROW LEVEL SECURITY;

-- 4. Otorgar permisos completos
GRANT ALL ON users TO anon, authenticated;
GRANT ALL ON centers TO anon, authenticated;
GRANT ALL ON courts TO anon, authenticated;
GRANT ALL ON reservations TO anon, authenticated;
GRANT ALL ON tournaments TO anon, authenticated;
GRANT ALL ON memberships TO anon, authenticated;

-- 5. Insertar datos de prueba
INSERT INTO users (email, name, role) VALUES 
  ('admin@polideportivovictoriahernandez.es', 'Administrador', 'admin'),
  ('user@polideportivovictoriahernandez.es', 'Usuario Test', 'user')
ON CONFLICT (email) DO NOTHING;

INSERT INTO centers (name, address, phone, email) VALUES 
  ('Centro Deportivo Principal', 'Av. Principal 123', '123-456-7890', 'centro@polideportivovictoriahernandez.es'),
  ('Centro Deportivo Norte', 'Calle Norte 456', '123-456-7891', 'norte@polideportivovictoriahernandez.es')
ON CONFLICT DO NOTHING;

-- Obtener IDs para las relaciones
DO $$
DECLARE
    center_id UUID;
    user_id UUID;
BEGIN
    -- Obtener ID del primer centro
    SELECT id INTO center_id FROM centers LIMIT 1;
    
    -- Insertar canchas si hay un centro
    IF center_id IS NOT NULL THEN
        INSERT INTO courts (center_id, name, sport_type, hourly_rate) VALUES 
          (center_id, 'Cancha de Fútbol 1', 'futbol', 25.00),
          (center_id, 'Cancha de Básquet 1', 'basquet', 20.00),
          (center_id, 'Cancha de Tenis 1', 'tenis', 30.00)
        ON CONFLICT DO NOTHING;
    END IF;
    
    -- Obtener ID del primer usuario
    SELECT id INTO user_id FROM users WHERE role = 'user' LIMIT 1;
    
    -- Insertar membresía si hay usuario y centro
    IF user_id IS NOT NULL AND center_id IS NOT NULL THEN
        INSERT INTO memberships (user_id, center_id, membership_type, start_date, end_date, monthly_fee) VALUES 
          (user_id, center_id, 'mensual', CURRENT_DATE, CURRENT_DATE + INTERVAL '1 month', 50.00)
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- 6. Crear tabla de verificación
CREATE TABLE IF NOT EXISTS connection_test (
  id SERIAL PRIMARY KEY,
  message TEXT DEFAULT 'Supabase configurado correctamente',
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE connection_test DISABLE ROW LEVEL SECURITY;
GRANT ALL ON connection_test TO anon, authenticated;

INSERT INTO connection_test (message) VALUES ('RLS deshabilitado - Conexión exitosa');

-- 7. Mostrar resumen
SELECT 'CONFIGURACIÓN COMPLETADA' as status;
SELECT COUNT(*) as total_users FROM users;
SELECT COUNT(*) as total_centers FROM centers;
SELECT COUNT(*) as total_courts FROM courts;
SELECT COUNT(*) as total_memberships FROM memberships;
SELECT * FROM connection_test;