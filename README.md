## Polideportivo Victoria Hernández — Monorepo Full‑Stack

Reservas, membresías, torneos, pagos y administración en un único monorepo productivo.

- Framework: Next.js 15 (apps: `web`, `admin`, `api`) + React 19
- Backend: API REST con middlewares (auth, roles, CORS, rate‑limit, logging, validación con Zod)
- Base de datos: Prisma + PostgreSQL (Supabase) con RLS y PgBouncer
- Autenticación: NextAuth v5 (JWT), cookies aisladas por app, providers (credenciales, Google opcional)
- Monorepo: Turborepo + pnpm workspaces
- UI: Tailwind CSS

### Estructura

```
polideportivo-platform/
├─ apps/
│  ├─ web/      # Frontend usuario (puerto 3001)
│  ├─ admin/    # Panel administrador (puerto 3003)
│  └─ api/      # Backend REST (puerto 3002)
├─ packages/
│  ├─ auth/     # Config/handlers NextAuth compartidos
│  ├─ db/       # Prisma Client y utilidades DB
│  └─ ui/       # Componentes UI compartidos
├─ turbo.json   # Pipelines Turborepo
└─ pnpm-workspace.yaml
```

### Requisitos

- Node.js 20+
- pnpm 8+
- Supabase (Postgres con SSL activo)

### Variables de entorno (resumen)

- Raíz (`.env`):
  - `DATABASE_URL=postgresql://...:6543/...?...&pgbouncer=true&sslmode=require`
  - `DIRECT_DATABASE_URL=postgresql://...:5432/...?...&sslmode=require`
  - `AUTH_SECRET` (o `NEXTAUTH_SECRET`)

- `apps/web/.env.local` (dev):
  - `NEXTAUTH_URL=http://localhost:3001`
  - `AUTH_URL=http://localhost:3001`
  - `NEXTAUTH_COOKIE_NAME=next-auth.session-token-web`

- `apps/admin/.env.local` (dev):
  - `NEXTAUTH_URL=http://localhost:3003`
  - `AUTH_URL=http://localhost:3003`
  - `NEXTAUTH_COOKIE_NAME=next-auth.session-token-3003`
  - `NEXT_PUBLIC_API_URL=http://localhost:3002` (si no se usan rewrites)

Notas:
- `packages/db` normaliza `DATABASE_URL` (SSL, PgBouncer) y usa `DIRECT_DATABASE_URL` para migraciones.
- Cookies de sesión aisladas por app para evitar colisiones.

### Instalación

```bash
pnpm install
```

### Base de datos (Prisma + Supabase)

```bash
pnpm --filter @repo/db exec prisma generate
pnpm --filter @repo/db exec prisma db push
```

Crear usuario admin (solo en desarrollo; no usar credenciales reales aquí):

```bash
# Ejemplo (DEV). Define variables en tu .env.local, nunca en README ni en commits.
$env:ADMIN_EMAIL="admin@example.com"
$env:ADMIN_PASSWORD="cambiale-esto"
pnpm --filter @repo/db exec tsx src/scripts/create-admin.ts
```

Importante (seguridad):
- No publiques correos/contraseñas en documentación o en el repositorio.
- Usa archivos .env(.local) ignorados por Git y gestores de secretos.
- En producción, crea el admin mediante interfaz/automatización segura y rota credenciales si se expusieron.

### Desarrollo

```bash
pnpm dev
```

Puertos: web 3001, api 3002, admin 3003.

Rewrites (evitar CORS en dev):
- `apps/web/next.config.js` y `apps/admin/next.config.js` proxyean `/api/*` a `api` excepto `/api/auth/*`.
- El cliente del `web` usa base relativa y `credentials: 'include'`.

### Autenticación

- NextAuth v5 (JWT) desde `packages/auth`.
- Middlewares de autorización por rol en `apps/api/src/lib/middleware`.

### Middlewares API clave

- `withAuth`, `withRole`, `withCors`, `withRateLimit`, `withLogging`, `withErrorHandling`.

### Scripts útiles

- Listado rápido de usuarios: `polideportivo-platform/list-users.js`
- Crear admin: `packages/db/src/scripts/create-admin.ts`

### Despliegue (resumen)

- Vercel para `web` y `admin`.
- `api` en Vercel (Node.js runtime) con Prisma y `DATABASE_URL` con SSL.

### Licencia

Privado/Propietario.
