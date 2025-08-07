# 🗄️ Configuración de Base de Datos - Polideportivo

Esta guía te ayudará a configurar PostgreSQL localmente para el proyecto del polideportivo.

## 📋 Requisitos Previos

- Windows 10/11
- PowerShell (como administrador)
- Node.js 18+ instalado
- pnpm instalado

## 🚀 Instalación Rápida

### Opción 1: Script Automático (Recomendado)

1. **Ejecuta el script de configuración:**
   ```powershell
   # Ejecutar como administrador
   .\setup-database.ps1
   ```

### Opción 2: Instalación Manual

#### Paso 1: Instalar PostgreSQL

**Usando Chocolatey:**
```powershell
# Instalar Chocolatey si no lo tienes
Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# Instalar PostgreSQL
choco install postgresql
```

**Usando Scoop:**
```powershell
# Instalar Scoop si no lo tienes
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
irm get.scoop.sh | iex

# Instalar PostgreSQL
scoop install postgresql
```

**Descarga Manual:**
- Descarga desde: https://www.postgresql.org/download/windows/
- Ejecuta el instalador
- Configura la contraseña para el usuario `postgres`

#### Paso 2: Configurar Usuario y Base de Datos

1. **Abrir psql como postgres:**
   ```powershell
   psql -U postgres
   ```

2. **Crear usuario y base de datos:**
   ```sql
   CREATE USER polideportivo WITH PASSWORD 'polideportivo123';
   CREATE DATABASE polideportivo_db OWNER polideportivo;
   GRANT ALL PRIVILEGES ON DATABASE polideportivo_db TO polideportivo;
   \q
   ```

3. **Verificar conexión:**
   ```powershell
   $env:PGPASSWORD="polideportivo123"
   psql -U polideportivo -d polideportivo_db -c "SELECT version();"
   ```

## 🏗️ Configuración del Proyecto

### Paso 1: Instalar Dependencias

```bash
# Desde la raíz del proyecto
pnpm install
```

### Paso 2: Configurar Variables de Entorno

El archivo `.env` ya está configurado con:
```env
DATABASE_URL="postgresql://polideportivo:polideportivo123@localhost:5432/polideportivo_db?schema=public"
```

### Paso 3: Generar Cliente de Prisma

```bash
cd packages/db
npm run db:generate
```

### Paso 4: Crear Esquema de Base de Datos

```bash
# Aplicar el esquema a la base de datos
npm run db:push
```

### Paso 5: Poblar con Datos Iniciales

```bash
# Ejecutar el seed
npm run db:seed
```

## 📊 Datos de Ejemplo Incluidos

El seed creará:

### 🏢 Centro Deportivo
- **Polideportivo Oroquieta**
  - Dirección: Calle Principal 123, Oroquieta, Misamis Occidental
  - Teléfono: +63 88 123 4567
  - Email: info@polideportivo.com

### 🏀 Canchas (5)
1. **Cancha de Básquetbol 1** - ₱500/hora
2. **Cancha de Básquetbol 2** - ₱500/hora
3. **Cancha de Voleibol** - ₱400/hora
4. **Cancha de Tenis** - ₱600/hora
5. **Cancha de Fútbol Sala** - ₱700/hora

### 👥 Usuarios (4)
1. **admin@polideportivo.com** - Administrador Principal
2. **juan.dela.cruz@gmail.com** - Usuario con membresía mensual
3. **maria.santos@gmail.com** - Usuario con membresía trimestral
4. **pedro.garcia@gmail.com** - Usuario sin membresía

### 💳 Membresías
- **Mensual**: ₱2,000 (20 créditos, 10% descuento)
- **Trimestral**: ₱5,500 (60 créditos, 15% descuento)

### 💰 Reglas de Precios
- **Horario Pico** (18:00-21:00, L-V): +50% precio, 20% descuento miembros
- **Fin de Semana** (08:00-20:00, S-D): +30% precio, 15% descuento miembros

### 🏆 Torneo
- **Torneo de Básquetbol Enero 2025**
  - Formato: Eliminatorio
  - Inscripción: ₱1,000
  - Premio: ₱10,000

## 🛠️ Comandos Útiles

### Prisma
```bash
# Generar cliente
npm run db:generate

# Aplicar cambios al esquema
npm run db:push

# Crear migración
npm run db:migrate

# Abrir Prisma Studio
npm run db:studio

# Ejecutar seed
npm run db:seed
```

### PostgreSQL
```bash
# Conectar a la base de datos
psql -U polideportivo -d polideportivo_db

# Ver tablas
\dt

# Describir tabla
\d nombre_tabla

# Salir
\q
```

## 🔧 Solución de Problemas

### Error: "psql: command not found"
- Asegúrate de que PostgreSQL esté en el PATH
- Reinicia PowerShell después de la instalación

### Error: "password authentication failed"
- Verifica las credenciales en el archivo `.env`
- Asegúrate de que el usuario `polideportivo` existe

### Error: "database does not exist"
- Ejecuta el script de configuración nuevamente
- Crea la base de datos manualmente

### Error: "relation does not exist"
- Ejecuta `npm run db:push` para crear las tablas
- Verifica que el esquema de Prisma esté actualizado

## 🔒 Seguridad

### Credenciales de Desarrollo
- **Usuario**: polideportivo
- **Contraseña**: polideportivo123
- **Base de datos**: polideportivo_db

> ⚠️ **Importante**: Estas credenciales son solo para desarrollo local. En producción, usa credenciales seguras y variables de entorno.

## 📱 Acceso a Prisma Studio

Para explorar los datos visualmente:

```bash
cd packages/db
npm run db:studio
```

Esto abrirá Prisma Studio en http://localhost:5555

## 🔄 Reiniciar Base de Datos

Para limpiar y recrear todo:

```bash
# Eliminar y recrear base de datos
psql -U postgres -c "DROP DATABASE IF EXISTS polideportivo_db;"
psql -U postgres -c "CREATE DATABASE polideportivo_db OWNER polideportivo;"

# Aplicar esquema y seed
cd packages/db
npm run db:push
npm run db:seed
```

## 📞 Soporte

Si tienes problemas:
1. Revisa los logs de PostgreSQL
2. Verifica que el servicio esté ejecutándose
3. Confirma las credenciales en `.env`
4. Ejecuta el script de configuración nuevamente