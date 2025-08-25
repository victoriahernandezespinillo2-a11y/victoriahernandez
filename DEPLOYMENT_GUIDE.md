# 🚀 Guía de Despliegue a Producción

## 📋 Checklist Pre-Despliegue

### ✅ Verificaciones Técnicas
- [x] Build de aplicación web funciona correctamente
- [x] Build de aplicación admin funciona correctamente
- [ ] Variables de entorno de producción configuradas
- [ ] Base de datos de producción configurada
- [ ] Servicios de terceros configurados (Stripe, Firebase, etc.)
- [ ] Dominio y SSL configurados

---

## 🌐 Opciones de Despliegue

### 1. 🔷 Vercel (Recomendado para Web App)

**Ventajas:**
- Despliegue automático desde GitHub
- SSL gratuito
- CDN global
- Optimizado para Next.js

**Pasos:**
1. Conectar repositorio a Vercel
2. Configurar variables de entorno en dashboard
3. Configurar dominio personalizado
4. Activar despliegue automático

### 2. 🚂 Railway (Recomendado para Admin + API)

**Ventajas:**
- Soporte completo para monorepo
- Base de datos PostgreSQL incluida
- Fácil configuración de variables de entorno

**Pasos:**
1. Conectar repositorio a Railway
2. Configurar servicios separados para cada app
3. Configurar base de datos PostgreSQL
4. Configurar variables de entorno

### 3. 🐳 Docker + VPS

**Para despliegue en servidor propio:**
```bash
# Construir imágenes
docker-compose -f docker-compose.prod.yml build

# Desplegar
docker-compose -f docker-compose.prod.yml up -d
```

---

## 🔧 Configuración de Variables de Entorno

### Para Vercel:
1. Ir a Project Settings → Environment Variables
2. Agregar todas las variables del archivo `.env.production`
3. Configurar para Production environment

### Para Railway:
1. Ir a cada servicio → Variables
2. Agregar variables de entorno correspondientes
3. Configurar DATABASE_URL automáticamente

---

## 🗄️ Base de Datos de Producción

### Opciones Recomendadas:

1. **Supabase** (Gratuito hasta cierto límite)
   - PostgreSQL gestionado
   - Backups automáticos
   - Dashboard web

2. **Railway PostgreSQL** (Si usas Railway)
   - Integración automática
   - Fácil configuración

3. **Neon** (Serverless PostgreSQL)
   - Escalado automático
   - Branching de base de datos

### Migración de Datos:
```bash
# Ejecutar migraciones
pnpm db:migrate:deploy

# Configurar datos iniciales
pnpm db:setup-production
```

---

## 🔐 Configuración de Seguridad

### Variables Críticas a Cambiar:
```env
# Generar nuevo secret seguro
NEXTAUTH_SECRET="$(openssl rand -base64 32)"

# URL de producción
NEXTAUTH_URL="https://your-domain.com"

# Claves de Stripe en modo producción
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_PUBLISHABLE_KEY="pk_live_..."
```

### Configuraciones Adicionales:
- Activar HTTPS obligatorio
- Configurar CORS para dominios específicos
- Configurar rate limiting
- Activar logs de seguridad

---

## 📧 Servicios de Terceros

### 1. Stripe (Pagos)
- Cambiar a claves de producción
- Configurar webhooks para URL de producción
- Probar flujo de pagos completo

### 2. Firebase (Autenticación)
- Configurar dominio de producción
- Actualizar configuración OAuth

### 3. Email (SMTP)
- Configurar cuenta de email corporativa
- Probar envío de notificaciones

### 4. SMS (Twilio)
- Configurar cuenta de producción
- Verificar número de teléfono

---

## 🚀 Proceso de Despliegue

### Paso 1: Preparar Repositorio
```bash
# Asegurar que todos los cambios estén commiteados
git add .
git commit -m "feat: preparar para producción"
git push origin main
```

### Paso 2: Configurar Servicios
1. Crear cuentas en plataformas de despliegue
2. Conectar repositorio
3. Configurar variables de entorno
4. Configurar base de datos

### Paso 3: Desplegar
1. Activar despliegue automático
2. Monitorear logs de despliegue
3. Verificar que todas las aplicaciones funcionen

### Paso 4: Configurar Dominio
1. Configurar DNS
2. Activar SSL
3. Probar acceso desde dominio personalizado

### Paso 5: Testing de Producción
1. Probar registro de usuarios
2. Probar flujo de reservas
3. Probar pagos (con tarjetas de prueba)
4. Probar notificaciones
5. Probar panel de administración

---

## 📊 Monitoreo Post-Despliegue

### Métricas a Monitorear:
- Tiempo de respuesta de la aplicación
- Errores en logs
- Uso de base de datos
- Transacciones de pago
- Registros de usuarios

### Herramientas Recomendadas:
- **Vercel Analytics** (para métricas web)
- **Railway Metrics** (para métricas de servidor)
- **Stripe Dashboard** (para métricas de pagos)
- **Supabase Dashboard** (para métricas de DB)

---

## 🆘 Troubleshooting

### Problemas Comunes:

1. **Error de conexión a base de datos**
   - Verificar DATABASE_URL
   - Comprobar firewall/whitelist

2. **Error de autenticación**
   - Verificar NEXTAUTH_SECRET
   - Comprobar configuración OAuth

3. **Error de pagos**
   - Verificar claves de Stripe
   - Comprobar configuración de webhooks

4. **Error de build**
   - Verificar variables de entorno
   - Comprobar dependencias

---

## 📞 Contacto y Soporte

Para problemas durante el despliegue:
1. Revisar logs de la plataforma de despliegue
2. Verificar configuración de variables de entorno
3. Comprobar estado de servicios de terceros
4. Consultar documentación específica de cada plataforma

---

*Última actualización: $(date)*