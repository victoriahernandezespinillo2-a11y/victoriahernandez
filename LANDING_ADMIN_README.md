# 🎯 Módulo de Administración de Landing Page

## 📋 Descripción General

El módulo de administración de la landing page permite al administrador del polideportivo gestionar todo el contenido de la página principal del sitio web de forma autónoma, sin necesidad de intervención técnica.

## 🏗️ Arquitectura Implementada

### Base de Datos
- **Modelos creados**: `LandingHero`, `LandingTestimonial`, `LandingSponsor`, `LandingStat`, `LandingFAQ`
- **Características**: Ordenamiento, estados activo/inactivo, validaciones con Zod
- **Migración**: Aplicada automáticamente con datos de ejemplo

### API REST
- **Endpoints administrativos**: `/api/admin/landing/*` (protegidos por autenticación)
- **Endpoint público**: `/api/landing` (para la web)
- **Funcionalidades**: CRUD completo, validaciones, manejo de errores

### Panel de Administración
- **Ubicación**: `/landing` en el panel de administración
- **Módulos**: Hero Slides, Testimonios, Patrocinadores, Estadísticas, FAQ
- **Diseño**: Consistente con el resto del panel, responsive

## 🚀 Funcionalidades Implementadas

### 1. Hero Slides
- ✅ Crear, editar, eliminar slides
- ✅ Imágenes, títulos, subtítulos, descripciones
- ✅ CTAs personalizables (texto y enlaces)
- ✅ Ordenamiento manual
- ✅ Estados activo/inactivo
- ✅ Vista previa de imágenes

### 2. Testimonios
- ✅ Gestión completa de testimonios de clientes
- ✅ Información del cliente (nombre, cargo, empresa)
- ✅ Sistema de calificación (1-5 estrellas)
- ✅ Categorización por deporte y experiencia
- ✅ Imágenes de perfil
- ✅ Estados activo/inactivo

### 3. Patrocinadores
- ✅ Gestión de logos e información de patrocinadores
- ✅ Niveles de patrocinio (Platino, Oro, Plata, Bronce)
- ✅ Beneficios personalizables
- ✅ Información de asociación y fechas
- ✅ Enlaces a sitios web
- ✅ Estados activo/inactivo

### 4. Estadísticas
- ✅ Métricas personalizables
- ✅ Valores, sufijos y etiquetas
- ✅ Iconos FontAwesome
- ✅ Colores personalizables
- ✅ Estados activo/inactivo

### 5. FAQ (Preguntas Frecuentes)
- ✅ Gestión de preguntas y respuestas
- ✅ Ordenamiento personalizable
- ✅ Estados activo/inactivo
- ✅ Vista expandible en el admin

## 📊 Datos de Ejemplo Incluidos

### Hero Slides (3)
1. **Polideportivo Victoria Hernandez** - Slide principal
2. **Instalaciones Modernas** - Tecnología de vanguardia
3. **Comunidad Deportiva** - Únete a nosotros

### Testimonios (6)
- María González (Entrenadora Personal)
- Carlos Rodríguez (Capitán de Equipo)
- Ana Martínez (Nadadora Profesional)
- Roberto Silva (Empresario)
- Laura Fernández (Estudiante Universitaria)
- Diego Morales (Entrenador de Básquet)

### Patrocinadores (5)
- Nike Sports (Platino)
- Gatorade (Oro)
- TechnoGym (Platino)
- Coca-Cola (Oro)
- Under Armour (Plata)

### Estadísticas (4)
- 5,000+ Usuarios Activos
- 25,000+ Reservas Completadas
- 15 Instalaciones Premium
- 98% Satisfacción Cliente

### FAQ (4)
- ¿Necesito membresía para usar las instalaciones?
- ¿Qué incluye la membresía?
- ¿Hay estacionamiento disponible?
- ¿Ofrecen clases para principiantes?

## 🔧 Instalación y Configuración

