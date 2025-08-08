-- DESHABILITAR RLS COMPLETAMENTE PARA DESARROLLO
-- Ejecutar en Supabase SQL Editor

-- Según la documentación oficial de Supabase:
-- "Once you have enabled RLS, no data will be accessible via the API 
-- when using the public anon key, until you create policies."

-- SOLUCIÓN: Deshabilitar RLS completamente para desarrollo

-- 1. Deshabilitar RLS en todas las tablas existentes
ALTER TABLE IF EXISTS users DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS centers DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS courts DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS reservations DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS tournaments DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS memberships DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS pricing_rules DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS maintenance_schedules DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS tournament_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS waiting_lists DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS test_connection DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS connection_test DISABLE ROW LEVEL SECURITY;

-- 2. SOLO deshabilitar RLS en tablas existentes
-- NO crear nuevas tablas para evitar conflictos

-- Verificar si las tablas existen y deshabilitar RLS
DO $$
BEGIN
    -- Deshabilitar RLS en users si existe
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users') THEN
        ALTER TABLE users DISABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'RLS deshabilitado en tabla users';
    END IF;
    
    -- Deshabilitar RLS en centers si existe
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'centers') THEN
        ALTER TABLE centers DISABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'RLS deshabilitado en tabla centers';
    END IF;
    
    -- Deshabilitar RLS en courts si existe
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'courts') THEN
        ALTER TABLE courts DISABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'RLS deshabilitado en tabla courts';
    END IF;
END $$;

-- 3. Verificar estado de RLS
SELECT 
  tablename,
  CASE 
    WHEN rowsecurity THEN 'RLS HABILITADO ❌' 
    ELSE 'RLS DESHABILITADO ✅' 
  END as estado_rls
FROM pg_tables 
WHERE schemaname = 'public' AND tablename IN ('users', 'centers', 'courts')
ORDER BY tablename;

-- 4. SOLO insertar datos de prueba si las tablas están vacías
DO $$
BEGIN
    -- Insertar usuarios solo si la tabla está vacía
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users') THEN
        IF NOT EXISTS (SELECT 1 FROM users LIMIT 1) THEN
            INSERT INTO users (id, email, name, role, is_active) VALUES 
              (gen_random_uuid(), 'admin@test.com', 'Admin Usuario', 'admin', true),
              (gen_random_uuid(), 'user@test.com', 'Usuario Test', 'user', true);
            RAISE NOTICE 'Usuarios de prueba insertados';
        ELSE
            RAISE NOTICE 'Tabla users ya contiene datos';
        END IF;
    END IF;
    
    -- Insertar centros solo si la tabla está vacía
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'centers') THEN
        IF NOT EXISTS (SELECT 1 FROM centers LIMIT 1) THEN
            INSERT INTO centers (id, name, address, is_active) VALUES 
              (gen_random_uuid(), 'Centro Principal', 'Calle Principal 123', true),
              (gen_random_uuid(), 'Centro Secundario', 'Avenida Deportes 456', true);
            RAISE NOTICE 'Centros de prueba insertados';
        ELSE
            RAISE NOTICE 'Tabla centers ya contiene datos';
        END IF;
    END IF;
END $$;

-- 6. Crear tabla de prueba de conexión
CREATE TABLE IF NOT EXISTS connection_test (
  id SERIAL PRIMARY KEY,
  message TEXT DEFAULT 'Conexión exitosa',
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE connection_test DISABLE ROW LEVEL SECURITY;

INSERT INTO connection_test (message) VALUES 
  ('RLS deshabilitado correctamente'),
  ('Conexión funcionando sin políticas')
ON CONFLICT DO NOTHING;

-- 7. Verificación final
SELECT 
  'RLS DESHABILITADO - Modo Desarrollo' as status,
  'Todas las tablas accesibles sin políticas' as descripcion;

SELECT 
  schemaname,
  tablename,
  CASE 
    WHEN rowsecurity THEN 'RLS HABILITADO ❌' 
    ELSE 'RLS DESHABILITADO ✅' 
  END as estado_rls
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

SELECT COUNT(*) as total_users FROM users;
SELECT COUNT(*) as total_centers FROM centers;
SELECT COUNT(*) as total_courts FROM courts;
SELECT message FROM connection_test;