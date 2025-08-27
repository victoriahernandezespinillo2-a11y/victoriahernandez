# Módulo de Blog - Panel de Administración

## Descripción

El módulo de Blog proporciona una gestión completa del contenido editorial del polideportivo, permitiendo a los administradores crear, editar y gestionar artículos, categorías, tags y comentarios.

## Arquitectura

### Base de Datos

El módulo utiliza los siguientes modelos de Prisma:

- **Post**: Artículos del blog con contenido rico
- **Category**: Categorías para organizar el contenido
- **Tag**: Etiquetas para clasificación y búsqueda
- **PostCategory**: Relación muchos a muchos entre posts y categorías
- **PostTag**: Relación muchos a muchos entre posts y tags
- **Comment**: Sistema de comentarios con respuestas anidadas

### APIs

#### APIs de Administración (Protegidas)

- `GET/POST /api/admin/blog/posts` - Gestión de posts
- `GET/PUT/DELETE /api/admin/blog/posts/[id]` - Operaciones individuales de posts
- `GET/POST /api/admin/blog/categories` - Gestión de categorías
- `GET/PUT/DELETE /api/admin/blog/categories/[id]` - Operaciones individuales de categorías
- `GET/POST /api/admin/blog/tags` - Gestión de tags
- `GET/PUT/DELETE /api/admin/blog/tags/[id]` - Operaciones individuales de tags

#### APIs Públicas

- `GET /api/blog` - Lista de posts públicos con filtros
- `GET /api/blog/[slug]` - Post individual por slug
- `GET /api/blog/categories` - Categorías activas
- `GET /api/blog/tags` - Tags activos

## Funcionalidades

### Dashboard del Blog

- **Estadísticas**: Resumen de posts, categorías, tags y comentarios
- **Acciones Rápidas**: Enlaces directos a las principales funciones
- **Posts Recientes**: Vista previa de los últimos artículos publicados

### Gestión de Posts

- **Crear Posts**: Editor completo con campos para título, contenido, excerpt, SEO
- **Editar Posts**: Modificación de contenido existente
- **Estados**: Borrador, Programado, Publicado, Archivado
- **Tipos**: Noticias, Eventos, Consejos, Resultados, Anuncios
- **Categorías y Tags**: Asignación múltiple
- **Imagen Destacada**: Soporte para imágenes de portada
- **SEO**: Palabras clave y descripción meta
- **Comentarios**: Control de moderación

### Gestión de Categorías

- **CRUD Completo**: Crear, leer, actualizar, eliminar
- **Ordenamiento**: Control de la posición en listas
- **Colores e Iconos**: Personalización visual
- **Validación**: Verificación de slugs únicos

### Gestión de Tags

- **CRUD Completo**: Crear, leer, actualizar, eliminar
- **Colores**: Personalización visual
- **Validación**: Verificación de slugs únicos

### Sistema de Comentarios

- **Moderación**: Estados pendiente, aprobado, oculto, spam
- **Respuestas Anidadas**: Comentarios con respuestas
- **Filtros**: Por estado y post

## Características Técnicas

### Seguridad

- **Autenticación**: Verificación de sesión de administrador
- **Autorización**: Verificación de rol ADMIN
- **Validación**: Esquemas Zod para validación de datos
- **Sanitización**: Limpieza de entrada de datos

### Rendimiento

- **Paginación**: Carga eficiente de listas grandes
- **Filtros**: Búsqueda y filtrado optimizado
- **Índices**: Base de datos optimizada para consultas frecuentes
- **Caché**: Consideraciones para implementación de caché

### UX/UI

- **Diseño Responsivo**: Adaptable a diferentes dispositivos
- **Navegación Intuitiva**: Estructura clara y accesible
- **Feedback Visual**: Estados de carga y errores
- **Acciones Rápidas**: Acceso directo a funciones comunes

## Integración con la Web

### Hook Personalizado

El módulo incluye `useBlogData.ts` con hooks especializados:

- `useBlogPosts()` - Posts con filtros
- `useBlogPost(slug)` - Post individual
- `useBlogCategories()` - Categorías
- `useBlogTags()` - Tags
- `useFeaturedPosts()` - Posts destacados
- `useRecentPosts()` - Posts recientes

### Componentes Reutilizables

Los componentes están diseñados para ser reutilizables en la web pública:

- Lista de posts con paginación
- Vista individual de post
- Filtros por categoría y tag
- Sistema de comentarios

## Instalación y Configuración

### 1. Base de Datos

```bash
# Ejecutar migración
cd packages/db
npx prisma db push

# Sembrar datos de ejemplo
node seed-blog.cjs
```

### 2. APIs

Las APIs están configuradas automáticamente en:
- `apps/api/src/app/api/admin/blog/` - APIs de administración
- `apps/api/src/app/api/blog/` - APIs públicas

### 3. Frontend

El módulo se integra automáticamente en el panel de administración:
- Sidebar actualizado con navegación del blog
- Páginas de gestión en `/blog/*`
- Hooks disponibles en `apps/web/src/hooks/useBlogData.ts`

## Uso

### Acceso al Módulo

1. Iniciar sesión como administrador
2. Navegar a "Blog" en el sidebar
3. Seleccionar la sección deseada:
   - **Dashboard**: Vista general
   - **Posts**: Gestión de artículos
   - **Categorías**: Organización de contenido
   - **Tags**: Etiquetas y palabras clave
   - **Comentarios**: Moderación de feedback

### Crear un Post

1. Ir a "Blog" > "Posts"
2. Hacer clic en "Nuevo Post"
3. Completar los campos requeridos:
   - Título y slug
   - Contenido (soporte HTML)
   - Categorías y tags
   - Imagen destacada
   - Configuración SEO
4. Guardar como borrador o publicar

### Gestionar Categorías

1. Ir a "Blog" > "Categorías"
2. Crear nuevas categorías con:
   - Nombre y slug
   - Descripción opcional
   - Color e icono
   - Orden de clasificación

## Mantenimiento

### Backups

- Los posts se respaldan automáticamente con la base de datos
- Considerar backup específico para contenido multimedia

### Monitoreo

- Revisar logs de errores en las APIs
- Monitorear rendimiento de consultas
- Verificar moderación de comentarios

### Actualizaciones

- Mantener dependencias actualizadas
- Revisar cambios en Prisma schema
- Actualizar hooks y componentes según sea necesario

## Próximas Mejoras

- **Editor WYSIWYG**: Interfaz visual para edición de contenido
- **Subida de Imágenes**: Gestión de archivos multimedia
- **Programación**: Publicación automática programada
- **Analytics**: Métricas de engagement y rendimiento
- **SEO Avanzado**: Optimización automática de contenido
- **Newsletter**: Integración con sistema de email
- **Redes Sociales**: Compartir automáticamente en redes sociales

## Soporte

Para problemas técnicos o preguntas sobre el módulo:

1. Revisar logs de la aplicación
2. Verificar configuración de base de datos
3. Comprobar permisos de administrador
4. Consultar documentación de Prisma y Next.js

---

**Versión**: 1.0.0  
**Última actualización**: Enero 2024  
**Mantenido por**: Equipo de Desarrollo del Polideportivo