### 1. Base de Datos
```bash
# Generar cliente Prisma
cd packages/db
npx prisma generate

# Aplicar migraciones
npx prisma db push

# Poblar con datos de ejemplo
node seed-landing.cjs
```

### 2. Verificar APIs
```bash
# Probar endpoint público
curl http://localhost:3002/api/landing

# Probar endpoint administrativo (requiere autenticación)
curl http://localhost:3002/api/admin/landing/hero
```

### 3. Acceso al Panel
- **URL**: `http://localhost:3003/landing`
- **Requisitos**: Usuario con rol ADMIN
- **Navegación**: Menú lateral → Landing Page

## 🎨 Integración con la Web

### Hook Personalizado
```typescript
import { useLandingData } from '@/hooks/useLandingData';

function MyComponent() {
  const { hero, testimonials, sponsors, stats, faqs, loading, error } = useLandingData();
  
  if (loading) return <div>Cargando...</div>;
  if (error) return <div>Error: {error}</div>;
  
  return (
    <div>
      {/* Usar los datos dinámicos */}
    </div>
  );
}
```

### Endpoint Público
```typescript
// GET /api/landing
{
  "hero": [...],
  "testimonials": [...],
  "sponsors": [...],
  "stats": [...],
  "faqs": [...]
}
```

## 🔒 Seguridad

### Autenticación
- **Endpoints admin**: Requieren sesión de administrador
- **Endpoint público**: Sin autenticación (solo datos activos)
- **Validación**: Zod schemas en todos los endpoints

### Validaciones
- **Campos requeridos**: Títulos, nombres, contenido
- **URLs**: Validación de formato para imágenes y enlaces
- **Números**: Validación de rangos para calificaciones y orden

## 📱 Características del Panel

### Diseño Responsive
- ✅ Desktop: Grid de 3-4 columnas
- ✅ Tablet: Grid de 2 columnas
- ✅ Mobile: Grid de 1 columna

### Interacciones
- ✅ Modales para crear/editar
- ✅ Confirmaciones para eliminar
- ✅ Estados de carga
- ✅ Notificaciones toast
- ✅ Validaciones en tiempo real

### Funcionalidades Avanzadas
- ✅ Ordenamiento manual
- ✅ Estados activo/inactivo
- ✅ Vista previa de imágenes
- ✅ Gestión de beneficios (patrocinadores)
- ✅ Sistema de calificación (testimonios)

## 🚀 Próximos Pasos Recomendados

### Fase 1 (Inmediata)
1. **Probar el módulo** con los datos de ejemplo
2. **Personalizar contenido** según necesidades específicas
3. **Integrar con la web** usando el hook `useLandingData`

### Fase 2 (Mejoras)
1. **Editor WYSIWYG** para contenido rico
2. **Subida de imágenes** con Cloudinary/S3
3. **Programación de contenido** (publicar en fechas específicas)
4. **Analytics** de engagement

### Fase 3 (Avanzado)
1. **A/B Testing** para diferentes versiones
2. **Personalización** por segmentos de usuarios
3. **Integración con CRM** para testimonios automáticos
4. **SEO automático** para contenido

## 🐛 Solución de Problemas

### Error: "No autorizado"
- Verificar que el usuario tenga rol ADMIN
- Comprobar que la sesión esté activa

### Error: "Datos inválidos"
- Revisar que todos los campos requeridos estén completos
- Verificar formato de URLs y emails

### Error: "Error interno del servidor"
- Revisar logs del servidor
- Verificar conexión a la base de datos
- Comprobar que las migraciones estén aplicadas

## 📞 Soporte

Para soporte técnico o consultas sobre el módulo:
- **Documentación**: Este archivo README
- **Código**: Revisar implementación en `/apps/admin/src/app/landing/`
- **APIs**: Verificar endpoints en `/apps/api/src/app/api/admin/landing/`

---

**Desarrollado con ❤️ para el Polideportivo Victoria Hernandez**
