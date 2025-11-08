export const DEFAULT_MAX_ADVANCE_DAYS = 90;
export const MAX_ALLOWED_ADVANCE_DAYS = 365;
export const MIN_ALLOWED_ADVANCE_DAYS = 1;

function coercePositiveInteger(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return Math.trunc(parsed);
    }
  }
  return null;
}

export function resolveMaxAdvanceDays(settings: any): number {
  const raw = coercePositiveInteger(settings?.reservations?.maxAdvanceDays);
  if (raw == null) {
    return DEFAULT_MAX_ADVANCE_DAYS;
  }

  if (raw < MIN_ALLOWED_ADVANCE_DAYS) return MIN_ALLOWED_ADVANCE_DAYS;
  if (raw > MAX_ALLOWED_ADVANCE_DAYS) return MAX_ALLOWED_ADVANCE_DAYS;
  return raw;
}

export function resolveMinAdvanceHours(settings: any): number {
  const raw = coercePositiveInteger(settings?.reservations?.minAdvanceHours);
  if (raw == null) return 0;
  return Math.max(0, raw);
}

export function exceedsMaxAdvance(date: Date, now: Date, maxAdvanceDays: number): boolean {
  const msPerDay = 24 * 60 * 60 * 1000;
  const diffMs = date.getTime() - now.getTime();
  return diffMs > maxAdvanceDays * msPerDay;
}

export function validateWithinAdvanceWindow(date: Date, now: Date, maxAdvanceDays: number): boolean {
  return !exceedsMaxAdvance(date, now, maxAdvanceDays);
}



