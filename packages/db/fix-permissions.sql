-- SOLUCIÓN DEFINITIVA DE PERMISOS SUPABASE
-- Ejecutar en Supabase SQL Editor

-- 1. Otorgar permisos completos al schema public para anon y authenticated
GRANT ALL PRIVILEGES ON SCHEMA public TO anon;
GRANT ALL PRIVILEGES ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;

-- 2. Otorgar permisos a todas las tablas existentes
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO anon;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- 3. Configurar permisos por defecto para futuras tablas
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;

-- 4. Crear las tablas principales si no existen
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS centers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS courts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  center_id UUID REFERENCES centers(id),
  name TEXT NOT NULL,
  sport_type TEXT,
  hourly_rate DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT NOW()
);

-- 5. Deshabilitar RLS en todas las tablas
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE centers DISABLE ROW LEVEL SECURITY;
ALTER TABLE courts DISABLE ROW LEVEL SECURITY;

-- 6. Otorgar permisos específicos a las tablas creadas
GRANT ALL PRIVILEGES ON users TO anon, authenticated;
GRANT ALL PRIVILEGES ON centers TO anon, authenticated;
GRANT ALL PRIVILEGES ON courts TO anon, authenticated;

-- 7. Insertar datos de prueba
INSERT INTO users (email, name) VALUES 
  ('admin@test.com', 'Admin Usuario'),
  ('user@test.com', 'Usuario Test')
ON CONFLICT (email) DO NOTHING;

INSERT INTO centers (name, address) VALUES 
  ('Centro Principal', 'Calle Principal 123'),
  ('Centro Secundario', 'Avenida Deportes 456')
ON CONFLICT DO NOTHING;

INSERT INTO courts (center_id, name, sport_type, hourly_rate) 
SELECT 
  c.id,
  'Cancha ' || (ROW_NUMBER() OVER ()),
  'Fútbol',
  25.00
FROM centers c
LIMIT 3
ON CONFLICT DO NOTHING;

-- 8. Crear tabla de prueba de conexión
CREATE TABLE IF NOT EXISTS connection_test (
  id SERIAL PRIMARY KEY,
  message TEXT DEFAULT 'Conexión exitosa',
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE connection_test DISABLE ROW LEVEL SECURITY;
GRANT ALL PRIVILEGES ON connection_test TO anon, authenticated;
GRANT ALL PRIVILEGES ON SEQUENCE connection_test_id_seq TO anon, authenticated;

INSERT INTO connection_test (message) VALUES ('Test de permisos exitoso') ON CONFLICT DO NOTHING;

-- 9. Verificación final
SELECT 'Permisos configurados correctamente' as status;
SELECT COUNT(*) as total_users FROM users;
SELECT COUNT(*) as total_centers FROM centers;
SELECT COUNT(*) as total_courts FROM courts;
SELECT message FROM connection_test LIMIT 1;