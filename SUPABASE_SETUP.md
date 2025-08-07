# 🚀 Configuración de Supabase para Polideportivo

## 📋 Pasos para Configurar Supabase

### 1. Crear cuenta en Supabase
1. Ve a [https://supabase.com](https://supabase.com)
2. Haz clic en "Start your project"
3. Crea una cuenta gratuita
4. Verifica tu email

### 2. Crear un nuevo proyecto
1. Haz clic en "New Project"
2. **Organization**: Selecciona tu organización
3. **Name**: `polideportivo-oroquieta`
4. **Database Password**: Crea una contraseña segura (guárdala)
5. **Region**: Selecciona la más cercana (ej: West Europe)
6. Haz clic en "Create new project"

### 3. Obtener la URL de conexión
1. Ve a **Settings** → **Database**
2. Copia la **Connection string** que aparece
3. Debería verse así:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres
   ```

### 4. Configurar las variables de entorno
1. Abre el archivo `.env` en la raíz del proyecto
2. Reemplaza la línea `DATABASE_URL` con la URL de Supabase:
   ```env
   DATABASE_URL="postgresql://postgres:[TU-PASSWORD]@db.[TU-PROJECT-REF].supabase.co:5432/postgres"
   ```

### 5. Crear las tablas en Supabase
1. Ve a **SQL Editor** en el panel de Supabase
2. Copia todo el contenido del archivo `packages/db/schema.sql`
3. Pega en el SQL Editor
4. Haz clic en **Run** para ejecutar el script

### 6. Verificar la conexión
1. Ejecuta el comando de prueba:
   ```bash
   pnpm dev
   ```
2. Ve a `http://localhost:3001/api/test-signup`
3. Debería funcionar sin errores

## 🔧 Configuración Adicional

### Configurar RLS (Row Level Security)
En Supabase, ve a **Authentication** → **Policies** y configura:

```sql
-- Permitir que los usuarios vean solo sus propios datos
CREATE POLICY "Users can view own data" ON users
FOR SELECT USING (auth.uid() = id);

-- Permitir que los usuarios actualicen solo sus propios datos
CREATE POLICY "Users can update own data" ON users
FOR UPDATE USING (auth.uid() = id);
```

### Configurar Storage (opcional)
Si necesitas subir imágenes:
1. Ve a **Storage** en Supabase
2. Crea un bucket llamado `avatars`
3. Configura las políticas de acceso

## 🚀 Próximos Pasos

1. **Probar el registro**: Ve a `http://localhost:3001/auth/signup`
2. **Verificar en Supabase**: Ve a **Table Editor** → **users** para ver el usuario creado
3. **Configurar autenticación**: Integrar NextAuth con Supabase Auth

## 🔍 Solución de Problemas

### Error de conexión
- Verifica que la URL de conexión sea correcta
- Asegúrate de que el proyecto esté activo en Supabase
- Verifica que las tablas se hayan creado correctamente

### Error de SSL
- En desarrollo, SSL puede estar deshabilitado
- En producción, Supabase requiere SSL

### Error de permisos
- Verifica que las políticas RLS estén configuradas correctamente
- Asegúrate de que el usuario tenga los permisos necesarios

## 📞 Soporte

Si tienes problemas:
1. Revisa los logs en la consola del navegador
2. Verifica los logs en Supabase Dashboard
3. Consulta la documentación de Supabase
