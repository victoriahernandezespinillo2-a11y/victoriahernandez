# Script para remover authOptions de todos los archivos de rutas de API
$files = @(
    "apps/api/src/app/api/admin/blog/categories/[id]/route.ts",
    "apps/api/src/app/api/admin/blog/categories/route.ts",
    "apps/api/src/app/api/admin/blog/posts/[id]/route.ts",
    "apps/api/src/app/api/admin/blog/posts/route.ts",
    "apps/api/src/app/api/admin/blog/tags/[id]/route.ts",
    "apps/api/src/app/api/admin/blog/tags/route.ts",
    "apps/api/src/app/api/admin/landing/activities/[id]/route.ts",
    "apps/api/src/app/api/admin/landing/activities/route.ts",
    "apps/api/src/app/api/admin/landing/faqs/[id]/route.ts",
    "apps/api/src/app/api/admin/landing/faqs/route.ts",
    "apps/api/src/app/api/admin/landing/hero/[id]/route.ts",
    "apps/api/src/app/api/admin/landing/hero/route.ts",
    "apps/api/src/app/api/admin/landing/info-cards/[id]/route.ts",
    "apps/api/src/app/api/admin/landing/info-cards/route.ts",
    "apps/api/src/app/api/admin/landing/sponsors/[id]/route.ts",
    "apps/api/src/app/api/admin/landing/sponsors/route.ts",
    "apps/api/src/app/api/admin/landing/sports/categories/[id]/route.ts",
    "apps/api/src/app/api/admin/landing/sports/categories/route.ts",
    "apps/api/src/app/api/admin/landing/sports/facilities/[id]/route.ts",
    "apps/api/src/app/api/admin/landing/sports/facilities/route.ts",
    "apps/api/src/app/api/admin/landing/stats/[id]/route.ts",
    "apps/api/src/app/api/admin/landing/stats/route.ts",
    "apps/api/src/app/api/admin/landing/testimonials/[id]/route.ts",
    "apps/api/src/app/api/admin/landing/testimonials/route.ts"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "Procesando: $file"
        
        # Leer el contenido del archivo
        $content = Get-Content $file -Raw
        
        # Remover la importación de authOptions
        $content = $content -replace "import \{ authOptions \} from '@/lib/auth';", ""
        
        # Remover authOptions de getServerSession
        $content = $content -replace "getServerSession\(authOptions\)", "getServerSession()"
        
        # Escribir el contenido actualizado
        Set-Content $file $content -NoNewline
        
        Write-Host "Completado: $file"
    } else {
        Write-Host "Archivo no encontrado: $file"
    }
}

Write-Host "Proceso completado!"
