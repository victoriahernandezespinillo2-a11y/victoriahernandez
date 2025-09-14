-- Ensure reservations.sport column exists (prod safety)
ALTER TABLE "reservations"
  ADD COLUMN IF NOT EXISTS "sport" text;










