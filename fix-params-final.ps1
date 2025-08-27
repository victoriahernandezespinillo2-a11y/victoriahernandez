# Script final para arreglar los parámetros de ruta en Next.js 15
$files = @(
    "apps\api\src\app\api\admin\landing\sponsors\[id]\route.ts",
    "apps\api\src\app\api\admin\landing\sports\categories\[id]\route.ts",
    "apps\api\src\app\api\admin\landing\sports\facilities\[id]\route.ts",
    "apps\api\src\app\api\admin\landing\stats\[id]\route.ts",
    "apps\api\src\app\api\admin\landing\testimonials\[id]\route.ts"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "Procesando: $file"
        
        $content = Get-Content $file -Raw
        
        # Reemplazar las definiciones de parámetros
        $content = $content -replace 'export async function GET\(\s*request: NextRequest,\s*\{ params \}: \{ params: \{ id: string \} \}\)', 'export async function GET(`n  request: NextRequest,`n  { params }: { params: Promise<{ id: string }> }`n) {`n  const { id } = await params;'
        
        $content = $content -replace 'export async function PUT\(\s*request: NextRequest,\s*\{ params \}: \{ params: \{ id: string \} \}\)', 'export async function PUT(`n  request: NextRequest,`n  { params }: { params: Promise<{ id: string }> }`n) {`n  const { id } = await params;'
        
        $content = $content -replace 'export async function DELETE\(\s*request: NextRequest,\s*\{ params \}: \{ params: \{ id: string \} \}\)', 'export async function DELETE(`n  request: NextRequest,`n  { params }: { params: Promise<{ id: string }> }`n) {`n  const { id } = await params;'
        
        # Reemplazar las referencias a params.id
        $content = $content -replace 'params\.id', 'id'
        
        # Escribir el contenido de vuelta al archivo
        Set-Content -Path $file -Value $content -NoNewline
        
        Write-Host "Completado: $file"
    } else {
        Write-Host "Archivo no encontrado: $file"
    }
}

Write-Host "Proceso completado!"
