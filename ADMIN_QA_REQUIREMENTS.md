### Auditoría QA integral y requerimientos para 100% operativo (Administrador + API + Web)

Este documento consolida los hallazgos y define los requerimientos para llevar el sistema a un estado totalmente operativo, seguro y autogestionable. Incluye backlog priorizado, criterios de aceptación y dependencias externas.

---

### 1) Resumen ejecutivo (prioridades P0 → P3)

- **P0 Núcleo Operativo**: Configuración persistente, calendario de reservas, CRUD completo de membresías, detalle de usuarios, mantenimiento CRUD + bloqueos, notificaciones (envío/borrado/preferencias), detalle de pagos, export de reportes, control de acceso (check-out + fallback iOS), unificación CORS/ENV.
- **P1 Marketing/Contenido**: Blog CMS (backend + admin) y web pública del blog; cupones/promos; segmentación básica; campañas email/SMS/push.
- **P2 Calidad/Operación**: Observabilidad (Sentry/Logs/PostHog), jobs/cron, backups y restauración probada, E2E críticos, 2FA para admin/staff, hardening de seguridad (CSP/headers).
- **P3 Optimización**: Cache/ETags, búsqueda (Algolia/Meilisearch), performance (imágenes/CDN), trazas, analytics avanzados y atribución.

---

### 2) Infraestructura y configuración

- **Unificar variables de entorno (todos los proyectos: admin, api, web)**
  - AUTH_SECRET, NEXTAUTH_SECRET (mismo valor en los tres)
  - NEXTAUTH_COOKIE_NAME = `next-auth.session-token`
  - NEXTAUTH_URL (admin/web según dominio)
  - NEXT_PUBLIC_API_URL (admin y web → URL pública de la API)
  - API: `ALLOWED_ORIGINS` incluyendo dominios finales (web/admin) y `https://polideportivo-admin.vercel.app`
  - DB: `DATABASE_URL`, `DIRECT_DATABASE_URL`
  - Integraciones: `STRIPE_*`, `SMTP_*` (SendGrid/SES), `TWILIO_*`, `PUSH_*` (OneSignal/FCM), `CLOUDINARY_*` o `S3_*`, `REDIS_URL`, `SENTRY_DSN`, `POSTHOG_KEY`
- **CORS**: centralizar en `withCors`; eliminar listas rígidas locales (p. ej. notificaciones/actividad) → usar `ALLOWED_ORIGINS`.
- **Dominios/SSL**: definir dominios finales (web, admin, api) y apuntar DNS.

Aceptación
- Conjunto de `.env` por app validado; consola sin 401/CORS; healthchecks verdes.

---

### 3) Autenticación y sesiones

- Cookies `Secure`, `HttpOnly`, `SameSite=Lax/Strict` según dominio.
- Rotación periódica de secretos; expiración y revocación de sesiones de admin.
- 2FA opcional para usuarios con rol `ADMIN`/`STAFF`.
- Página de “sesiones activas” y cierre remoto.
- Auditoría de login (éxito/fallo) con bloqueo progresivo tras intentos.

Aceptación
- Inicio/cierre de sesión estable en todos los navegadores; 2FA configurable; logs de eventos.

---

### 4) API/Backend (calidad y consistencia)

- Errores: formato consistente `{ error, code, traceId, details[] }` con `traceId` en header/response.
- Validación Zod en todas las rutas admin; tipado fuerte de payloads.
- Idempotencia en operaciones sensibles (pagos, check-in/out, reembolsos).
- Colas/jobs para tareas diferidas (emails, envíos, webhooks) con Redis.
- Versionado `v1` de la API; deprecations documentadas.
- Backups automáticos de DB y estrategia de restore; migraciones revisadas en CI.

Aceptación
- Suite de tests de contrato para endpoints admin críticos; políticas de reintento/timeout documentadas.

---

### 5) Funcionalidad del Administrador (gap → 100%)

#### 5.1 Configuración (`/settings`)
- Conectar UI a `GET/PUT /api/admin/settings` (persistencia real)
- Validaciones por campo; permisos por rol; feedback de guardado

#### 5.2 Calendario de reservas
- Integrar `WeekCalendar` en Reservas y Canchas
- Endpoint: `/api/admin/courts/[id]/availability`; bloqueos por mantenimiento; creación rápida

