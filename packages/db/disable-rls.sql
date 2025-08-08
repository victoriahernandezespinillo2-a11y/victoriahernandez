-- Script para deshabilitar RLS temporalmente en las tablas principales
-- Ejecutar en el SQL Editor de Supabase

-- Deshabilitar RLS en la tabla tournaments
ALTER TABLE tournaments DISABLE ROW LEVEL SECURITY;

-- Deshabilitar RLS en la tabla users
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Deshabilitar RLS en la tabla courts
ALTER TABLE courts DISABLE ROW LEVEL SECURITY;

-- Deshabilitar RLS en la tabla centers
ALTER TABLE centers DISABLE ROW LEVEL SECURITY;

-- Deshabilitar RLS en la tabla reservations
ALTER TABLE reservations DISABLE ROW LEVEL SECURITY;

-- Deshabilitar RLS en la tabla memberships
ALTER TABLE memberships DISABLE ROW LEVEL SECURITY;

-- Deshabilitar RLS en la tabla tournament_users
ALTER TABLE tournament_users DISABLE ROW LEVEL SECURITY;

-- Deshabilitar RLS en la tabla maintenance_schedules
ALTER TABLE maintenance_schedules DISABLE ROW LEVEL SECURITY;

-- Deshabilitar RLS en la tabla pricing_rules
ALTER TABLE pricing_rules DISABLE ROW LEVEL SECURITY;

-- Verificar el estado de RLS
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;