-- AlterEnum: Add new promotion types to PromotionType enum
-- This migration adds REFERRAL_BONUS and DISCOUNT_CODE to the existing PromotionType enum

-- Step 1: Add new enum values
-- PostgreSQL supports adding enum values without recreating the enum
ALTER TYPE "PromotionType" ADD VALUE IF NOT EXISTS 'REFERRAL_BONUS';
ALTER TYPE "PromotionType" ADD VALUE IF NOT EXISTS 'DISCOUNT_CODE';

-- Step 2: Add comment for documentation
COMMENT ON TYPE "PromotionType" IS 'Available promotion types: SIGNUP_BONUS (registration bonus), RECHARGE_BONUS (topup bonus), USAGE_BONUS (usage rewards), REFERRAL_BONUS (referral rewards), DISCOUNT_CODE (promotional codes), SEASONAL (seasonal promotions)';

-- Step 3: Verify enum values (informational query, commented out for migration)
-- SELECT unnest(enum_range(NULL::"PromotionType"))::text as type;


