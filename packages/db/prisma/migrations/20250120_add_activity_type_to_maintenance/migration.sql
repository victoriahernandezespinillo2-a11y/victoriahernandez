-- Add activity_type and related fields to maintenance_schedules table
ALTER TABLE "public"."maintenance_schedules" 
ADD COLUMN "activity_type" "public"."ActivityType" NOT NULL DEFAULT 'MAINTENANCE';

-- Add activity_category field for specific categories
ALTER TABLE "public"."maintenance_schedules" 
ADD COLUMN "activity_category" TEXT;

-- Add instructor field for training and classes
ALTER TABLE "public"."maintenance_schedules" 
ADD COLUMN "instructor" TEXT;

-- Add capacity field for participants
ALTER TABLE "public"."maintenance_schedules" 
ADD COLUMN "capacity" INTEGER;

-- Add requirements field for special requirements
ALTER TABLE "public"."maintenance_schedules" 
ADD COLUMN "requirements" TEXT;

-- Add is_public field for public/private activities
ALTER TABLE "public"."maintenance_schedules" 
ADD COLUMN "is_public" BOOLEAN NOT NULL DEFAULT true;

-- Create index on activity_type for better query performance
CREATE INDEX "idx_maintenance_schedules_activity_type" ON "public"."maintenance_schedules"("activity_type");

-- Create index on activity_category for better query performance
CREATE INDEX "idx_maintenance_schedules_activity_category" ON "public"."maintenance_schedules"("activity_category");

-- Create index on instructor for better query performance
CREATE INDEX "idx_maintenance_schedules_instructor" ON "public"."maintenance_schedules"("instructor");
