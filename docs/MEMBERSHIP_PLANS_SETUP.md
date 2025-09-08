# Configuración de Planes de Membresía

## Descripción

Los planes de membresía ahora son configurables dinámicamente desde la base de datos, permitiendo al administrador personalizar precios, beneficios y características sin necesidad de modificar código.

## Estructura de la Base de Datos

### Tabla: `membership_plans`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | TEXT | Identificador único del plan |
| `name` | TEXT | Nombre del plan (ej: "Básica", "Premium", "VIP") |
| `type` | TEXT | Identificador único del plan (ej: "BASIC", "PREMIUM", "VIP") |
| `monthly_price` | DECIMAL | Precio mensual en euros |
| `description` | TEXT | Descripción opcional del plan |
| `benefits` | JSONB | Beneficios del plan en formato JSON |
| `is_active` | BOOLEAN | Si el plan está activo y disponible |
| `is_popular` | BOOLEAN | Si el plan debe marcarse como "Más Popular" |
| `sort_order` | INTEGER | Orden de visualización (menor = primero) |
| `created_at` | TIMESTAMP | Fecha de creación |
| `updated_at` | TIMESTAMP | Fecha de última actualización |

## Instalación

### 1. Ejecutar Migración

```bash
# Desde la raíz del proyecto
cd packages/db
npx prisma db push
```

### 2. Insertar Planes por Defecto

```bash
# Desde la raíz del proyecto
cd apps/api
npm run seed:membership-plans
```

## Configuración de Planes

### Planes por Defecto

El sistema incluye tres planes predefinidos:

#### Plan Básico
- **Nombre**: Básica
- **Tipo**: BASIC
- **Precio**: 29.99€/mes
- **Beneficios**:
  - Descuento: 5%
  - Reserva prioritaria: No
  - Horas gratis: 0
  - Pases de invitado: 0
  - Acceso a eventos: No
  - Entrenador personal: No

#### Plan Premium
- **Nombre**: Premium
- **Tipo**: PREMIUM
- **Precio**: 49.99€/mes
- **Beneficios**:
  - Descuento: 15%
  - Reserva prioritaria: Sí
  - Horas gratis: 2
  - Pases de invitado: 2
  - Acceso a eventos: Sí
  - Entrenador personal: No
- **Marcado como**: Más Popular

#### Plan VIP
- **Nombre**: VIP
- **Tipo**: VIP
- **Precio**: 79.99€/mes
- **Beneficios**:
  - Descuento: 25%
  - Reserva prioritaria: Sí
  - Horas gratis: 5
  - Pases de invitado: 5
  - Acceso a eventos: Sí
  - Entrenador personal: Sí

## Personalización

### Modificar Planes Existentes

```sql
-- Cambiar precio del plan Premium
UPDATE membership_plans 
SET monthly_price = 54.99, updated_at = NOW() 
WHERE type = 'PREMIUM';

-- Cambiar beneficios del plan VIP
UPDATE membership_plans 
SET benefits = '{"discountPercentage": 30, "priorityBooking": true, "freeHours": 6, "guestPasses": 6, "accessToEvents": true, "personalTrainer": true}'::jsonb,
    updated_at = NOW() 
WHERE type = 'VIP';
```

### Agregar Nuevos Planes

```sql
INSERT INTO membership_plans (
    id, name, type, monthly_price, description, benefits, is_active, is_popular, sort_order
) VALUES (
    'student-plan',
    'Estudiante',
    'STUDENT',
    19.99,
    'Plan especial para estudiantes con carnet universitario',
    '{"discountPercentage": 10, "priorityBooking": false, "freeHours": 1, "guestPasses": 0, "accessToEvents": true, "personalTrainer": false}'::jsonb,
    true,
    false,
    4
);
```

### Desactivar Planes

```sql
-- Desactivar plan temporalmente
UPDATE membership_plans 
SET is_active = false, updated_at = NOW() 
WHERE type = 'BASIC';
```

## Estructura de Beneficios (JSONB)

Los beneficios se almacenan en formato JSON con la siguiente estructura:

```json
{
  "discountPercentage": 15,
  "priorityBooking": true,
  "freeHours": 2,
  "guestPasses": 2,
  "accessToEvents": true,
  "personalTrainer": false,
  "customBenefit": "Valor personalizado"
}
```

### Beneficios Estándar

- `discountPercentage`: Porcentaje de descuento en reservas
- `priorityBooking`: Acceso prioritario a reservas
- `freeHours`: Horas gratis por mes
- `guestPasses`: Pases de invitado por mes
- `accessToEvents`: Acceso a eventos especiales
- `personalTrainer`: Incluye entrenador personal

### Beneficios Personalizados

Puedes agregar cualquier beneficio personalizado que necesites para tu negocio.

## Gestión desde la Aplicación

### API Endpoints

- `GET /api/memberships/types` - Obtener todos los planes activos
- `POST /api/memberships` - Crear nueva membresía
- `PUT /api/memberships/[id]` - Actualizar membresía existente

### Frontend

La página de membresías (`/dashboard/memberships`) se actualiza automáticamente para mostrar:

- Solo planes activos (`is_active = true`)
- Ordenados por `sort_order`
- Marcados como populares si `is_popular = true`
- Mensaje informativo si no hay planes configurados

## Mantenimiento

### Verificar Estado de Planes

```sql
-- Ver todos los planes y su estado
SELECT 
    name, 
    type, 
    monthly_price, 
    is_active, 
    is_popular, 
    sort_order,
    created_at
FROM membership_plans 
ORDER BY sort_order;
```

### Limpiar Planes Inactivos

```sql
-- Eliminar planes completamente inactivos (opcional)
DELETE FROM membership_plans 
WHERE is_active = false 
AND updated_at < NOW() - INTERVAL '1 year';
```

## Troubleshooting

### Problema: No se muestran planes

1. Verificar que la tabla `membership_plans` existe
2. Verificar que hay planes con `is_active = true`
3. Revisar logs del servicio de membresía

### Problema: Error en la API

1. Verificar conexión a la base de datos
2. Verificar que el servicio de membresía puede acceder a la tabla
3. Revisar logs de error en `/api/memberships/types`

### Problema: Planes no se actualizan

1. Verificar que `updated_at` se actualiza correctamente
2. Verificar que el frontend está haciendo refresh de datos
3. Limpiar caché del navegador si es necesario

## Soporte

Para problemas técnicos o consultas sobre la configuración, contacta al equipo de desarrollo.
