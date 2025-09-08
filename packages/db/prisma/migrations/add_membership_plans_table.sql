-- Migration: Add membership_plans table
-- This migration adds a new table to store configurable membership plans

-- Create the membership_plans table
CREATE TABLE IF NOT EXISTS "membership_plans" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "monthly_price" DECIMAL(65,30) NOT NULL,
    "description" TEXT,
    "benefits" JSONB NOT NULL DEFAULT '{}',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_popular" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "membership_plans_pkey" PRIMARY KEY ("id")
);

-- Create unique constraint on type
CREATE UNIQUE INDEX IF NOT EXISTS "membership_plans_type_key" ON "membership_plans"("type");

-- Create index for active plans and sorting
CREATE INDEX IF NOT EXISTS "membership_plans_is_active_sort_order_idx" ON "membership_plans"("is_active", "sort_order");

-- Insert default membership plans
INSERT INTO "membership_plans" (
    "id", "name", "type", "monthly_price", "description", "benefits", "is_active", "is_popular", "sort_order"
) VALUES 
    (
        'basic-plan',
        'Básica',
        'BASIC',
        29.99,
        'Plan básico con descuentos mínimos',
        '{"discountPercentage": 5, "priorityBooking": false, "freeHours": 0, "guestPasses": 0, "accessToEvents": false, "personalTrainer": false}',
        true,
        false,
        1
    ),
    (
        'premium-plan',
        'Premium',
        'PREMIUM',
        49.99,
        'Plan premium con beneficios intermedios',
        '{"discountPercentage": 15, "priorityBooking": true, "freeHours": 2, "guestPasses": 2, "accessToEvents": true, "personalTrainer": false}',
        true,
        true,
        2
    ),
    (
        'vip-plan',
        'VIP',
        'VIP',
        79.99,
        'Plan VIP con todos los beneficios',
        '{"discountPercentage": 25, "priorityBooking": true, "freeHours": 5, "guestPasses": 5, "accessToEvents": true, "personalTrainer": true}',
        true,
        false,
        3
    )
ON CONFLICT ("type") DO NOTHING;

-- Add comment to the table
COMMENT ON TABLE "membership_plans" IS 'Planes de membresía configurables por el administrador';
