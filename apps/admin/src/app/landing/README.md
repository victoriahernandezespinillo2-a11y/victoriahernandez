# Landing Page Administration

Este módulo permite gestionar todo el contenido de la landing page del polideportivo desde el panel de administración.

## Módulos Disponibles

### 1. Hero Slides (`/landing/hero`)
Gestiona las diapositivas principales del hero section de la landing page.

**Funcionalidades:**
- Crear, editar y eliminar slides
- Configurar títulos, subtítulos, descripciones
- Definir imágenes de fondo y enlaces CTA
- Controlar el orden de visualización
- Activar/desactivar slides

### 2. Testimonios (`/landing/testimonials`)
Administra los testimonios de clientes que se muestran en la landing page.

**Funcionalidades:**
- Gestionar testimonios de usuarios
- Configurar nombres, roles, empresas
- Asignar calificaciones y contenido
- Subir imágenes de perfil
- Controlar visibilidad y orden

### 3. Patrocinadores (`/landing/sponsors`)
Gestiona los patrocinadores y partners del polideportivo.

**Funcionalidades:**
- Crear y editar patrocinadores
- Configurar logos, descripciones y enlaces
- Asignar niveles de patrocinio (Platinum, Gold, Silver, Bronze)
- Definir beneficios y fechas de asociación
- Controlar visibilidad y orden

### 4. Estadísticas (`/landing/stats`)
Administra las estadísticas que se muestran en la landing page.

**Funcionalidades:**
- Configurar métricas importantes
- Definir valores, sufijos y etiquetas
- Asignar iconos y colores
- Controlar visibilidad y orden

### 5. FAQ (`/landing/faqs`)
Gestiona las preguntas frecuentes de la landing page.

**Funcionalidades:**
- Crear y editar preguntas y respuestas
- Organizar por categorías
- Controlar visibilidad y orden

### 6. Instalaciones Deportivas (`/landing/sports`)
Administra las categorías e instalaciones deportivas.

**Funcionalidades:**
- Gestionar categorías de deportes
- Crear y editar instalaciones deportivas
- Configurar precios, disponibilidad y características
- Asignar imágenes y calificaciones
- Controlar visibilidad y orden

### 7. Actividades & Eventos (`/landing/activities`)
Gestiona las actividades y eventos programados del polideportivo.

**Funcionalidades:**
- Crear y editar actividades
- Configurar títulos, descripciones e iconos
- Definir horarios y colores
- Controlar visibilidad y orden

### 8. Información General (`/landing/info-cards`)
Gestiona las tarjetas de información general del polideportivo.

**Funcionalidades:**
- Crear y editar tarjetas de información
- Configurar títulos, descripciones e iconos
- Definir contenido detallado
- Controlar visibilidad y orden

## Estructura de Datos

### LandingActivity
```typescript
interface LandingActivity {
  id: string;
  title: string;
  description: string;
  icon: string;
  schedule: string;
  color: string;
  isActive: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}
```

### LandingInfoCard
```typescript
interface LandingInfoCard {
  id: string;
  title: string;
  description: string;
  icon: string;
  content: string;
  isActive: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}
```

## API Endpoints

### Admin Endpoints
- `GET /api/admin/landing/activities` - Obtener todas las actividades
- `POST /api/admin/landing/activities` - Crear nueva actividad
- `GET /api/admin/landing/activities/[id]` - Obtener actividad específica
- `PUT /api/admin/landing/activities/[id]` - Actualizar actividad
- `DELETE /api/admin/landing/activities/[id]` - Eliminar actividad
- `GET /api/admin/landing/info-cards` - Obtener todas las info cards
- `POST /api/admin/landing/info-cards` - Crear nueva info card
- `GET /api/admin/landing/info-cards/[id]` - Obtener info card específica
- `PUT /api/admin/landing/info-cards/[id]` - Actualizar info card
- `DELETE /api/admin/landing/info-cards/[id]` - Eliminar info card

### Public Endpoints
- `GET /api/landing/activities` - Obtener actividades activas (público)
- `GET /api/landing/info-cards` - Obtener info cards activas (público)
- `GET /api/landing` - Obtener todos los datos de la landing page

## Uso en el Frontend

### Hook useLandingData
```typescript
const { activities, infoCards, loading } = useLandingData();
```

### Componente ActivitiesSection
El componente `ActivitiesSection` en la web utiliza los datos dinámicos del hook `useLandingData` para mostrar las actividades configuradas desde el admin.

### Componente InfoSection
El componente `InfoSection` en la web utiliza los datos dinámicos del hook `useLandingData` para mostrar las tarjetas de información configuradas desde el admin.

## Características Técnicas

- **Validación**: Todos los endpoints incluyen validación con Zod
- **Autenticación**: Verificación de rol ADMIN en endpoints administrativos
- **Ordenamiento**: Control de orden de visualización
- **Estado**: Control de activación/desactivación
- **Responsive**: Interfaz adaptada para móviles y desktop
- **Real-time**: Actualización en tiempo real de cambios

## Próximas Mejoras

- [ ] Formulario de creación/edición de actividades
- [ ] Vista detallada de actividad individual
- [ ] Formulario de creación/edición de info cards
- [ ] Vista detallada de info card individual
- [ ] Filtros y búsqueda avanzada
- [ ] Importación/exportación de datos
- [ ] Historial de cambios
- [ ] Notificaciones de eventos
