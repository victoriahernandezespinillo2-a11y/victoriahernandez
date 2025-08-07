# Script para configurar PostgreSQL usando Docker
# Ejecutar en PowerShell

Write-Host "Configurando PostgreSQL con Docker para Polideportivo..." -ForegroundColor Green

# Verificar si Docker esta instalado
Write-Host "Verificando instalacion de Docker..." -ForegroundColor Yellow

try {
    $dockerVersion = docker --version
    Write-Host "Docker encontrado: $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "Docker no esta instalado." -ForegroundColor Red
    Write-Host "Descarga Docker Desktop desde: https://www.docker.com/products/docker-desktop" -ForegroundColor Yellow
    Write-Host "O instala Docker usando winget: winget install Docker.DockerDesktop" -ForegroundColor Yellow
    exit 1
}

# Verificar si Docker esta ejecutandose
Write-Host "Verificando que Docker este ejecutandose..." -ForegroundColor Yellow

try {
    docker info | Out-Null
    Write-Host "Docker esta ejecutandose correctamente" -ForegroundColor Green
} catch {
    Write-Host "Docker no esta ejecutandose. Inicia Docker Desktop" -ForegroundColor Red
    exit 1
}

# Detener contenedor existente si existe
Write-Host "Verificando contenedores existentes..." -ForegroundColor Yellow
$existingContainer = docker ps -a --filter "name=polideportivo-postgres" --format "{{.Names}}"
if ($existingContainer) {
    Write-Host "Deteniendo contenedor existente..." -ForegroundColor Yellow
    docker stop polideportivo-postgres
    docker rm polideportivo-postgres
}

# Crear y ejecutar contenedor PostgreSQL
Write-Host "Creando contenedor PostgreSQL..." -ForegroundColor Yellow

try {
    docker run -d `
        --name polideportivo-postgres `
        -e POSTGRES_DB=polideportivo_db `
        -e POSTGRES_USER=polideportivo `
        -e POSTGRES_PASSWORD=polideportivo123 `
        -p 5432:5432 `
        postgres:15
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Contenedor PostgreSQL creado exitosamente" -ForegroundColor Green
    } else {
        Write-Host "Error al crear contenedor PostgreSQL" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "Error al ejecutar Docker: $_" -ForegroundColor Red
    exit 1
}

# Esperar a que PostgreSQL este listo
Write-Host "Esperando a que PostgreSQL este listo..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Verificar que el contenedor este ejecutandose
$runningContainer = docker ps --filter "name=polideportivo-postgres" --format "{{.Names}}"
if ($runningContainer) {
    Write-Host "PostgreSQL esta ejecutandose en Docker" -ForegroundColor Green
} else {
    Write-Host "Error: El contenedor no esta ejecutandose" -ForegroundColor Red
    exit 1
}

Write-Host "" 
Write-Host "Configuracion de PostgreSQL con Docker completada!" -ForegroundColor Green
Write-Host "" 
Write-Host "Informacion de conexion:" -ForegroundColor Cyan
Write-Host "   Host: localhost" -ForegroundColor White
Write-Host "   Puerto: 5432" -ForegroundColor White
Write-Host "   Base de datos: polideportivo_db" -ForegroundColor White
Write-Host "   Usuario: polideportivo" -ForegroundColor White
Write-Host "   Contrasena: polideportivo123" -ForegroundColor White
Write-Host "" 
Write-Host "URL de conexion:" -ForegroundColor Cyan
Write-Host "   postgresql://polideportivo:polideportivo123@localhost:5432/polideportivo_db" -ForegroundColor White
Write-Host "" 
Write-Host "Proximos pasos:" -ForegroundColor Cyan
Write-Host "   1. cd packages/db" -ForegroundColor White
Write-Host "   2. pnpm db:push" -ForegroundColor White
Write-Host "   3. pnpm db:seed" -ForegroundColor White
Write-Host "" 
Write-Host "Comandos utiles:" -ForegroundColor Cyan
Write-Host "   Detener: docker stop polideportivo-postgres" -ForegroundColor White
Write-Host "   Iniciar: docker start polideportivo-postgres" -ForegroundColor White
Write-Host "   Ver logs: docker logs polideportivo-postgres" -ForegroundColor White
Write-Host "   Conectar: docker exec -it polideportivo-postgres psql -U polideportivo -d polideportivo_db" -ForegroundColor White