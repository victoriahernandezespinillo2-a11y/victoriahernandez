declare module 'date-fns-tz' {
  export function zonedTimeToUtc(date: Date | string | number, timeZone: string): Date;
  export function utcToZonedTime(date: Date | string | number, timeZone: string): Date;
  export function formatInTimeZone(
    date: Date | string | number,
    timeZone: string,
    formatStr: string,
    options?: any
  ): string;
}
