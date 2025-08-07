# Polideportivo API

API REST completa para la gestión integral del polideportivo, construida con Next.js 14, TypeScript, Prisma y PostgreSQL.

## 🚀 Características

- **Autenticación y autorización** con NextAuth.js
- **Gestión de usuarios** con roles (USER, STAFF, ADMIN)
- **Sistema de reservas** con disponibilidad en tiempo real
- **Gestión de canchas y centros deportivos**
- **Sistema de membresías** con diferentes tipos
- **Lista de espera** automática para reservas
- **Gestión de torneos** y competencias
- **Sistema de pagos** integrado con Stripe
- **Notificaciones** por email, SMS y push
- **Mantenimiento** programado de instalaciones
- **Panel de administración** completo
- **Reportes y estadísticas** detalladas
- **Health checks** y monitoreo
- **Rate limiting** y middleware de seguridad

## 📋 Requisitos

- Node.js 18+
- PostgreSQL 14+
- Redis (para cache y rate limiting)
- Stripe (para pagos)
- Servicios de email y SMS (opcionales)

## 🛠️ Instalación

```bash
# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env.local

# Configurar base de datos
npx prisma generate
npx prisma db push
npx prisma db seed

# Iniciar en desarrollo
npm run dev
```

## 🔧 Variables de Entorno

```env
# Base de datos
DATABASE_URL="postgresql://user:password@localhost:5432/polideportivo"

# NextAuth.js
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"

# Stripe
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Email
EMAIL_PROVIDER="smtp"
EMAIL_HOST="smtp.gmail.com"
EMAIL_PORT="587"
EMAIL_USER="your-email@gmail.com"
EMAIL_PASS="your-app-password"

# SMS
SMS_PROVIDER="twilio"
SMS_API_KEY="your-twilio-sid"
SMS_API_SECRET="your-twilio-token"

# Redis (opcional)
REDIS_URL="redis://localhost:6379"

# Aplicación
APP_VERSION="1.0.0"
NODE_ENV="development"
```

## 📚 Documentación de la API

### Autenticación

La API utiliza NextAuth.js para la autenticación. Todas las rutas protegidas requieren un token de sesión válido.

```bash
# Iniciar sesión
POST /api/auth/signin
{
  "email": "usuario@ejemplo.com",
  "password": "contraseña"
}

# Registrarse
POST /api/auth/signup
{
  "email": "usuario@ejemplo.com",
  "password": "contraseña",
  "firstName": "Nombre",
  "lastName": "Apellido"
}
```

### Roles y Permisos

- **USER**: Acceso básico para crear reservas y gestionar perfil
- **STAFF**: Acceso a gestión operativa (mantenimiento, check-in/out)
- **ADMIN**: Acceso completo al sistema y panel de administración

### Endpoints Principales

#### Reservas
```bash
# Listar reservas
GET /api/reservations?page=1&limit=10&status=CONFIRMED

# Crear reserva
POST /api/reservations
{
  "courtId": "court-id",
  "startTime": "2024-01-15T10:00:00Z",
  "endTime": "2024-01-15T11:00:00Z",
  "sport": "TENNIS"
}

# Obtener reserva
GET /api/reservations/[id]

# Check-in
POST /api/reservations/[id]/check-in
```

#### Canchas
```bash
# Listar canchas
GET /api/courts?centerId=center-id&sport=TENNIS

# Verificar disponibilidad
GET /api/courts/[id]/availability?date=2024-01-15&duration=60

# Obtener reservas de una cancha
GET /api/courts/[id]/reservations?startDate=2024-01-15&endDate=2024-01-16
```

#### Precios
```bash
# Calcular precio
GET /api/pricing/calculate?courtId=court-id&startTime=2024-01-15T10:00:00Z&duration=60

# Listar reglas de precios
GET /api/pricing/rules?centerId=center-id
```

#### Membresías
```bash
# Listar membresías
GET /api/memberships?userId=user-id&status=ACTIVE

# Crear membresía
POST /api/memberships
{
  "userId": "user-id",
  "typeId": "membership-type-id",
  "startDate": "2024-01-01"
}
```

#### Lista de Espera
```bash
# Agregar a lista de espera
POST /api/waiting-list
{
  "courtId": "court-id",
  "preferredTime": "2024-01-15T10:00:00Z",
  "duration": 60,
  "sport": "TENNIS"
}

# Reclamar reserva disponible
POST /api/waiting-list/[id]/claim
```

### Panel de Administración

#### Dashboard
```bash
# Obtener métricas del dashboard
GET /api/admin/dashboard?period=30d&centerId=center-id
```

#### Gestión de Usuarios
```bash
# Listar usuarios
GET /api/admin/users?page=1&search=nombre&role=USER

# Crear usuario
POST /api/admin/users
{
  "email": "usuario@ejemplo.com",
  "firstName": "Nombre",
  "lastName": "Apellido",
  "role": "USER"
}
```

