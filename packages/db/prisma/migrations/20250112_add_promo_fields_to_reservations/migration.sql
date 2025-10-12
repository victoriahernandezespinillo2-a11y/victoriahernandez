-- AlterTable: Add promo fields to reservations
-- This migration adds promoCode and promoDiscount fields to track promotional codes applied to reservations

-- Add promo code field
ALTER TABLE "reservations" ADD COLUMN "promo_code" TEXT;

-- Add promo discount field
ALTER TABLE "reservations" ADD COLUMN "promo_discount" DECIMAL(15,4) DEFAULT 0;

-- Add comments for documentation
COMMENT ON COLUMN "reservations"."promo_code" IS 'Código promocional aplicado a esta reserva';
COMMENT ON COLUMN "reservations"."promo_discount" IS 'Descuento aplicado por código promocional';

-- Add index for promo code lookups
CREATE INDEX "reservations_promo_code_idx" ON "reservations"("promo_code");
