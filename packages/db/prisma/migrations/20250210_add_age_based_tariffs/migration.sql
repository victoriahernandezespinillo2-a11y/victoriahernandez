-- CreateEnum
CREATE TYPE "TariffSegment" AS ENUM ('INFANTIL', 'JOVEN', 'SENIOR', 'PERSONALIZADA');

CREATE TYPE "TariffEnrollmentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED');

-- CreateTable
CREATE TABLE "age_based_tariffs" (
    "id" TEXT NOT NULL,
    "segment" "TariffSegment" NOT NULL,
    "min_age" INTEGER NOT NULL,
    "max_age" INTEGER,
    "discount_percent" DECIMAL(65,30) NOT NULL,
    "description" TEXT,
    "requires_manual_approval" BOOLEAN NOT NULL DEFAULT TRUE,
    "valid_from" TIMESTAMP(3) NOT NULL,
    "valid_until" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "age_based_tariffs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tariff_enrollments" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "tariff_id" TEXT NOT NULL,
    "status" "TariffEnrollmentStatus" NOT NULL,
    "requested_at" TIMESTAMP(3) NOT NULL,
    "approved_at" TIMESTAMP(3),
    "approved_by" TEXT,
    "notes" TEXT,
    "document_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "tariff_enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tariff_enrollment_audit" (
    "id" TEXT NOT NULL,
    "enrollment_id" TEXT NOT NULL,
    "old_status" "TariffEnrollmentStatus" NOT NULL,
    "new_status" "TariffEnrollmentStatus" NOT NULL,
    "changed_by" TEXT,
    "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes_snapshot" TEXT,
    "metadata" JSONB,
    CONSTRAINT "tariff_enrollment_audit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "age_based_tariffs_is_active_valid_from_valid_until_idx" ON "age_based_tariffs" ("is_active", "valid_from", "valid_until");

CREATE INDEX "tariff_enrollments_user_id_status_idx" ON "tariff_enrollments" ("user_id", "status");

CREATE INDEX "tariff_enrollments_tariff_id_status_idx" ON "tariff_enrollments" ("tariff_id", "status");

CREATE INDEX "tariff_enrollment_audit_enrollment_id_idx" ON "tariff_enrollment_audit" ("enrollment_id");

-- AddForeignKey
ALTER TABLE "tariff_enrollments" ADD CONSTRAINT "tariff_enrollments_tariff_id_fkey" FOREIGN KEY ("tariff_id") REFERENCES "age_based_tariffs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "tariff_enrollments" ADD CONSTRAINT "tariff_enrollments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "tariff_enrollments" ADD CONSTRAINT "tariff_enrollments_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "tariff_enrollment_audit" ADD CONSTRAINT "tariff_enrollment_audit_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "tariff_enrollments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "tariff_enrollment_audit" ADD CONSTRAINT "tariff_enrollment_audit_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

