# Script para arreglar los parámetros de ruta en Next.js 15
$apiPath = "apps/api/src/app/api"

# Buscar todos los archivos de rutas dinámicas
$files = Get-ChildItem -Path $apiPath -Recurse -Filter "*.ts" | Where-Object { $_.FullName -match "\[id\]" }

foreach ($file in $files) {
    Write-Host "Procesando: $($file.FullName)"
    
    $content = Get-Content $file.FullName
    
    # Reemplazar las definiciones de parámetros
    $content = $content -replace 'export async function GET\(\s*request: NextRequest,\s*\{ params \}: \{ params: \{ id: string \} \}\)', 'export async function GET(`n  request: NextRequest,`n  { params }: { params: Promise<{ id: string }> }`n) {`n  const { id } = await params;'
    
    $content = $content -replace 'export async function PUT\(\s*request: NextRequest,\s*\{ params \}: \{ params: \{ id: string \} \}\)', 'export async function PUT(`n  request: NextRequest,`n  { params }: { params: Promise<{ id: string }> }`n) {`n  const { id } = await params;'
    
    $content = $content -replace 'export async function DELETE\(\s*request: NextRequest,\s*\{ params \}: \{ params: \{ id: string \} \}\)', 'export async function DELETE(`n  request: NextRequest,`n  { params }: { params: Promise<{ id: string }> }`n) {`n  const { id } = await params;'
    
    # Reemplazar las referencias a params.id
    $content = $content -replace 'params\.id', 'id'
    
    # Escribir el contenido de vuelta al archivo
    Set-Content -Path $file.FullName -Value $content
    
    Write-Host "Completado: $($file.FullName)"
}

Write-Host "Proceso completado!"
