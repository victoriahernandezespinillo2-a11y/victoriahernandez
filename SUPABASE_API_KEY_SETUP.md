# 🔑 Configuración de API Key de Supabase

## ❌ Problema Identificado

El error `Invalid API key` ocurre porque estás usando la **contraseña de la base de datos** (`gYcTjJo2N7wWW8ut`) como API key de Supabase, pero eso es **incorrecto**.

## ✅ Solución: Obtener la API Key Real

### Paso 1: Acceder al Dashboard de Supabase
1. Ve a: **https://supabase.com/dashboard/project/rcknclvzxheitotnhmhn/settings/api**
2. Inicia sesión con tu cuenta de Supabase

### Paso 2: Obtener las Credenciales Correctas
En la página de Settings > API encontrarás:

```
📋 Project URL
https://rcknclvzxheitotnhmhn.supabase.co

🔑 API Keys
┌─ anon / public
│  eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
│  
└─ service_role / secret  
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Paso 3: Actualizar el archivo .env

1. Copia la **anon key** (la primera, más larga)
2. Abre el archivo `.env` en la raíz del proyecto
3. Reemplaza esta línea:
   ```env
   SUPABASE_ANON_KEY="REEMPLAZAR_CON_API_KEY_REAL_DE_SUPABASE"
   ```
   
   Por:
   ```env
   SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
   ```
   (Usa tu API key real, no este ejemplo)

### Paso 4: Verificar la Configuración

Después de actualizar el `.env`:

```bash
cd packages/db
node test-supabase-client.js
```

Deberías ver:
```
✅ Conexión exitosa!
Datos: [...]
✅ Tabla tournaments funciona!
Torneos encontrados: X
```

## 🔍 Diferencias Importantes

| Tipo | Uso | Formato |
|------|-----|----------|
| **Database Password** | Solo para conexión directa a PostgreSQL | `gYcTjJo2N7wWW8ut` |
| **Supabase Anon Key** | Para cliente de Supabase (JavaScript) | `eyJhbGciOiJIUzI1NiIs...` (JWT largo) |

## 🚨 Notas de Seguridad

- ✅ **Anon Key**: Segura para usar en frontend (navegador)
- ⚠️ **Service Role Key**: Solo para backend/servidor
- 🔒 **Database Password**: Solo para conexiones directas a PostgreSQL

## 🛠️ Solución de Problemas

### Si sigues viendo "Invalid API key":
1. Verifica que copiaste la **anon key** completa
2. Asegúrate de que no hay espacios extra
3. Confirma que el proyecto está activo en Supabase
4. Reinicia el servidor después de cambiar el `.env`

### Si no puedes acceder al dashboard:
1. Verifica que tienes acceso al proyecto `rcknclvzxheitotnhmhn`
2. Contacta al administrador del proyecto si no eres el propietario

---

**📞 ¿Necesitas ayuda?**
Si no puedes acceder al dashboard o no encuentras las API keys, comparte una captura de pantalla de la página Settings > API de tu proyecto en Supabase.