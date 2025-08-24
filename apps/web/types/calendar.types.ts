export interface CalendarSlot {
  time: string;
  startTime: string;
  endTime: string;
  status: 'AVAILABLE' | 'BOOKED' | 'MAINTENANCE' | 'USER_BOOKED' | 'PAST' | 'UNAVAILABLE';
  color: string;
  message: string;
  conflicts: any[];
  available: boolean;
}

export interface CalendarData {
  courtId: string;
  date: string;
  duration: number;
  summary: {
    total: number;
    available: number;
    booked: number;
    maintenance: number;
    userBooked: number;
    past: number;
    unavailable: number;
  };
  slots: CalendarSlot[];
  legend: Record<string, { color: string; label: string }>;
}