#### Reportes
```bash
# Generar reporte
GET /api/admin/reports?type=revenue&period=30d&format=json

# Programar reporte
POST /api/admin/reports
{
  "name": "Reporte Mensual",
  "type": "revenue",
  "schedule": {
    "frequency": "monthly",
    "dayOfMonth": 1
  }
}
```

## 🏗️ Arquitectura

### Estructura de Directorios

```
src/
├── app/
│   └── api/                 # Rutas de la API
│       ├── admin/           # Panel de administración
│       ├── auth/            # Autenticación
│       ├── centers/         # Gestión de centros
│       ├── courts/          # Gestión de canchas
│       ├── maintenance/     # Mantenimiento
│       ├── memberships/     # Membresías
│       ├── notifications/   # Notificaciones
│       ├── payments/        # Pagos
│       ├── pricing/         # Precios
│       ├── reservations/    # Reservas
│       ├── tournaments/     # Torneos
│       ├── users/           # Usuarios
│       ├── waiting-list/    # Lista de espera
│       ├── health/          # Health checks
│       └── route.ts         # Documentación principal
├── lib/
│   ├── middleware/          # Middleware de autenticación y autorización
│   ├── services/            # Lógica de negocio
│   ├── utils/               # Utilidades
│   └── routes.ts            # Configuración de rutas
└── types/                   # Tipos TypeScript
```

### Middleware

La API utiliza un sistema de middleware modular:

- **withPublicMiddleware**: Para rutas públicas
- **withAuthMiddleware**: Para rutas que requieren autenticación
- **withStaffMiddleware**: Para rutas que requieren rol STAFF+
- **withAdminMiddleware**: Para rutas que requieren rol ADMIN

Cada middleware incluye:
- Rate limiting
- CORS
- Logging
- Manejo de errores
- Validación de roles

### Servicios

La lógica de negocio está organizada en servicios:

- `AuthService`: Autenticación y autorización
- `ReservationService`: Gestión de reservas
- `CourtService`: Gestión de canchas
- `PricingService`: Cálculo de precios
- `MembershipService`: Gestión de membresías
- `NotificationService`: Envío de notificaciones
- `PaymentService`: Procesamiento de pagos
- `MaintenanceService`: Gestión de mantenimiento

## 🔒 Seguridad

### Autenticación
- Tokens JWT seguros con NextAuth.js
- Sesiones con expiración automática
- Verificación de email opcional
- Autenticación de dos factores (2FA)

### Autorización
- Sistema de roles granular
- Middleware de autorización por ruta
- Validación de permisos por recurso

### Rate Limiting
- Límites por IP y usuario
- Configuración específica por endpoint
- Protección contra ataques DDoS

### Validación
- Validación de entrada con Zod
- Sanitización de datos
- Protección contra inyección SQL

## 📊 Monitoreo

### Health Checks
```bash
# Verificar estado del sistema
GET /api/health
```

Retorna información sobre:
- Estado de la base de datos
- Servicios externos (Stripe, email, SMS)
- Recursos del sistema (memoria, CPU)
- Servicios internos

### Logs de Auditoría
```bash
# Obtener logs de auditoría
GET /api/admin/audit?action=CREATE&entityType=RESERVATION
```

### Métricas
- Tiempo de respuesta por endpoint
- Número de requests por minuto
- Errores por tipo
- Uso de recursos

## 🧪 Testing

```bash
# Ejecutar tests
npm run test

# Tests con coverage
npm run test:coverage

# Tests de integración
npm run test:integration
```

## 🚀 Despliegue

### Producción

```bash
# Build de producción
npm run build

# Iniciar en producción
npm start
```

### Docker

```bash
# Build imagen
docker build -t polideportivo-api .

# Ejecutar contenedor
docker run -p 3000:3000 polideportivo-api
```

### Variables de Entorno de Producción

```env
NODE_ENV=production
DATABASE_URL="postgresql://..."
NEXTAUTH_URL="https://api.polideportivo.com"
STRIPE_SECRET_KEY="sk_live_..."
# ... otras variables
```

## 📈 Rendimiento

### Optimizaciones
- Cache de consultas frecuentes con Redis
- Paginación en todas las listas
- Índices optimizados en la base de datos
- Compresión de respuestas

### Escalabilidad
- Arquitectura stateless
- Balanceador de carga compatible
- Base de datos con réplicas de lectura
- CDN para assets estáticos

## 🤝 Contribución

1. Fork el repositorio
2. Crear una rama para la feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit los cambios (`git commit -am 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Crear un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 📞 Soporte

- **Email**: soporte@polideportivo.com
- **Documentación**: [https://docs.polideportivo.com](https://docs.polideportivo.com)
- **Issues**: [GitHub Issues](https://github.com/polideportivo/platform/issues)

---

**Polideportivo API v1.0.0** - Sistema completo de gestión deportiva 🏆