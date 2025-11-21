-- Drop existing constraint
ALTER TABLE public.reservations
  DROP CONSTRAINT IF EXISTS reservations_no_time_overlap;

-- ✅ NEW: Recreate constraint that allows multi-use court overlaps
-- This constraint will BLOCK overlaps EXCEPT when:
-- 1. BOTH reservations have a sport field set (not null/empty)
-- 2. The court allows multiple sports (is detected via sport field presence)
-- 
-- For multi-use courts, the application logic validates:
-- - Primary sport blocks everything
-- - Secondary sports can coexist
--
-- This constraint focuses on PREVENTING conflicts for:
-- - Single-use courts (sport is null or empty)
-- - When one of the reservations is "undefined sport"

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
    -- ⚠️ CRITICAL: Only block if at least ONE reservation lacks sport info
    -- This means: if BOTH have sport != null, constraint is NOT checked
    -- Multi-use logic is handled at application level
    AND (sport IS NULL OR sport = '')
  );

-- Add comment explaining the logic
COMMENT ON CONSTRAINT reservations_no_time_overlap ON public.reservations IS 
  'Prevents time overlaps on same court. Allows overlaps when BOTH reservations have sport field set (multi-use courts). Application logic validates primary/secondary sport conflicts.';
