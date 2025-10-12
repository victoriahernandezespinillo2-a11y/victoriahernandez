-- AlterTable: Add referral system fields to users table
-- This migration adds referredBy and referralCode fields to support referral bonuses

-- Add referral fields to users table
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "referred_by" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "referral_code" TEXT;

-- Create unique index for referral_code
CREATE UNIQUE INDEX IF NOT EXISTS "users_referral_code_key" ON "users"("referral_code");

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "users_referred_by_idx" ON "users"("referred_by");
CREATE INDEX IF NOT EXISTS "users_referral_code_idx" ON "users"("referral_code");

-- Add foreign key constraint for referred_by
ALTER TABLE "users" ADD CONSTRAINT "users_referred_by_fkey" 
FOREIGN KEY ("referred_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Comment on the new fields
COMMENT ON COLUMN "users"."referred_by" IS 'ID of the user who referred this user';
COMMENT ON COLUMN "users"."referral_code" IS 'Unique referral code for this user to share with others';

