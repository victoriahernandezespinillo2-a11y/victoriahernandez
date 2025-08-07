# Script de configuracion de base de datos para Polideportivo
# Ejecutar como administrador en PowerShell

Write-Host "Configurando base de datos para Polideportivo..." -ForegroundColor Green

# Verificar si PostgreSQL esta instalado
Write-Host "Verificando instalacion de PostgreSQL..." -ForegroundColor Yellow

try {
    $pgVersion = psql --version
    Write-Host "PostgreSQL encontrado: $pgVersion" -ForegroundColor Green
} catch {
    Write-Host "PostgreSQL no esta instalado." -ForegroundColor Red
    Write-Host "Descarga PostgreSQL desde: https://www.postgresql.org/download/windows/" -ForegroundColor Yellow
    Write-Host "O instala usando Chocolatey: choco install postgresql" -ForegroundColor Yellow
    Write-Host "O instala usando Scoop: scoop install postgresql" -ForegroundColor Yellow
    exit 1
}

# Verificar si el servicio de PostgreSQL esta ejecutandose
Write-Host "Verificando servicio de PostgreSQL..." -ForegroundColor Yellow

$pgService = Get-Service -Name "postgresql*" -ErrorAction SilentlyContinue
if ($pgService) {
    if ($pgService.Status -eq "Running") {
        Write-Host "Servicio de PostgreSQL esta ejecutandose" -ForegroundColor Green
    } else {
        Write-Host "Iniciando servicio de PostgreSQL..." -ForegroundColor Yellow
        Start-Service $pgService.Name
        Write-Host "Servicio de PostgreSQL iniciado" -ForegroundColor Green
    }
} else {
    Write-Host "Servicio de PostgreSQL no encontrado" -ForegroundColor Red
    Write-Host "Asegurate de que PostgreSQL este instalado correctamente" -ForegroundColor Yellow
    exit 1
}

# Crear usuario y base de datos
Write-Host "Configurando usuario y base de datos..." -ForegroundColor Yellow

# Comandos SQL para ejecutar
$sqlCommands = @"
CREATE USER polideportivo WITH PASSWORD 'polideportivo123';
CREATE DATABASE polideportivo_db OWNER polideportivo;
GRANT ALL PRIVILEGES ON DATABASE polideportivo_db TO polideportivo;
"@

# Guardar comandos en archivo temporal
$tempSqlFile = Join-Path $env:TEMP "setup_polideportivo.sql"
$sqlCommands | Out-File -FilePath $tempSqlFile -Encoding UTF8

try {
    # Ejecutar comandos SQL como superusuario postgres
    Write-Host "Creando usuario y base de datos..." -ForegroundColor Yellow
    psql -U postgres -f $tempSqlFile
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Usuario y base de datos creados exitosamente" -ForegroundColor Green
    } else {
        Write-Host "Algunos comandos pueden haber fallado (es normal si ya existen)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "Error al crear usuario y base de datos: $_" -ForegroundColor Red
    Write-Host "Asegurate de que el usuario 'postgres' tenga permisos" -ForegroundColor Yellow
} finally {
    # Limpiar archivo temporal
    Remove-Item $tempSqlFile -ErrorAction SilentlyContinue
}

# Verificar conexion
Write-Host "Verificando conexion a la base de datos..." -ForegroundColor Yellow

try {
    $env:PGPASSWORD = "polideportivo123"
    psql -U polideportivo -d polideportivo_db -c 'SELECT version();'
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Conexion a la base de datos exitosa" -ForegroundColor Green
    } else {
        Write-Host "Error al conectar a la base de datos" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "Error al verificar conexion: $_" -ForegroundColor Red
    exit 1
} finally {
    Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
}

Write-Host "" 
Write-Host "Configuracion de base de datos completada!" -ForegroundColor Green
Write-Host "" 
Write-Host "Informacion de conexion:" -ForegroundColor Cyan
Write-Host "   Host: localhost" -ForegroundColor White
Write-Host "   Puerto: 5432" -ForegroundColor White
Write-Host "   Base de datos: polideportivo_db" -ForegroundColor White
Write-Host "   Usuario: polideportivo" -ForegroundColor White
Write-Host "   Contraseña: polideportivo123" -ForegroundColor White
Write-Host "" 
Write-Host "URL de conexion:" -ForegroundColor Cyan
Write-Host "   postgresql://polideportivo:polideportivo123@localhost:5432/polideportivo_db" -ForegroundColor White
Write-Host "" 
Write-Host "Proximos pasos:" -ForegroundColor Cyan
Write-Host "   1. cd packages/db" -ForegroundColor White
Write-Host "   2. npm run db:push" -ForegroundColor White
Write-Host "   3. npm run db:seed" -ForegroundColor White
Write-Host ""