-- Migration: Add requires_check_in field to products table
-- This field determines if a product requires physical check-in when purchased
-- Default value is false to maintain backward compatibility

-- Add the requires_check_in column to products table
ALTER TABLE "public"."products" ADD COLUMN "requires_check_in" BOOLEAN NOT NULL DEFAULT false;

-- Add comment to document the purpose of this field
COMMENT ON COLUMN "public"."products"."requires_check_in" IS 'Indicates if this product requires physical check-in when purchased (e.g., physical items vs digital services)';

-- Create index for better query performance when filtering products that require check-in
CREATE INDEX "products_requires_check_in_idx" ON "public"."products"("requires_check_in");

-- Update existing products to set requires_check_in based on their type
-- Physical products should require check-in, digital services should not
UPDATE "public"."products" 
SET "requires_check_in" = true 
WHERE "type" = 'PHYSICAL' OR "category" IN ('bebidas', 'snacks', 'comida', 'merchandise');

-- Log the migration completion
INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
VALUES (
  gen_random_uuid()::text,
  'add_requires_check_in_to_products_checksum',
  NOW(),
  '20250120120000_add_requires_check_in_to_products',
  'Added requires_check_in field to products table with proper indexing and default values',
  NULL,
  NOW(),
  1
);





