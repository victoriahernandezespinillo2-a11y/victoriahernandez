# Script de PowerShell para eliminar todas las reservas
# Uso: .\delete-reservations.ps1

Write-Host "🗑️  SCRIPT DE ELIMINACIÓN DE RESERVAS" -ForegroundColor Red
Write-Host "=====================================" -ForegroundColor Red
Write-Host ""

# Verificar que estamos en el directorio correcto
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Error: Este script debe ejecutarse desde el directorio packages/db" -ForegroundColor Red
    exit 1
}

# Verificar que Node.js está instalado
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js detectado: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: Node.js no está instalado o no está en el PATH" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "⚠️  ADVERTENCIA:" -ForegroundColor Yellow
Write-Host "   - Este script eliminará TODAS las reservas de la base de datos" -ForegroundColor Yellow
Write-Host "   - Esta acción NO se puede deshacer" -ForegroundColor Yellow
Write-Host "   - Solo se eliminarán las reservas, NO otros datos" -ForegroundColor Yellow
Write-Host ""

$choice = Read-Host "¿Quieres continuar? (S/N)"

if ($choice -eq "S" -or $choice -eq "s" -or $choice -eq "Y" -or $choice -eq "y") {
    Write-Host ""
    Write-Host "🔄 Ejecutando script de eliminación..." -ForegroundColor Cyan
    
    try {
        node delete-all-reservations.cjs
        Write-Host ""
        Write-Host "✅ Script ejecutado exitosamente" -ForegroundColor Green
    } catch {
        Write-Host ""
        Write-Host "❌ Error ejecutando el script: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host ""
    Write-Host "❌ Operación cancelada por el usuario" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Presiona cualquier tecla para continuar..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
