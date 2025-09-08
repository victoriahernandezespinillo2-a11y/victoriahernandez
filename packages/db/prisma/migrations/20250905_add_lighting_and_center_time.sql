-- Idempotent migration to align DB with app schema (lighting + center day/night + multiuse safety)
-- Safe for production: uses IF NOT EXISTS and preserves existing data

-- 1) courts: multiuse (if previous migration not applied)
ALTER TABLE "courts"
  ADD COLUMN IF NOT EXISTS "is_multiuse" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "allowed_sports" text[] NOT NULL DEFAULT ARRAY[]::text[];

-- 2) courts: lighting support
ALTER TABLE "courts"
  ADD COLUMN IF NOT EXISTS "has_lighting" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "lighting_extra_per_hour" numeric NULL;

-- 3) centers: timezone and day/night boundaries
ALTER TABLE "centers"
  ADD COLUMN IF NOT EXISTS "timezone" text NULL,
  ADD COLUMN IF NOT EXISTS "day_start" text NULL,
  ADD COLUMN IF NOT EXISTS "night_start" text NULL;

-- 4) reservations: lighting audit fields
ALTER TABLE "reservations"
  ADD COLUMN IF NOT EXISTS "lighting_selected" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "lighting_extra_total" numeric NOT NULL DEFAULT 0;

-- 5) defaults for existing rows (optional sensible defaults)
UPDATE "centers"
SET "timezone" = COALESCE("timezone", 'America/Bogota'),
    "day_start" = COALESCE("day_start", '06:00'),
    "night_start" = COALESCE("night_start", '18:00');

-- 6) comments for clarity (no-op on engines that ignore COMMENT)
COMMENT ON COLUMN "courts"."has_lighting" IS 'Indica si la cancha dispone de iluminación artificial';
COMMENT ON COLUMN "courts"."lighting_extra_per_hour" IS 'Precio adicional por hora cuando el usuario elige iluminación en horario diurno';
COMMENT ON COLUMN "centers"."day_start" IS 'Inicio del día local (HH:MM)';
COMMENT ON COLUMN "centers"."night_start" IS 'Inicio de la noche local (HH:MM)';
COMMENT ON COLUMN "reservations"."lighting_selected" IS 'Si el usuario seleccionó iluminación o fue obligatoria por la noche';
COMMENT ON COLUMN "reservations"."lighting_extra_total" IS 'Monto cobrado por iluminación en la reserva';





