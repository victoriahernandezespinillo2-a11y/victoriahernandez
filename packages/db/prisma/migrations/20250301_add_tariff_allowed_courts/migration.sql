CREATE TABLE "tariff_allowed_courts" (
    "tariff_id" TEXT NOT NULL,
    "court_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "tariff_allowed_courts_pkey" PRIMARY KEY ("tariff_id","court_id")
);

CREATE INDEX "tariff_allowed_courts_court_id_idx" ON "tariff_allowed_courts" ("court_id");

ALTER TABLE "tariff_allowed_courts" ADD CONSTRAINT "tariff_allowed_courts_tariff_id_fkey" FOREIGN KEY ("tariff_id") REFERENCES "age_based_tariffs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "tariff_allowed_courts" ADD CONSTRAINT "tariff_allowed_courts_court_id_fkey" FOREIGN KEY ("court_id") REFERENCES "courts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

