# Script para remover authOptions de archivos con corchetes en el nombre
$files = @(
    "apps/api/src/app/api/admin/blog/categories/[id]/route.ts",
    "apps/api/src/app/api/admin/blog/posts/[id]/route.ts",
    "apps/api/src/app/api/admin/blog/tags/[id]/route.ts",
    "apps/api/src/app/api/admin/landing/activities/[id]/route.ts",
    "apps/api/src/app/api/admin/landing/faqs/[id]/route.ts",
    "apps/api/src/app/api/admin/landing/hero/[id]/route.ts",
    "apps/api/src/app/api/admin/landing/info-cards/[id]/route.ts",
    "apps/api/src/app/api/admin/landing/sponsors/[id]/route.ts",
    "apps/api/src/app/api/admin/landing/sports/categories/[id]/route.ts",
    "apps/api/src/app/api/admin/landing/sports/facilities/[id]/route.ts",
    "apps/api/src/app/api/admin/landing/stats/[id]/route.ts",
    "apps/api/src/app/api/admin/landing/testimonials/[id]/route.ts"
)

foreach ($file in $files) {
    # Escapar los corchetes para PowerShell
    $escapedFile = $file -replace '\[', '``[' -replace '\]', '``]'
    
    if (Test-Path $escapedFile) {
        Write-Host "Procesando: $file"
        
        # Leer el contenido del archivo
        $content = Get-Content $escapedFile -Raw
        
        # Remover la importación de authOptions
        $content = $content -replace "import \{ authOptions \} from '@/lib/auth';", ""
        
        # Remover authOptions de getServerSession
        $content = $content -replace "getServerSession\(authOptions\)", "getServerSession()"
        
        # Escribir el contenido actualizado
        Set-Content $escapedFile $content -NoNewline
        
        Write-Host "Completado: $file"
    } else {
        Write-Host "Archivo no encontrado: $file"
    }
}

Write-Host "Proceso completado!"


