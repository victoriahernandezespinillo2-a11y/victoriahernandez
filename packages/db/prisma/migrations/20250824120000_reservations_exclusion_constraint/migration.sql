-- Enable GiST btree operator classes for equality on text and other scalar types
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Prevent overlapping reservations on the same court for blocking statuses
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'reservations_no_time_overlap'
  ) THEN
    ALTER TABLE public.reservations
      ADD CONSTRAINT reservations_no_time_overlap
      EXCLUDE USING gist (
        court_id WITH =,
        tsrange(start_time, end_time, '[)') WITH &&
      )
      WHERE (
        status IN (
          'PENDING'::"public"."ReservationStatus",
          'PAID'::"public"."ReservationStatus",
          'IN_PROGRESS'::"public"."ReservationStatus"
        )
      );
  END IF;
END $$;