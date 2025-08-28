#!/bin/bash

# Script para remover authOptions de todos los archivos de rutas de API
echo "Corrigiendo archivos de rutas de API..."

# Lista de archivos a corregir
files=(
    "apps/api/src/app/api/admin/blog/categories/[id]/route.ts"
    "apps/api/src/app/api/admin/blog/categories/route.ts"
    "apps/api/src/app/api/admin/blog/posts/[id]/route.ts"
    "apps/api/src/app/api/admin/blog/posts/route.ts"
    "apps/api/src/app/api/admin/blog/tags/[id]/route.ts"
    "apps/api/src/app/api/admin/blog/tags/route.ts"
    "apps/api/src/app/api/admin/landing/activities/[id]/route.ts"
    "apps/api/src/app/api/admin/landing/activities/route.ts"
    "apps/api/src/app/api/admin/landing/faqs/[id]/route.ts"
    "apps/api/src/app/api/admin/landing/faqs/route.ts"
    "apps/api/src/app/api/admin/landing/hero/[id]/route.ts"
    "apps/api/src/app/api/admin/landing/hero/route.ts"
    "apps/api/src/app/api/admin/landing/info-cards/[id]/route.ts"
    "apps/api/src/app/api/admin/landing/info-cards/route.ts"
    "apps/api/src/app/api/admin/landing/sponsors/[id]/route.ts"
    "apps/api/src/app/api/admin/landing/sponsors/route.ts"
    "apps/api/src/app/api/admin/landing/sports/categories/[id]/route.ts"
    "apps/api/src/app/api/admin/landing/sports/categories/route.ts"
    "apps/api/src/app/api/admin/landing/sports/facilities/[id]/route.ts"
    "apps/api/src/app/api/admin/landing/sports/facilities/route.ts"
    "apps/api/src/app/api/admin/landing/stats/[id]/route.ts"
    "apps/api/src/app/api/admin/landing/stats/route.ts"
    "apps/api/src/app/api/admin/landing/testimonials/[id]/route.ts"
    "apps/api/src/app/api/admin/landing/testimonials/route.ts"
)

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "Procesando: $file"
        
        # Remover la importación de authOptions
        sed -i "s/import { authOptions } from '\/\/\/lib\/auth';//g" "$file"
        
        # Remover authOptions de getServerSession
        sed -i "s/getServerSession(authOptions)/getServerSession()/g" "$file"
        
        echo "✓ Completado: $file"
    else
        echo "⚠ Archivo no encontrado: $file"
    fi
done

echo "Proceso completado!"


