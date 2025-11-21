-- Agregar campo primary_sport a la tabla courts
ALTER TABLE "courts" 
ADD COLUMN IF NOT EXISTS "primary_sport" TEXT;

-- Crear índice para mejorar consultas
CREATE INDEX IF NOT EXISTS "courts_primary_sport_idx" ON "courts"("primary_sport");

