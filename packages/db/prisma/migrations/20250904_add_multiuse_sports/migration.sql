-- Migración: add multiuse sports (courts/reservations) y catálogo Sport
-- Idempotente para ejecución segura en producción

-- 1) Tabla Sport
CREATE TABLE IF NOT EXISTS "Sport" (
  id         text PRIMARY KEY DEFAULT gen_random_uuid(),
  code       text UNIQUE NOT NULL,
  name       text NOT NULL,
  is_active  boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2) courts: is_multiuse (boolean), allowed_sports (text[])
ALTER TABLE "courts"
  ADD COLUMN IF NOT EXISTS "is_multiuse" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "allowed_sports" text[] NOT NULL DEFAULT ARRAY[]::text[];

-- 3) reservations: sport (text)
ALTER TABLE "reservations"
  ADD COLUMN IF NOT EXISTS "sport" text;

-- (Omitido) Triggers de updated_at no son necesarios; la app gestiona updated_at