#### 5.3 Usuarios
- Página `/users/[id]` con pestañas: Perfil, Reservas, Pagos, Membresías, Auditoría
- Acciones: cambio de rol/estado, reset de contraseña, desactivar/activar

#### 5.4 Membresías
- CRUD de planes/tipos; asignación a usuarios; reactivar/renovar/suspender
- KPIs por plan (activos, ingresos, churn)

#### 5.5 Mantenimiento
- Crear/editar/cerrar tareas; adjuntos y responsables
- Bloqueo automático de disponibilidad; calendario de mantenimiento

#### 5.6 Notificaciones
- Envío manual (email/SMS/push) → `/api/notifications/send`
- Borrar notificación; preferencias por categoría/canal; plantillas reutilizables

#### 5.7 Pagos
- Detalle/acciones: ver provider/intent, recibos, reembolsos; conciliación simple; exportación

#### 5.8 Reportes
- Exportar CSV/PDF; segmentación por centro/cancha/periodo; programaciones (cron) y envío por email

#### 5.9 Control de acceso
- Check-out; fallback iOS para QR (decoder JS)
- Listado de últimos accesos; alertas en tiempo real (opcional WS)

#### 5.10 Cupones/Promos (nuevo)
- CRUD cupones: tipo (%, fijo), vigencia, usos, por centro/cancha; tracking de uso e impacto

#### 5.11 Blog CMS (nuevo)
- Backend + admin: posts, categorías, etiquetas, media, programación, revisiones, SEO

Aceptación general
- Todos los módulos con flujos de CRUD, filtros, paginación y permisos; sin 401/403 inesperados; KPIs renderizan sin errores.

---

### 6) Web pública (dependencias del admin)

- **Blog**: `/blog`, `/blog/[slug]`, `/blog/categoria/[slug]`, `/blog/tag/[slug]`; buscador; paginación
- SEO: `generateMetadata`, OG/Twitter, JSON‑LD Article, `sitemap.xml`, `rss.xml`
- Integración de CTAs (reservar ahora, promociones activas)

Aceptación
- Lighthouse ≥ 90 (PWA opcional), validación de SEO (meta/OG/Schema) y sitemap/rss generados.

---

### 7) Observabilidad y DevOps

- Sentry (errores), Logtail/Datadog (logs), PostHog (product analytics), UptimeRobot (uptime)
- Tracing opcional con OpenTelemetry en API crítica
- Healthchecks: DB, colas, jobs
- CI/CD: lint, typecheck, unit + contract tests, E2E críticos (Playwright), previsualizaciones
- Backups: DB diaria (retención ≥30 días), prueba de restore trimestral
- Cron: Vercel Cron o Trigger.dev/QStash (reportes, recordatorios, limpiezas)

Aceptación
- Alertas configuradas; paneles con métricas; E2E verdes en PRs; backups visibles y restaurables.

---

### 8) Seguridad y cumplimiento

- Headers: CSP, HSTS, X-Frame-Options, X-Content-Type-Options; Helmet
- Sanitización de HTML (editor rico) y validación strict
- Anti‑spam (reCAPTCHA/hCaptcha) para formularios/comentarios
- GDPR: consentimiento granular, centro de preferencias, retención de datos, anonimizado de logs, DPA con proveedores
- Enmascaramiento/omisión de PII en logs y trazas

Aceptación
- Scanner de seguridad sin hallazgos críticos; pruebas manuales de XSS/CSRF/Clickjacking; documentación de políticas.

---

### 9) Rendimiento y escalabilidad

- Cache de lecturas (SWR/HTTP cache/Redis), ETag/Last‑Modified; paginación consistente
- Imágenes con CDN/transformaciones (Cloudinary o S3+imgproxy); compresión y lazy
- ISR con revalidate on‑demand desde admin

Aceptación
- TTFB y Core Web Vitals dentro de objetivos; stress test básico sin regresiones.

---

### 10) Datos y búsqueda

- Índices DB en consultas clave: reservas (fecha/cancha/centro), pagos (estado/fecha), notificaciones (user/estado)
- Búsqueda: Meilisearch/Algolia para blog y admin (usuarios/reservas)

Aceptación
- EXPLAIN sin full scans innecesarios; latencias de consulta < 200ms en listados principales.

---

### 11) Testing (plan mínimo)

