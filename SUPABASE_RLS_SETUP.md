# 🔐 Configuración de Row Level Security (RLS) en Supabase

## 🚨 Problema Identificado

El error "permission denied for schema public" indica que las tablas en Supabase tienen **Row Level Security (RLS)** habilitado pero **no tienen políticas configuradas**. Esto significa que la API key anónima no puede acceder a los datos.

## 📋 Solución Paso a Paso

### 1. Acceder al Dashboard de Supabase

1. Ve a: https://supabase.com/dashboard/project/rcknclvzxheitotnhmhn
2. Inicia sesión con tu cuenta de Supabase
3. Navega a **SQL Editor** en el menú lateral

### 2. Ejecutar Comandos SQL

Copia y pega los siguientes comandos en el SQL Editor:

```sql
-- PASO 1: Habilitar RLS en todas las tablas principales
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE courts ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE waiting_lists ENABLE ROW LEVEL SECURITY;

-- PASO 2: Crear políticas para permitir lectura pública (desarrollo)
CREATE POLICY "Allow public read access" ON users FOR SELECT TO anon USING (true);
CREATE POLICY "Allow public read access" ON centers FOR SELECT TO anon USING (true);
CREATE POLICY "Allow public read access" ON courts FOR SELECT TO anon USING (true);
CREATE POLICY "Allow public read access" ON reservations FOR SELECT TO anon USING (true);
CREATE POLICY "Allow public read access" ON tournaments FOR SELECT TO anon USING (true);
CREATE POLICY "Allow public read access" ON memberships FOR SELECT TO anon USING (true);
CREATE POLICY "Allow public read access" ON pricing_rules FOR SELECT TO anon USING (true);
CREATE POLICY "Allow public read access" ON maintenance_schedules FOR SELECT TO anon USING (true);
CREATE POLICY "Allow public read access" ON tournament_users FOR SELECT TO anon USING (true);
CREATE POLICY "Allow public read access" ON waiting_lists FOR SELECT TO anon USING (true);

-- PASO 3: Crear políticas para usuarios autenticados (CRUD completo)
CREATE POLICY "Allow authenticated users full access" ON users FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated users full access" ON centers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated users full access" ON courts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated users full access" ON reservations FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated users full access" ON tournaments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated users full access" ON memberships FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated users full access" ON pricing_rules FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated users full access" ON maintenance_schedules FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated users full access" ON tournament_users FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated users full access" ON waiting_lists FOR ALL TO authenticated USING (true) WITH CHECK (true);
```

### 3. Verificar la Configuración

Después de ejecutar los comandos SQL:

1. Ve a la terminal en tu proyecto
2. Ejecuta: `cd packages/db`
3. Ejecuta: `node test-supabase-client.js`

## 🔍 Explicación de las Políticas

### Políticas para Usuarios Anónimos (anon)
- **SELECT**: Permite leer datos sin autenticación
- Útil para datos públicos como centros deportivos, canchas, etc.

### Políticas para Usuarios Autenticados (authenticated)
- **ALL**: Permite todas las operaciones (SELECT, INSERT, UPDATE, DELETE)
- Se aplica cuando el usuario está autenticado con JWT

## ⚠️ Consideraciones de Seguridad

### Para Desarrollo
- Las políticas actuales permiten acceso público de lectura
- Esto es útil para desarrollo y testing

### Para Producción
Deberías configurar políticas más restrictivas:

```sql
-- Ejemplo: Solo el propietario puede ver sus reservas
CREATE POLICY "Users can view own reservations" ON reservations 
FOR SELECT TO authenticated 
USING (auth.uid() = user_id);

-- Ejemplo: Solo administradores pueden crear centros
CREATE POLICY "Only admins can create centers" ON centers 
FOR INSERT TO authenticated 
WITH CHECK (auth.jwt() ->> 'role' = 'admin');
```

## 🚀 Próximos Pasos

1. **Ejecutar los comandos SQL** en el dashboard de Supabase
2. **Verificar la conexión** con `node test-supabase-client.js`
3. **Configurar autenticación** en tu aplicación
4. **Refinar políticas** según tus necesidades de negocio

## 📚 Recursos Adicionales

- [Documentación oficial de RLS](https://supabase.com/docs/guides/auth/row-level-security)
- [Ejemplos de políticas](https://supabase.com/docs/guides/auth/row-level-security#examples)
- [Mejores prácticas de seguridad](https://supabase.com/docs/guides/auth/row-level-security#tips)

---

**Nota**: Una vez configurado RLS correctamente, tu aplicación podrá acceder a los datos de Supabase sin errores de permisos.