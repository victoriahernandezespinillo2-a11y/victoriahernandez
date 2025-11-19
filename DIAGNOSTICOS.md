# 🔍 Guía de Diagnóstico de Base de Datos y Autenticación

Esta guía te ayudará a diagnosticar problemas con la base de datos (Supabase) y la autenticación.

## 📋 Métodos de Diagnóstico

### 1. **Endpoint de Health Check** (Recomendado)

El endpoint más rápido para verificar el estado general del sistema:

```bash
# Desde el navegador o con curl
GET http://localhost:3002/api/health
# O en producción:
GET https://tu-api.vercel.app/api/health
```

**Respuesta esperada:**
```json
{
  "status": "healthy",
  "database": {
    "status": "connected",
    "provider": "Supabase",
    "responseTime": 45
  },
  "auth": {
    "status": "operational",
    "nextAuthConfigured": true
  }
}
```

**Si hay problemas:**
- `status: "unhealthy"` → Error crítico de base de datos
- `status: "degraded"` → Base de datos lenta o problemas menores
- `database.status: "error"` → Revisa `database.error` para detalles

---

### 2. **Endpoint de Diagnóstico de Autenticación**

Diagnóstico específico para problemas de autenticación:

```bash
GET http://localhost:3002/api/auth/diagnose
```

**Respuesta esperada:**
```json
{
  "status": "healthy",
  "database": {
    "connected": true,
    "provider": "Supabase",
    "canQueryUsers": true,
    "userCount": 80
  },
  "auth": {
    "nextAuthConfigured": true,
    "canAccessUsers": true,
    "hasAdminUser": true
  }
}
```

**Indicadores clave:**
- `database.connected: false` → No hay conexión a Supabase
- `database.canQueryUsers: false` → Problema con permisos o tabla users
- `auth.canAccessUsers: false` → No se puede acceder a usuarios (crítico para auth)

---

### 3. **Script de Diagnóstico Local**

Para diagnóstico detallado desde tu máquina local:

```bash
# Desde la raíz del proyecto
cd polideportivo-platform
pnpm --filter @repo/db run db:diagnose
```

Este script verifica:
- ✅ Variables de entorno configuradas
- ✅ Conexión a Supabase
- ✅ Acceso a tablas
- ✅ Usuarios admin disponibles
- ✅ Configuración de autenticación

---

### 4. **Endpoint de Debug General**

Diagnóstico completo del sistema:

```bash
GET http://localhost:3002/api/debug
```

---

## 🚨 Problemas Comunes y Soluciones

### Problema: `database.status: "error"`

**Posibles causas:**
1. **Supabase está caído** → Verifica [status.supabase.com](https://status.supabase.com)
2. **DATABASE_URL incorrecta** → Verifica tu `.env`
3. **Problemas de red/firewall** → Verifica conectividad

**Solución:**
```bash
# Verificar variables de entorno
echo $DATABASE_URL

# Probar conexión directa
psql $DATABASE_URL -c "SELECT 1;"
```

---

### Problema: `auth.canAccessUsers: false`

**Posibles causas:**
1. **Tabla `users` no existe** → Ejecutar migraciones
2. **Permisos insuficientes** → Verificar RLS en Supabase
3. **Conexión a base de datos incorrecta**

**Solución:**
```bash
# Verificar que la tabla existe
pnpm --filter @repo/db exec prisma studio

# O ejecutar migraciones
pnpm --filter @repo/db exec prisma db push
```

---

### Problema: Autenticación no funciona pero BD está conectada

**Verificar:**
1. `NEXTAUTH_SECRET` está configurado
2. `NEXTAUTH_URL` es correcto
3. Cookies están habilitadas en el navegador
4. No hay problemas de CORS

**Diagnóstico:**
```bash
# Verificar configuración de NextAuth
GET /api/auth/diagnose

# Revisar logs del servidor
# Buscar mensajes como:
# ✅ [AUTH] Usuario autenticado
# ❌ [AUTH] Autenticación fallida
```

---

## 📊 Monitoreo Continuo

### En Desarrollo Local

```bash
# Terminal 1: Servidor
pnpm dev

# Terminal 2: Monitoreo
watch -n 5 'curl -s http://localhost:3002/api/health | jq'
```

### En Producción (Vercel)

1. Configura alertas en Vercel para el endpoint `/api/health`
2. Usa un servicio de monitoreo (UptimeRobot, Pingdom) que verifique:
   - `GET /api/health` cada 5 minutos
   - Alerta si `status !== "healthy"`

---

## 🔧 Comandos Útiles

```bash
# Diagnóstico completo
pnpm --filter @repo/db run db:diagnose

# Health check rápido
curl http://localhost:3002/api/health

# Diagnóstico de autenticación
curl http://localhost:3002/api/auth/diagnose

# Verificar conexión directa a Supabase
psql $DATABASE_URL -c "SELECT version();"

# Contar usuarios en BD
pnpm --filter @repo/db exec prisma studio
# Luego ejecutar: SELECT COUNT(*) FROM users;
```

---

## 📞 Contacto y Soporte

Si después de seguir esta guía el problema persiste:

1. **Revisa los logs del servidor** para errores específicos
2. **Verifica el estado de Supabase**: [status.supabase.com](https://status.supabase.com)
3. **Revisa la consola del navegador** para errores de autenticación
4. **Comparte el output de** `/api/auth/diagnose` para diagnóstico

---

## ✅ Checklist de Diagnóstico Rápido

- [ ] `/api/health` responde con `status: "healthy"`
- [ ] `database.provider` muestra "Supabase"
- [ ] `database.responseTime` < 1000ms
- [ ] `/api/auth/diagnose` muestra `canAccessUsers: true`
- [ ] `auth.nextAuthConfigured: true`
- [ ] Existe al menos un usuario admin en la BD
- [ ] Variables de entorno configuradas correctamente

Si todos los items están ✅, el sistema debería funcionar correctamente.