- Unit: servicios (pricing, notificaciones, mantenimiento)
- Contract/API: supertest con esquemas zod (admin endpoints)
- E2E (Playwright): login, CRUD usuarios, crear reserva, check‑in/out, reembolso, notificación, export reporte
- Smoke post‑deploy: status de API, dashboard, reservas GET

Aceptación
- Cobertura mínima 70% en dominios críticos; E2E verdes en pipeline.

---

### 12) Servicios externos a contratar/conectar

- Email: SendGrid o AWS SES (transaccional + plantillas React Email)
- SMS/WhatsApp: Twilio (o Vonage)
- Push: OneSignal o Firebase Cloud Messaging
- Pagos: Stripe (webhooks activos; panel de conciliación)
- Almacenamiento: Cloudinary (o S3/R2) para media/OG/recibos
- Cola/Cache: Upstash Redis
- Observabilidad: Sentry + Logtail/Datadog + UptimeRobot; PostHog
- Búsqueda: Meilisearch (self) o Algolia (SaaS)
- Cron/Jobs: Vercel Cron o Trigger.dev/QStash

Variables tipo (ejemplos)
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM`
- `ONESIGNAL_APP_ID`/`FCM_*`
- `CLOUDINARY_URL` o `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY`/`S3_BUCKET`
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`

---

### 13) Roadmap por sprints (propuesto)

- **Sprint 1 (P0 Core)**: Settings persistente; Calendario; Usuarios `[id]`; Membresías CRUD/acciones; CORS/ENV unificados
- **Sprint 2**: Notificaciones (envío/borrado/preferencias); Mantenimiento CRUD + bloqueos; Pagos detalle; Reportes export/segmentación; Acceso check‑out/fallback iOS
- **Sprint 3 (Marketing/Contenido)**: Blog CMS backend+admin y web pública; Cupones/Promos; Segmentación básica y campañas
- **Sprint 4 (Calidad/Operación)**: Observabilidad completa; E2E; backups/cron; 2FA; CSP/headers; colas

Cada sprint con entregables demo + checklist QA + documentación.

---

### 14) Checklists de entrega

#### Config/Infra
- [ ] Variables de entorno alineadas (admin/api/web) y documentadas
- [ ] ALLOWED_ORIGINS y CORS verificados
- [ ] Dominios y certificados listos

#### Seguridad
- [ ] Headers de seguridad activos; CSP sin violaciones
- [ ] 2FA habilitable para admin/staff
- [ ] Logs sin PII sensible

#### Funcionalidad Admin
- [ ] Settings guarda/recupera
- [ ] Calendario con disponibilidad real
- [ ] Usuarios `[id]` con pestañas y acciones
- [ ] Membresías CRUD + acciones
- [ ] Mantenimiento CRUD + bloqueos
- [ ] Notificaciones envío/borrado/preferencias
- [ ] Pagos detalle y reembolsos
- [ ] Reportes export y segmentación
- [ ] Acceso check-in/out estable (QR fallback iOS)

#### Observabilidad/Calidad
- [ ] Sentry/Logs/PostHog activos con alertas
- [ ] E2E críticos verdes en CI/CD
- [ ] Backups configurados y restauración probada

#### Web/Blog
- [ ] `/blog` + detalle + taxonomías + RSS + sitemap
- [ ] SEO (OG/JSON‑LD) validado

---

### 15) Decisiones pendientes

- Almacenamiento de media: ¿Cloudinary vs S3/R2?
- Editor del blog: ¿MDX con bloques o WYSIWYG?
- Comentarios del blog: on/off, moderación y captcha
- Idiomas del blog: `es` único vs multi‑idioma
- Métricas objetivo: SLAs/SLIs (latencias, uptime, CWV)

---

### 16) Apéndice: Modelo de datos sugerido para Blog CMS (Prisma)

- `Post(id, slug, status[draft|scheduled|published|archived], publishedAt, createdById, updatedById)`
- `PostRevision(id, postId, title, excerpt, content, meta, createdAt)`
- `PostTranslation(id, postId, locale, title, excerpt, content, slug)` (si multi‑idioma)
- `Category(id, slug, name)`; `Tag(id, slug, name)`; `PostTag(postId, tagId)`
- `Author(id, name, bio, avatarUrl)` o relación a `User`
- `MediaAsset(id, url, type, width, height, alt, createdById)`
- `Comment(id, postId, authorName/email, content, status[pending|approved|hidden])`

---

Fin del documento.


