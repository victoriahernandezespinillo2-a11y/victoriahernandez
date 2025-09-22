# 📚 Documentación del Sistema de Gestión Polideportivo

Esta aplicación contiene la documentación completa del sistema de gestión para polideportivos, incluyendo manuales de usuario, administración, documentación técnica y información de garantías y soporte.

## ⚙️ Características

- **Manual de Usuario**: Guía completa para clientes del polideportivo
- **Manual de Administración**: Guía para propietarios y administradores
- **Documentación Técnica**: Arquitectura, deployment y mantenimiento
- **Garantías y Soporte**: Información sobre garantías y soporte técnico

## 🛠️ Tecnologías Utilizadas

- **Next.js 15** con App Router
- **React 18** con TypeScript
- **Tailwind CSS** para estilos
- **Lucide React** para iconos
- **Componentes UI** personalizados

## 📋 Estructura del Proyecto

```
apps/docs/
├── app/
│   ├── page.tsx                 # Página principal
│   ├── user-manual/            # Manual de usuario
│   ├── admin-manual/           # Manual de administración
│   ├── technical-docs/         # Documentación técnica
│   ├── warranty-support/       # Garantías y soporte
│   ├── layout.tsx              # Layout principal
│   └── globals.css             # Estilos globales
├── public/                     # Archivos estáticos
└── README.md                   # Este archivo
```

## 🛠️ Desarrollo

### Instalación de Dependencias

```bash
pnpm install
```

### Ejecutar en Modo Desarrollo

```bash
pnpm dev
```

La aplicación estará disponible en `http://localhost:3000`

### Build para Despliegue

```bash
pnpm build
```

### Iniciar Servidor de Despliegue

```bash
pnpm start
```

## 📖 Secciones de Documentación

### 1. Manual de Usuario (`/user-manual`)
- Guía para clientes del polideportivo
- Instrucciones para reservas, membresías, tienda
- Control de acceso con QR
- Gestión del monedero digital

### 2. Manual de Administración (`/admin-manual`)
- Guía para propietarios y administradores
- Gestión de canchas y reservas
- Control de pagos y reportes
- Administración de usuarios y productos

### 3. Documentación Técnica (`/technical-docs`)
- Arquitectura del sistema
- Guía de deployment
- Procedimientos de mantenimiento
- Información de seguridad

### 4. Garantías y Soporte (`/warranty-support`)
- Detalles de garantía (24 meses)
- Canales de soporte técnico
- SLA y compromisos de servicio
- Política de actualizaciones

## 🎨 Personalización

### Colores y Tema
Los colores principales están definidos en las clases de Tailwind CSS:
- **Azul**: Para secciones de usuario
- **Verde**: Para secciones de administración
- **Púrpura**: Para documentación técnica
- **Naranja**: Para garantías y soporte

### Iconos
Se utilizan iconos de Lucide React. Para agregar nuevos iconos:
1. Importar desde `lucide-react`
2. Usar con las clases de tamaño apropiadas

### Componentes
La documentación utiliza componentes del paquete `@repo/ui`:
- `Button`
- `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`
- `Badge`

## 📱 Responsive Design

La documentación está optimizada para:
- **Móvil**: Diseño adaptativo con navegación simplificada
- **Tablet**: Layout de dos columnas
- **Desktop**: Layout completo con múltiples columnas

## 🔧 Configuración

### Variables de Entorno
No se requieren variables de entorno especiales para la documentación.

### Metadata SEO
La aplicación incluye metadata optimizada para SEO:
- Títulos descriptivos
- Descripciones relevantes
- Open Graph tags
- Keywords apropiadas

## 📦 Deployment

### Vercel (Recomendado)
```bash
# Instalar Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Docker
```bash
# Build de la imagen
docker build -t docs .

# Ejecutar contenedor
docker run -p 3000:3000 docs
```

### Servidor Tradicional
```bash
# Build para despliegue
pnpm build

# Los archivos estáticos estarán en .next/
# Servir con cualquier servidor web estático
```

## 🤝 Contribución

Para contribuir a la documentación:

1. **Fork** el repositorio
2. **Crear** una rama para tu feature (`git checkout -b feature/nueva-seccion`)
3. **Commit** tus cambios (`git commit -am 'Agregar nueva sección'`)
4. **Push** a la rama (`git push origin feature/nueva-seccion`)
5. **Crear** un Pull Request

### Guías de Estilo

- Usar **español** para todo el contenido
- Mantener **tono profesional** pero accesible
- Incluir **iconos** apropiados para cada sección
- Usar **colores consistentes** con el tema
- Asegurar **responsividad** en todos los dispositivos

## 📞 Soporte

Para soporte técnico relacionado con la documentación:
- **Email**: soporte@polideportivo.com
- **Teléfono**: +34 900 123 456
- **Chat**: Disponible en el panel de administración

## 📄 Licencia

Este proyecto es parte del Sistema de Gestión Polideportivo y está cubierto por la misma licencia del proyecto principal.

---

**Última actualización**: ${new Date().toLocaleDateString('es-ES')}
**Versión**: 2.0
**Estado**: ✅ Completado y operativo