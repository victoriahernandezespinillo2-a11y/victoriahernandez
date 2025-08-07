# 🚀 Configuración para Producción

## 📋 Estado Actual del Sistema

El sistema ha sido configurado para **producción** con datos reales mínimos:

### ✅ Configuración Completada

- ✅ **Base de datos limpia** - Eliminados todos los datos de ejemplo
- ✅ **Centro deportivo configurado** - "Polideportivo Oroquieta"
- ✅ **Usuario administrador creado** - `admin@polideportivooroquieta.com`
- ✅ **7 Canchas configuradas** con reglas de precios
- ✅ **Sistema de precios dinámico** configurado

---

## 🏟️ Canchas Disponibles

| Cancha | Deporte | Capacidad | Precio Base/Hora |
|--------|---------|-----------|------------------|
| Cancha de Fútbol 1 | Football | 22 | €50.00 |
| Cancha de Fútbol 2 | Football | 22 | €50.00 |
| Pista de Tenis 1 | Tennis | 4 | €25.00 |
| Pista de Tenis 2 | Tennis | 4 | €25.00 |
| Cancha de Baloncesto | Basketball | 10 | €35.00 |
| Pista de Pádel 1 | Padel | 4 | €30.00 |
| Pista de Pádel 2 | Padel | 4 | €30.00 |

---

## 💰 Reglas de Precios Configuradas

Cada cancha tiene **3 reglas de precios automáticas**:

### 🕐 Horario Normal (Lunes-Viernes 8:00-18:00)
- **Multiplicador**: 1.0x (precio base)
- **Descuento miembros**: 10%

### 🌅 Horario Premium (Todos los días 18:00-22:00)
- **Multiplicador**: 1.3x (+30%)
- **Descuento miembros**: 15%

### 🎯 Fin de Semana (Sábado-Domingo 8:00-22:00)
- **Multiplicador**: 1.2x (+20%)
- **Descuento miembros**: 10%

---

## 👤 Credenciales de Administrador

```
Email: admin@polideportivooroquieta.com
Contraseña: admin123
```

⚠️ **IMPORTANTE**: Cambiar la contraseña después del primer login

---

## 🛠️ Comandos de Gestión de Base de Datos

### Limpiar Base de Datos
```bash
cd packages/db
pnpm db:clean
```

### Configuración Inicial de Producción
```bash
cd packages/db
pnpm db:setup-production
```

### Agregar Canchas
```bash
cd packages/db
pnpm db:add-courts
```

### Ver Base de Datos (Prisma Studio)
```bash
cd packages/db
pnpm db:studio
```

---

## 🚀 Próximos Pasos para Producción

### 1. 📝 Actualizar Información del Centro
- Dirección real del polideportivo
- Teléfono de contacto
- Email de contacto
- Horarios de apertura

### 2. 👥 Gestión de Usuarios
- Crear usuarios staff adicionales
- Configurar roles y permisos
- Cambiar contraseña del administrador

### 3. 💳 Configurar Pagos
- Configurar Stripe para pagos online
- Configurar Redsys para pagos locales
- Probar flujo de pagos

### 4. 📧 Configurar Notificaciones
- Email (SMTP)
- SMS (Twilio)
- Push notifications

### 5. 🔧 Configurar Variables de Entorno
```env
# Base de datos de producción
DATABASE_URL="postgresql://..."

# Autenticación
NEXTAUTH_URL="https://tudominio.com"
NEXTAUTH_SECRET="tu-secret-muy-seguro"

# Pagos
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_PUBLISHABLE_KEY="pk_live_..."

# Notificaciones
SMTP_HOST="smtp.gmail.com"
SMTP_USER="tu-email@gmail.com"
SMTP_PASS="tu-password"

TWILIO_ACCOUNT_SID="AC..."
TWILIO_AUTH_TOKEN="..."
```

### 6. 🌐 Despliegue
- Configurar dominio personalizado
- Configurar SSL/TLS
- Configurar base de datos PostgreSQL en la nube
- Desplegar en Vercel/Railway/Render

---

## 🧪 Testing de Funcionalidades

### ✅ Funcionalidades Listas para Probar

1. **Registro de usuarios**
   - Ir a: `http://localhost:3001/auth/signup`
   - Crear cuenta de usuario normal

2. **Login de administrador**
   - Ir a: `http://localhost:3001/auth/signin`
   - Usar credenciales de admin

3. **Gestión de reservas**
   - Ver canchas disponibles
   - Crear reservas
   - Gestionar horarios

4. **Sistema de precios**
   - Verificar precios dinámicos
   - Probar descuentos de membresía

5. **Panel de administración**
   - Ir a: `http://localhost:3003`
   - Gestionar canchas, usuarios, reservas

---

## 📊 URLs del Sistema

- **Web Principal**: `http://localhost:3001`
- **API**: `http://localhost:3002`
- **Admin Panel**: `http://localhost:3003`
- **Documentación**: `http://localhost:3004`

---

## 🔒 Seguridad

### ⚠️ Antes de Producción

1. **Cambiar todas las contraseñas por defecto**
2. **Configurar HTTPS obligatorio**
3. **Configurar rate limiting**
4. **Revisar permisos de base de datos**
5. **Configurar backups automáticos**
6. **Configurar monitoreo y alertas**

---

## 📞 Soporte

Para cualquier duda o problema durante la configuración:

1. Revisar logs en terminal
2. Verificar variables de entorno
3. Comprobar conexión a base de datos
4. Revisar documentación de cada servicio

---

*Documento actualizado: $(date)*