-- Migración: add_court_sport_pricing
-- Permite precios específicos por deporte para canchas multiuso
-- Idempotente para ejecución segura en producción

-- Crear tabla court_sport_pricing
CREATE TABLE IF NOT EXISTS "court_sport_pricing" (
  "id" TEXT NOT NULL,
  "court_id" TEXT NOT NULL,
  "sport" TEXT NOT NULL,
  "price_per_hour" DECIMAL(65,30) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  
  CONSTRAINT "court_sport_pricing_pkey" PRIMARY KEY ("id")
);

-- Crear índice único para evitar precios duplicados por deporte
CREATE UNIQUE INDEX IF NOT EXISTS "court_sport_pricing_court_id_sport_key" 
  ON "court_sport_pricing"("court_id", "sport");

-- Crear índice para consultas rápidas por cancha
CREATE INDEX IF NOT EXISTS "court_sport_pricing_court_id_idx" 
  ON "court_sport_pricing"("court_id");

-- Agregar foreign key constraint con CASCADE para eliminación automática
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'court_sport_pricing_court_id_fkey'
  ) THEN
    ALTER TABLE "court_sport_pricing" 
    ADD CONSTRAINT "court_sport_pricing_court_id_fkey" 
    FOREIGN KEY ("court_id") 
    REFERENCES "courts"("id") 
    ON DELETE CASCADE 
    ON UPDATE CASCADE;
  END IF;
END $$;

-- Migración de datos existentes:
-- Para canchas multiuso existentes, copiar basePricePerHour a cada deporte permitido
INSERT INTO "court_sport_pricing" ("id", "court_id", "sport", "price_per_hour", "created_at", "updated_at")
SELECT 
  gen_random_uuid()::text AS "id",
  c."id" AS "court_id",
  sport AS "sport",
  c."base_price_per_hour" AS "price_per_hour",
  NOW() AS "created_at",
  NOW() AS "updated_at"
FROM "courts" c
CROSS JOIN LATERAL unnest(c."allowed_sports") AS sport
WHERE c."is_multiuse" = true
  AND array_length(c."allowed_sports", 1) > 0
  AND NOT EXISTS (
    SELECT 1 FROM "court_sport_pricing" csp
    WHERE csp."court_id" = c."id" 
    AND csp."sport" = sport::text
  )
ON CONFLICT ("court_id", "sport") DO NOTHING;

