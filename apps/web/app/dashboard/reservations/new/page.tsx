"use client";

import { useEffect, useMemo, useState } from 'react';
import '@/app/styles/mobile-animations.css';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  CreditCard,
  ArrowLeft,
  Check,
  AlertCircle,
  Smartphone,
  Monitor,
  X,
  Lightbulb,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import PaymentModal from '@/app/components/PaymentModal';
import { api } from '@/lib/api';
import { useCourts, usePricing } from '@/lib/hooks';
import { ErrorHandler } from '../../../../lib/error-handler';
import { useFirebaseAuth } from '@/components/auth/FirebaseAuthProvider';
import { useSession } from 'next-auth/react';

import CalendarVisualModal from '@/components/CalendarVisualModal';
import { MobileCourtSelector } from '@/app/components/MobileCourtSelector';
import { MobileCalendar } from '@/app/components/MobileCalendar';
import { DesktopCalendar } from '@/components/DesktopCalendar';
import MobilePaymentModal from '@/app/components/MobilePaymentModal';
import { CalendarSlot } from '@/types/calendar.types';

// Hook para detectar dispositivo móvil
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkDevice = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  return isMobile;
}

const DEFAULT_MAX_ADVANCE_DAYS = 90;

const formatYMD = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const addDaysLocal = (date: Date, days: number) => {
  const clone = new Date(date);
  clone.setHours(0, 0, 0, 0);
  clone.setDate(clone.getDate() + days);
  return clone;
};

const clampDateString = (value: string, min: string, max: string) => {
  if (!value) return min;
  if (value < min) return min;
  if (value > max) return max;
  return value;
};

const toDisplayDate = (value: string) => {
  if (!value) return '';
  const segments = value.split('-').map((segment) => Number(segment));
  const [yRaw, mRaw, dRaw] = segments;
  const now = new Date();
  const year = typeof yRaw === 'number' && Number.isFinite(yRaw) ? yRaw : now.getFullYear();
  const month = typeof mRaw === 'number' && Number.isFinite(mRaw) ? mRaw : now.getMonth() + 1;
  const day = typeof dRaw === 'number' && Number.isFinite(dRaw) ? dRaw : now.getDate();
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

interface Court {
  id: string;
  name: string;
  type: string;
  capacity: number;
  pricePerHour: number;
  amenities: string[];
  image?: string;
  lightingExtraPerHour?: number;
  isMultiuse?: boolean;
  allowedSports?: string[];
  sportPricing?: Record<string, number>;
  sportType?: string;
  centerId?: string;
}

interface TimeSlot {
  time: string;
  startTime: string;
  endTime: string;
  status: 'AVAILABLE' | 'BOOKED' | 'MAINTENANCE' | 'MAINTENANCE_OVERRIDE' | 'USER_BOOKED' | 'PAST' | 'UNAVAILABLE';
  available: boolean;
  price: number;
  message?: string;
  activityType?: string;
}



// Datos reales se cargan desde la API

// Los slots se calcularán desde el backend en base a disponibilidad real

export default function NewReservationPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { courts, getCourts } = useCourts();
  const { pricing, calculatePrice, reset: resetPricing } = usePricing();
  const isMobile = useIsMobile();
  const { firebaseUser, loading: authLoading } = useFirebaseAuth();

  // Estado para forzar vista móvil/escritorio
  const [forceMobileView, setForceMobileView] = useState(false);
  const shouldUseMobileView = isMobile || forceMobileView;
  const [step, setStep] = useState(1);
  const [centers, setCenters] = useState<any[]>([]);
  const [selectedCenter, setSelectedCenter] = useState<any | null>(null);
  const [selectedSport, setSelectedSport] = useState<string>('');
  const [selectedCourt, setSelectedCourt] = useState<Court | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [duration, setDuration] = useState<number>(60);
  const [notes, setNotes] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [timeSlots, setTimeSlots] = useState<any[]>([]);
  const [loadingTimeSlots, setLoadingTimeSlots] = useState(false);
  const [loadingReservation, setLoadingReservation] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [createdReservationId, setCreatedReservationId] = useState<string | null>(null);
  const [selectedCalendarSlot, setSelectedCalendarSlot] = useState<CalendarSlot | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<CalendarSlot | null>(null);
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<number>(60);
  const [lightingSelected, setLightingSelected] = useState<boolean>(false);
  const [courtSearchTerm, setCourtSearchTerm] = useState<string>('');

  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [showTimeSlotsDesktop, setShowTimeSlotsDesktop] = useState(false);
  const [showUserBookedActions, setShowUserBookedActions] = useState(false);
  const [slotForActions, setSlotForActions] = useState<any | null>(null);
  const [conflictKind, setConflictKind] = useState<'none' | 'blocked' | 'user_owned'>('none');

  // Helper function to determine if a time slot is during day or night
  const isDayTime = (timeString: string): boolean => {
    console.log('🔍 [DEBUG] isDayTime called with:', { timeString, selectedCenter });

    if (!selectedCenter?.dayStart || !selectedCenter?.nightStart) {
      console.log('⚠️ [DEBUG] No dayStart/nightStart, defaulting to day time');
      return true;
    }

    const [hours, minutes] = timeString.split(':').map(Number);
    const slotMinutes = (hours || 0) * 60 + (minutes || 0);

    const dayStartMinutes = selectedCenter.dayStart.split(':').reduce((acc: number, part: string, i: number) =>
      acc + (i === 0 ? parseInt(part) * 60 : parseInt(part)), 0);
    const nightStartMinutes = selectedCenter.nightStart.split(':').reduce((acc: number, part: string, i: number) =>
      acc + (i === 0 ? parseInt(part) * 60 : parseInt(part)), 0);

    const isDay = slotMinutes >= dayStartMinutes && slotMinutes < nightStartMinutes;
    console.log('🔍 [DEBUG] Day calculation:', {
      slotMinutes,
      dayStartMinutes,
      nightStartMinutes,
      isDay
    });

    return isDay;
  };

  // Helper para obtener el precio correcto basado en el deporte seleccionado
  const getCourtPrice = (court: Court | null, selectedSport: string): number => {
    if (!court) return 0;
    
    // Si la cancha es multiuso y hay un deporte seleccionado, usar precio específico
    if (court.isMultiuse && selectedSport && court.sportPricing?.[selectedSport]) {
      return court.sportPricing[selectedSport];
    }
    
    // Usar precio base
    return court.pricePerHour;
  };

  // Calculate total price
  const totalPrice = useMemo(() => {
    if (!selectedCourt || !selectedDuration) return 0;

    const courtPrice = getCourtPrice(selectedCourt, selectedSport);
    const basePrice = (courtPrice * selectedDuration) / 60;

    // Add lighting cost if selected and it's day time
    let lightingCost = 0;
    if (lightingSelected && selectedSlot && isDayTime(selectedSlot.startTime)) {
      const lightingExtraPerHour = selectedCourt.lightingExtraPerHour || 0;
      lightingCost = (lightingExtraPerHour * selectedDuration) / 60;
    }

    return basePrice + lightingCost;
  }, [selectedCourt, selectedDuration, lightingSelected, selectedSlot]);

  // Función para cargar timeSlots desde la API
  const loadTimeSlots = async (courtId: string, date: string, duration: number, sport?: string) => {
    if (!courtId || !date) return;
    const clampedDate = clampDate(date);
    if (clampedDate !== date) {
      console.warn('[RESERVAS] Fecha fuera de rango, se ignoró la solicitud de slots');
      return;
    }

    setLoadingTimeSlots(true);
    try {
      console.log('🔴 [FRONTEND-DEBUG] Llamando a getCalendarStatus con los siguientes datos:', {
        courtId,
        date: clampedDate,
        duration,
        sport
      });
      const calendarData = await api.courts.getCalendarStatus(courtId, {
        date: clampedDate,
        duration,
        sport
      });

      // Convertir CalendarSlots a TimeSlots
      const convertedTimeSlots: TimeSlot[] = calendarData.slots.map((slot: any) => {
        const courtPrice = getCourtPrice(selectedCourt, selectedSport);
        const calculatedPrice = courtPrice ? (courtPrice * duration) / 60 : 0;

        // 🔍 LOG PARA DEBUGGING DEL PRECIO
        console.log('💰 [PRICE-DEBUG] Slot:', {
          startTime: slot.startTime,
          endTime: slot.endTime,
          originalPrice: slot.price,
          calculatedPrice: calculatedPrice,
          selectedDuration: selectedDuration,
          duration: duration, // ← NUEVO: mostrar el parámetro duration
          pricePerHour: selectedCourt?.pricePerHour
        });

        return {
          time: slot.time,
          startTime: slot.startTime,
          endTime: slot.endTime,
          status: slot.status,
          available: slot.available,
          price: calculatedPrice, // Usar el precio calculado correctamente
          message: slot.message,
          activityType: (() => {
            const m = Array.isArray(slot.conflicts) ? slot.conflicts.find((c: any) => c?.type === 'maintenance') : null;
            return m?.activityType;
          })()
        };
      });

      setTimeSlots(convertedTimeSlots);
    } catch (error) {
      console.error('Error cargando timeSlots:', error);
      setTimeSlots([]);
    } finally {
      setLoadingTimeSlots(false);
    }
  };

  // Cargar timeSlots cuando cambie la cancha, fecha o duración
  useEffect(() => {
    if (selectedCourt && selectedDate && !authLoading && firebaseUser) {
      loadTimeSlots(selectedCourt.id, selectedDate, duration, selectedSport);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCourt, selectedDate, duration, selectedSport, authLoading, firebaseUser]);

  // Cargar centros activos y preparar flujo dinámico
  useEffect(() => {
    if (authLoading || !firebaseUser) {
      console.log('🔍 [RESERVAS] Esperando autenticación...', { authLoading, hasUser: !!firebaseUser });
      return;
    }
    let mounted = true;
    (async () => {
      try {
        console.log('🔍 [RESERVAS] Cargando centros...');
        const list: any = await api.centers.getAll?.({ includeStats: false } as any);
        console.log('🔍 [RESERVAS] Respuesta de centros:', list);
        const arr = Array.isArray(list?.data) ? list.data : (Array.isArray(list) ? list : []);
        console.log('🔍 [RESERVAS] Centros procesados:', arr.length, arr);
        if (!mounted) return;
        setCenters(arr);
        if (arr.length === 1) {
          setSelectedCenter(arr[0]);
          // Cargar canchas del centro único
          console.log('🔍 [RESERVAS] Cargando canchas del centro único:', arr[0].id);
          await getCourts({ isActive: true, centerId: arr[0].id } as any);
          // El flujo comienza en Deporte
          setStep(1);
        } else {
          // Hay múltiples centros: el flujo comienza en Centro
          setStep(1);
        }
      } catch (e) {
        console.error('❌ [RESERVAS] Error cargando centros:', e);
        setCenters([]);
        // Mostrar error al usuario
        setError('Error al cargar centros deportivos. Por favor, recarga la página.');
      }
    })();
    return () => { mounted = false; };
  }, [authLoading, firebaseUser, getCourts]);

  // Cargar canchas cuando se selecciona centro
  useEffect(() => {
    if (!selectedCenter) return;
    getCourts({ isActive: true, centerId: selectedCenter.id } as any).catch(() => { });
  }, [selectedCenter, getCourts]);

  // Deportes disponibles a partir de las canchas (ya normalizadas a CourtDTO[] por el hook)
  const sports = useMemo(() => {
    const courtsArray: any[] = Array.isArray(courts) ? (courts as any[]) : [];
    const unique = new Set<string>();
    courtsArray.forEach((c: any) => { if (c?.sportType) unique.add(c.sportType); });
    return Array.from(unique);
  }, [courts]);

  // Canchas filtradas por deporte, centro y búsqueda
  const filteredCourts: any[] = useMemo(() => {
    let courtsArray: any[] = Array.isArray(courts) ? (courts as any[]) : [];

    // Filtrar por centro si corresponde
    if (selectedCenter) {
      courtsArray = courtsArray.filter((c: any) => c.centerId === selectedCenter.id);
    }

    // Filtrar por deporte
    if (selectedSport) {
      const normalize = (s: string) => (s || '').toUpperCase().trim();
      const selected = normalize(selectedSport);

      // Función auxiliar para verificar si un deporte es compatible con el seleccionado
      const isSportCompatible = (sport: string, selected: string): boolean => {
        const normalizedSport = normalize(sport);
        // Coincidencia exacta
        if (normalizedSport === selected) return true;
        // Compatibilidad familia fútbol: FOOTBALL incluye FOOTBALL7 y FUTSAL
        if (selected === 'FOOTBALL' && (normalizedSport === 'FOOTBALL7' || normalizedSport === 'FUTSAL')) return true;
        if (normalizedSport === 'FOOTBALL' && (selected === 'FOOTBALL7' || selected === 'FUTSAL')) return true;
        return false;
      };

      courtsArray = courtsArray.filter((c: any) => {
        const type = normalize((c as any).sportType);
        const allowed: string[] = Array.isArray((c as any).allowedSports) ? (c as any).allowedSports.map((x: string) => normalize(x)) : [];
        const isMultiuse = Boolean((c as any).isMultiuse);

        // 1) Coincidencia exacta por tipo de cancha
        if (isSportCompatible(type, selected)) return true;

        // 2) Cancha multiuso que permite el deporte seleccionado (o compatible)
        if (isMultiuse) {
          // Verificar si alguno de los deportes permitidos es compatible con el seleccionado
          // Comparar directamente los valores normalizados
          if (allowed.includes(selected)) return true;
          // También verificar compatibilidad (ej: FOOTBALL vs FUTSAL)
          if (allowed.some((sport: string) => isSportCompatible(sport, selected))) {
            return true;
          }
        }

        return false;
      });
    }

    // Filtrar por término de búsqueda (nombre de cancha)
    if (courtSearchTerm.trim()) {
      const searchLower = courtSearchTerm.toLowerCase().trim();
      courtsArray = courtsArray.filter((c: any) => {
        const name = (c.name || '').toLowerCase();
        return name.includes(searchLower);
      });
    }

    return courtsArray;
  }, [courts, selectedSport, selectedCenter, courtSearchTerm, selectedCourt]);

  const getSportIcon = (sport: string) => {
    switch (sport) {
      case 'FOOTBALL':
      case 'FOOTBALL7':
      case 'FUTSAL':
        return '⚽';
      case 'BASKETBALL':
        return '🏀';
      case 'TENNIS':
        return '🎾';
      case 'VOLLEYBALL':
        return '🏐';
      case 'PADDLE':
        return '🏓';
      case 'SQUASH':
        return '🎾';
      case 'MULTIPURPOSE':
        return '🏟️';
      default:
        return '🏅';
    }
  };

  const getSportLabel = (sport: string) => {
    switch (sport) {
      case 'FOOTBALL':
        return 'Fútbol';
      case 'FOOTBALL7':
        return 'Fútbol 7';
      case 'FUTSAL':
        return 'Futsal';
      case 'BASKETBALL':
        return 'Básquet';
      case 'TENNIS':
        return 'Tenis';
      case 'VOLLEYBALL':
        return 'Vóleibol';
      case 'PADDLE':
        return 'Pádel';
      case 'SQUASH':
        return 'Squash';
      case 'MULTIPURPOSE':
        return 'Multiuso';
      default:
        return sport;
    }
  };

  const baseCost = pricing?.total ?? (selectedCourt ? (getCourtPrice(selectedCourt, selectedSport) * (shouldUseMobileView ? selectedDuration : duration) / 60) : 0);

  // Add lighting cost if selected (day time) or if it's night time (automatic)
  // Support both desktop (selectedCalendarSlot) and mobile (selectedSlot)
  const currentSlot = selectedCalendarSlot || selectedSlot;
  const isCurrentlyDayTime = currentSlot ? isDayTime(currentSlot.startTime) : true;
  const lightingCost = (lightingSelected && isCurrentlyDayTime) || (!isCurrentlyDayTime)
    ? (selectedCourt?.lightingExtraPerHour || 0) * (shouldUseMobileView ? selectedDuration : duration) / 60
    : 0;

  const totalCost = baseCost + lightingCost;

  // Obtener fecha mínima (hoy)
  const today = new Date();
  const minDate = today.toISOString().split('T')[0];

  // Obtener fecha máxima (30 días desde hoy)
  const maxDate = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const handleSubmit = async (isRetry = false) => {
    if (!selectedCourt || !selectedDate || !selectedCalendarSlot) {
      alert('Por favor completa todos los campos requeridos');
      return;
    }
    if ((selectedCourt as any)?.sportType === 'MULTIPURPOSE' && !selectedSport) {
      alert('Selecciona el deporte para esta cancha multiuso.');
      return;
    }

    setIsLoading(true);
    try {
      // 🎯 CONSTRUIR DATETIME ISO VÁLIDO
      // selectedCalendarSlot.startTime puede ser "HH:MM" o ya un ISO
      let startTime: string;
      if (selectedCalendarSlot.startTime.includes('T')) {
        // Ya es un ISO datetime
        startTime = selectedCalendarSlot.startTime;
      } else {
        // Es formato "HH:MM", combinarlo con la fecha seleccionada
        startTime = new Date(`${selectedDate}T${selectedCalendarSlot.startTime}:00`).toISOString();
      }

      console.log('🎯 [DEBUG] Datos a enviar:', {
        courtId: selectedCourt.id,
        startTime,
        duration,
        notes,
        sport: selectedSport || (selectedCourt as any)?.sportType || undefined,
        selectedDate,
        originalStartTime: selectedCalendarSlot.startTime,
        courtSportType: (selectedCourt as any)?.sportType,
        isMultiuse: (selectedCourt as any)?.isMultiuse
      });

      console.log('🔍 [DEBUG] Enviando datos al backend:', {
        courtId: selectedCourt.id,
        startTime: startTime,
        duration,
        lightingSelected,
        notes,
        sport: selectedSport || (selectedCourt as any)?.sportType || undefined,
      });

      const res: any = await api.reservations.create({
        courtId: selectedCourt.id,
        startTime: startTime,
        duration,
        lightingSelected: lightingSelected,
        paymentMethod: 'redsys',
        notes,
        sport: selectedSport || (selectedCourt as any)?.sportType || undefined,
      } as any);
      const reservationId = res?.reservation?.id || res?.id;
      if (reservationId) {
        setCreatedReservationId(reservationId);
        setShowPaymentModal(true);
      } else {
        router.push('/dashboard/reservations');
      }
    } catch (error: any) {
      // Evitar ruido en conflictos recuperables
      const isConflict = error?.status === 409 || error?.message?.includes?.('Horario no disponible');
      if (!isConflict) {
        console.error('Error creating reservation:', error);
      }

      // Manejo específico de errores de conflicto de horario
      const msg = `${error?.message || ''} ${(error?.originalError?.error || '')}`.toLowerCase();
      if (error.status === 409 && (msg.includes('horario no disponible'))) {
        // Si no hemos reintentado aún, liberar y reintentar automáticamente
        if (!isRetry) {
          await releaseConflictsAndRetry();
          return;
        }
        // Si ya reintentamos, mostrar el modal con opciones
        setConflictKind('blocked');
        setError('conflict');
        setShowConflictModal(true);
      } else if (error.status === 409 && (msg.includes('usuario ya tiene una reserva') || msg.includes('ya tienes una reserva'))) {
        // Conflicto porque el propio usuario ya tiene una reserva en ese horario (pagada/confirmada)
        setConflictKind('user_owned');
        setError('conflict');
        setShowConflictModal(true);
      } else {
        // Error genérico con ErrorHandler
        const userMessage = ErrorHandler.handleError(error, {
          action: 'Crear reserva',
          endpoint: '/api/reservations',
          timestamp: new Date().toISOString()
        });

        // Mostrar mensaje específico al usuario
        alert(userMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Liberar reservas PENDING del usuario que bloquean el rango actual y reintentar
  const releaseConflictsAndRetry = async () => {
    try {
      if (!selectedCourt || !selectedDate || !selectedCalendarSlot) {
        setShowConflictModal(false);
        return;
      }

      // Construir inicio/fin como en handleSubmit
      let startTimeIso: string;
      if (selectedCalendarSlot.startTime.includes('T')) {
        startTimeIso = selectedCalendarSlot.startTime;
      } else {
        startTimeIso = new Date(`${selectedDate}T${selectedCalendarSlot.startTime}:00`).toISOString();
      }
      const endTimeIso = new Date(new Date(startTimeIso).getTime() + duration * 60 * 1000).toISOString();

      // Llamar al endpoint de liberación
      await fetch('/api/reservations/release-conflicts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ courtId: selectedCourt.id, startTime: startTimeIso, endTime: endTimeIso })
      });

      // Cerrar modal, recargar slots y reintentar creación
      setShowConflictModal(false);
      setError(null);
      if (selectedCourt?.id && selectedDate) {
        await loadTimeSlots(selectedCourt.id, selectedDate, selectedDuration, selectedSport);
      }
      await handleSubmit(true);
    } catch (e) {
      console.error('Error liberando conflictos y reintentando:', e);
      // Solo cerrar modal y dejar que el usuario vuelva a intentar
      setShowConflictModal(false);
    }
  };

  // Liberar un slot concreto marcado como USER_BOOKED (Mi reserva)
  const releaseSpecificSlot = async (slot: any) => {
    try {
      if (!selectedCourt || !selectedDate) return;

      // slot.startTime puede ser ISO o HH:MM
      let startTimeIso: string;
      if (slot.startTime?.includes('T')) {
        startTimeIso = slot.startTime;
      } else {
        startTimeIso = new Date(`${selectedDate}T${slot.startTime}:00`).toISOString();
      }
      const endTimeIso = slot.endTime?.includes?.('T')
        ? slot.endTime
        : new Date(new Date(startTimeIso).getTime() + (selectedDuration || duration) * 60 * 1000).toISOString();

      await fetch('/api/reservations/release-conflicts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ courtId: selectedCourt.id, startTime: startTimeIso, endTime: endTimeIso })
      });

      // Refrescar slots para liberar visualmente
      if (selectedCourt?.id && selectedDate) {
        await loadTimeSlots(selectedCourt.id, selectedDate, selectedDuration, selectedSport);
      }
    } catch (e) {
      console.error('Error al liberar slot USER_BOOKED:', e);
    }
  };

  // Ir a pagar la reserva pendiente solapada con el slot seleccionado
  const goToPayForSelected = () => {
    try {
      if (!selectedCalendarSlot || !selectedDate) return;
      let startIso: string;
      if (selectedCalendarSlot.startTime.includes('T')) {
        startIso = selectedCalendarSlot.startTime;
      } else {
        startIso = new Date(`${selectedDate}T${selectedCalendarSlot.startTime}:00`).toISOString();
      }
      setShowConflictModal(false);
      router.push(`/dashboard/reservations?payStart=${encodeURIComponent(startIso)}`);
    } catch {
      setShowConflictModal(false);
      router.push('/dashboard/reservations');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString: string) => toDisplayDate(dateString);



  // 🚀 MANEJAR MODAL DEL CALENDARIO VISUAL
  const handleOpenCalendarModal = () => {
    setShowCalendarModal(true);
  };

  const handleCloseCalendarModal = () => {
    setShowCalendarModal(false);
  };

  const handleCalendarSlotSelection = (slot: CalendarSlot) => {
    setSelectedCalendarSlot(slot);
    setShowCalendarModal(false);

    // Extraer la hora del slot seleccionado de forma robusta (HH:MM o ISO)
    const timeString = /^\d{2}:\d{2}$/.test(slot.startTime)
      ? slot.startTime
      : new Date(slot.startTime).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    setSelectedTime(timeString);
  };

  // Helper para formatear horas (acepta 'HH:MM' o ISO)
  const formatTime = (timeString: string) => {
    if (/^\d{2}:\d{2}$/.test(timeString)) return timeString;
    const parsed = new Date(timeString);
    if (!isNaN(parsed.getTime())) {
      return parsed.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    }
    const hhmm = timeString.match(/^(\d{2}):(\d{2})(?::\d{2})?$/);
    if (hhmm) {
      const composed = new Date(`${selectedDate}T${hhmm[0]}`);
      if (!isNaN(composed.getTime())) {
        return composed.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
      }
      return hhmm[0].slice(0, 5);
    }
    return timeString;
  };

  // 🚀 FUNCIÓN PARA CONFIRMAR Y CONTINUAR AL PAGO (YA NO SE USA - MANEJADO EN CALENDARVISUALMODAL)
  // Esta función se mantiene por compatibilidad pero ya no se ejecuta
  const handleConfirmAndContinue = async () => {
    // Funcionalidad movida a CalendarVisualModal.handleContinue
    console.log('handleConfirmAndContinue: Funcionalidad movida a CalendarVisualModal');
  };



  // 🎯 EL CALENDARIO VISUAL AHORA FUNCIONA A TRAVÉS DEL MODAL

  // 🎯 Calcular precio cuando se selecciona slot del calendario
  useEffect(() => {
    const run = async () => {
      try {
        if (!selectedCourt || !selectedCalendarSlot) return;
        // Usar un startTime en formato ISO válido para el endpoint de pricing
        const raw = selectedCalendarSlot.startTime;
        let startISO: string | null = null;
        if (/^\d{2}:\d{2}$/.test(raw)) {
          if (!selectedDate) return; // necesitamos fecha para componer ISO
          startISO = `${selectedDate}T${raw}:00.000Z`;
        } else {
          const d = new Date(raw);
          if (!isNaN(d.getTime())) {
            startISO = d.toISOString();
          }
        }
        if (!startISO) return;
        const payload: Record<string, any> = {
          courtId: selectedCourt.id,
          startTime: startISO,
          duration,
        };
        const userId = (session?.user as any)?.id;
        if (userId) {
          payload.userId = userId;
        }
        await calculatePrice(payload);
      } catch {
        // noop
      }
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCalendarSlot, session?.user?.id]);

  const todayYMD = useMemo(() => formatYMD(new Date()), []);

  const maxAdvanceDays = useMemo(() => {
    if (!selectedCenter) return DEFAULT_MAX_ADVANCE_DAYS;
    const raw = selectedCenter.bookingPolicy?.maxAdvanceDays ?? selectedCenter?.settings?.reservations?.maxAdvanceDays;
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return DEFAULT_MAX_ADVANCE_DAYS;
    const normalized = Math.trunc(parsed);
    return Math.min(Math.max(normalized, 1), 365);
  }, [selectedCenter]);

  const minSelectableDate = todayYMD;
  const maxSelectableDate = useMemo(() => formatYMD(addDaysLocal(new Date(), maxAdvanceDays)), [maxAdvanceDays]);

  const clampDate = useMemo(() => {
    return (dateValue: string) => clampDateString(dateValue, minSelectableDate, maxSelectableDate);
  }, [minSelectableDate, maxSelectableDate]);

  useEffect(() => {
    const clamped = clampDate(selectedDate || minSelectableDate);
    if (clamped !== selectedDate) {
      setSelectedDate(clamped);
    }
  }, [selectedDate, clampDate, minSelectableDate]);

  // ⏳ INDICADOR DE CARGA MIENTRAS FIREBASE VERIFICA EL ESTADO
  if (authLoading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="text-center">
          <svg className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-gray-600">Verificando sesión...</p>
        </div>
      </div>
    );
  }

  const hasMultipleCenters = centers.length > 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard/reservations"
          className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Volver a Reservas
        </Link>

        {/* Selector de vista */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setForceMobileView(!forceMobileView)}
            className={`p-2 rounded-lg transition-colors ${shouldUseMobileView
              ? 'bg-blue-100 text-blue-600'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            title={shouldUseMobileView ? 'Cambiar a vista escritorio' : 'Cambiar a vista móvil'}
          >
            {shouldUseMobileView ? <Monitor className="h-5 w-5" /> : <Smartphone className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Nueva Reserva</h1>
        <p className="text-gray-500 mt-1">
          Reserva tu cancha deportiva favorita
        </p>
      </div>

      {/* Progress Steps */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        {shouldUseMobileView ? (
          // Vista móvil optimizada
          <div className="flex items-center justify-center space-x-4 mobile-fade-in-up">
            {(hasMultipleCenters
              ? [
                { number: 1, title: 'Centro', completed: step > 1 },
                { number: 2, title: 'Deporte', completed: step > 2 },
                { number: 3, title: 'Cancha', completed: step > 3 },
                { number: 4, title: 'Fecha y Hora', completed: false }
              ]
              : [
                { number: 1, title: 'Deporte', completed: step > 1 },
                { number: 2, title: 'Cancha', completed: step > 2 },
                { number: 3, title: 'Fecha y Hora', completed: false }
              ]).map((stepItem, index) => (
                <div key={stepItem.number} className="flex flex-col items-center relative">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 mb-2 ${stepItem.completed
                    ? 'bg-green-600 border-green-600 text-white'
                    : step === stepItem.number
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'border-gray-300 text-gray-500'
                    }`}>
                    {stepItem.completed ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      stepItem.number
                    )}
                  </div>
                  <span className={`text-xs font-medium text-center ${stepItem.completed || step === stepItem.number
                    ? 'text-gray-900'
                    : 'text-gray-500'
                    }`}>
                    {stepItem.title}
                  </span>
                  {index < 2 && (
                    <div className={`absolute top-5 left-full w-8 h-0.5 ${stepItem.completed ? 'bg-green-600' : 'bg-gray-300'
                      }`}></div>
                  )}
                </div>
              ))}
          </div>
        ) : (
          // Vista escritorio original
          <div className="flex items-center justify-between">
            {(hasMultipleCenters
              ? [
                { number: 1, title: 'Centro', completed: step > 1 },
                { number: 2, title: 'Deporte', completed: step > 2 },
                { number: 3, title: 'Cancha', completed: step > 3 },
                { number: 4, title: 'Fecha y Hora', completed: false }
              ]
              : [
                { number: 1, title: 'Deporte', completed: step > 1 },
                { number: 2, title: 'Cancha', completed: step > 2 },
                { number: 3, title: 'Fecha y Hora', completed: false }
              ]).map((stepItem, index) => (
                <div key={stepItem.number} className="flex items-center">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${stepItem.completed
                    ? 'bg-green-600 border-green-600 text-white'
                    : step === stepItem.number
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'border-gray-300 text-gray-500'
                    }`}>
                    {stepItem.completed ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      stepItem.number
                    )}
                  </div>
                  <span className={`ml-2 text-sm font-medium ${stepItem.completed || step === stepItem.number
                    ? 'text-gray-900'
                    : 'text-gray-500'
                    }`}>
                    {stepItem.title}
                  </span>
                  {index < 2 && (
                    <div className={`w-16 h-0.5 mx-4 ${stepItem.completed ? 'bg-green-600' : 'bg-gray-300'
                      }`}></div>
                  )}
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Step Content */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {/* Step 1 (opcional): Select Center */}
        {hasMultipleCenters && step === 1 && (
          <div className={shouldUseMobileView ? "p-4 mobile-fade-in-up" : "p-6"}>
            <h2 className={`font-semibold text-gray-900 mb-4 ${shouldUseMobileView ? "text-xl text-center" : "text-lg"
              }`}>
              Selecciona el Centro
            </h2>
            <div className={shouldUseMobileView ? "grid grid-cols-1 gap-3" : "grid grid-cols-1 md:grid-cols-2 gap-4"}>
              {centers.map((c) => (
                <button
                  key={c.id}
                  onClick={() => { setSelectedCenter(c); setSelectedSport(''); setSelectedCourt(null); setStep(2); }}
                  className={`text-left p-4 rounded-lg border-2 transition-all ${selectedCenter?.id === c.id ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
                >
                  <div className="font-medium text-gray-900">{c.name}</div>
                  <div className="text-sm text-gray-600 flex items-center mt-1"><MapPin className="h-4 w-4 mr-1" />{c.address || ''}</div>
                  <div className="text-sm text-gray-600 flex items-center mt-1"><Clock className="h-4 w-4 mr-1" />{c.businessOpen || '-'} - {c.businessClose || '-'}</div>
                  <div className="mt-1 text-xs text-yellow-700 bg-yellow-50 inline-flex px-2 py-0.5 rounded">💡 Día: {c.dayStart || '-'} · Noche: {c.nightStart || '-'}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step: Select Sport (paso 1 u 2 según centros) */}
        {step === (hasMultipleCenters ? 2 : 1) && (
          <div className={shouldUseMobileView ? "p-4 mobile-fade-in-up" : "p-6"}>
            <h2 className={`font-semibold text-gray-900 mb-4 ${shouldUseMobileView ? "text-xl text-center" : "text-lg"
              }`}>
              Selecciona el Deporte
            </h2>

            <div className={shouldUseMobileView
              ? "grid grid-cols-2 gap-3 mobile-stagger-children"
              : "grid grid-cols-2 md:grid-cols-4 gap-4"
            }>
              {sports.map((sport) => (
                <button
                  key={sport}
                  onClick={() => {
                    setSelectedSport(sport);
                    setSelectedCourt(null);
                  }}
                  className={`p-4 rounded-lg border-2 transition-all duration-200 ${selectedSport === sport
                    ? 'border-blue-600 bg-blue-50 text-blue-900 scale-105'
                    : 'border-gray-200 hover:border-gray-300 text-gray-700 hover:shadow-md'
                    } ${shouldUseMobileView ? 'active:scale-95 mobile-card-hover' : ''}`}
                >
                  <div className="text-center">
                    <div className={shouldUseMobileView ? "text-3xl mb-2" : "text-2xl mb-2"}>
                      {getSportIcon(sport)}
                    </div>
                    <div className="font-medium">{getSportLabel(sport)}</div>
                  </div>
                </button>
              ))}
            </div>

            {selectedSport && (
              <div className={`mt-6 flex ${shouldUseMobileView ? "justify-center" : "justify-end"
                }`}>
                <button
                  onClick={() => setStep(hasMultipleCenters ? 3 : 2)}
                  className={`bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${shouldUseMobileView ? "px-8 py-3 text-lg font-medium" : "px-4 py-2"
                    }`}
                >
                  Continuar
                </button>
              </div>
            )}
          </div>
        )}

        {/* Step: Select Court */}
        {step === (hasMultipleCenters ? 3 : 2) && (
          <div className={shouldUseMobileView ? "mobile-fade-in-up" : "p-6"}>
            {shouldUseMobileView ? (
              // Vista móvil con MobileCourtSelector
              <MobileCourtSelector
                courts={filteredCourts}
                selectedCourt={selectedCourt}
                onCourtSelect={(court) => {
                  setSelectedCourt(court);
                }}
                onContinue={() => {
                  // Si la cancha es multiuso, verificar que se haya seleccionado un deporte
                  if (selectedCourt && (selectedCourt as any).isMultiuse && !selectedSport) {
                    alert('Por favor, selecciona un deporte antes de continuar.');
                    return;
                  }
                  setStep(hasMultipleCenters ? 4 : 3);
                }}
                selectedSport={selectedSport}
                onSportChange={(sport) => setSelectedSport(sport)}
              />
            ) : (
              // Vista escritorio original
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Selecciona la Cancha de {getSportLabel(selectedSport)}
                  </h2>
                  <button
                    onClick={() => setStep(hasMultipleCenters ? 2 : 1)}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    Cambiar {hasMultipleCenters ? 'deporte' : 'deporte'}
                  </button>
                </div>

                {/* Búsqueda de canchas */}
                <div className="mb-6">
                  <label htmlFor="courtSearch" className="block text-sm font-medium text-gray-700 mb-2">
                    Buscar cancha por nombre
                  </label>
                  <input
                    id="courtSearch"
                    type="text"
                    value={courtSearchTerm}
                    onChange={(e) => setCourtSearchTerm(e.target.value)}
                    placeholder="Escribe el nombre de la cancha..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {courtSearchTerm && (
                    <button
                      onClick={() => setCourtSearchTerm('')}
                      className="mt-2 text-sm text-blue-600 hover:text-blue-700"
                    >
                      Limpiar búsqueda
                    </button>
                  )}
                </div>

                {filteredCourts.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    {courtSearchTerm
                      ? `No se encontraron canchas que coincidan con "${courtSearchTerm}"`
                      : 'No hay canchas disponibles para este deporte'}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {filteredCourts.map((court) => (
                      <div
                        key={court.id}
                        onClick={() => {
                          setSelectedCourt(court);
                        }}
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-colors ${selectedCourt?.id === court.id
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                          }`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="text-xl mb-2">{getSportIcon(court.sportType)}</div>
                            <h3 className="font-medium text-gray-900">{court.name}</h3>
                            <p className="text-sm text-gray-500 flex items-center mt-1">
                              <Users className="h-4 w-4 mr-1" />
                              Hasta {court.capacity} personas
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-gray-900">
                              {court.isMultiuse && selectedSport ? (
                                <div>
                                  <div>{formatCurrency(getCourtPrice(court, selectedSport))}</div>
                                  {court.sportPricing?.[selectedSport] && court.sportPricing[selectedSport] !== court.pricePerHour && (
                                    <div className="text-xs text-gray-400 line-through">
                                      {formatCurrency(court.pricePerHour)}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                formatCurrency(court.pricePerHour)
                              )}
                            </div>
                            <div className="text-sm text-gray-500">
                              {court.isMultiuse && selectedSport ? `${selectedSport} - por hora` : 'por hora'}
                            </div>
                          </div>
                        </div>
                        <div className="space-y-1">
                          {court.amenities.map((amenity: string, index: number) => (
                            <div key={index} className="text-sm text-gray-600 flex items-center">
                              <div className="w-1.5 h-1.5 bg-green-400 rounded-full mr-2"></div>
                              {amenity}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {/* Selector de deporte para canchas multiuso */}
                {selectedCourt && (selectedCourt as any).isMultiuse && Array.isArray((selectedCourt as any).allowedSports) && ((selectedCourt as any).allowedSports as string[]).length > 0 && (
                  <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <label className="block text-sm font-medium text-gray-900 mb-3">
                      Selecciona el deporte para esta cancha multiuso:
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {((selectedCourt as any).allowedSports as string[]).map((sport: string) => {
                        const normalize = (s: string) => (s || '').toUpperCase().trim();
                        const sportNormalized = normalize(sport);
                        const selectedNormalized = selectedSport ? normalize(selectedSport) : '';
                        const isSelected = selectedNormalized === sportNormalized;

                        return (
                          <button
                            key={sport}
                            onClick={() => {
                              // NO resetear la cancha seleccionada al cambiar el deporte
                              setSelectedSport(sport);
                            }}
                            className={`p-3 rounded-lg border-2 transition-all duration-200 text-center ${isSelected
                              ? 'border-blue-600 bg-blue-100 text-blue-900 font-semibold'
                              : 'border-gray-200 hover:border-gray-300 text-gray-700 hover:bg-gray-50'
                              }`}
                          >
                            <div className="text-2xl mb-1">{getSportIcon(sport)}</div>
                            <div className="text-sm">{getSportLabel(sport)}</div>
                          </button>
                        );
                      })}
                    </div>
                    {!selectedSport && (
                      <p className="mt-3 text-sm text-amber-600">
                        ⚠️ Por favor, selecciona un deporte antes de continuar.
                      </p>
                    )}
                  </div>
                )}
                {selectedCourt && (
                  <div className="mt-6 flex justify-between">
                    <button
                      onClick={() => setStep(hasMultipleCenters ? 2 : 1)}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Anterior
                    </button>
                    <button
                      onClick={() => {
                        // Si la cancha es multiuso, verificar que se haya seleccionado un deporte
                        if ((selectedCourt as any).isMultiuse && !selectedSport) {
                          alert('Por favor, selecciona un deporte antes de continuar.');
                          return;
                        }
                        setStep(hasMultipleCenters ? 4 : 3);
                      }}
                      disabled={(selectedCourt as any).isMultiuse && !selectedSport}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Continuar
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Step: Select Date and Time with Visual Calendar */}
        {step === (hasMultipleCenters ? 4 : 3) && (
          <div className={shouldUseMobileView ? "mobile-fade-in-up" : "p-6"}>
            {shouldUseMobileView ? (
              // Vista móvil con MobileCalendar
              <MobileCalendar
                selectedDate={selectedDate}
                onDateChange={(date) => {
                  const clamped = clampDate(date);
                  setSelectedDate(clamped);
                }}
                duration={selectedDuration}
                onDurationChange={async (newDuration) => {
                  console.log('🔄 [DURATION-CHANGE-DESKTOP] Cambiando duración de', selectedDuration, 'a', newDuration);
                  setSelectedDuration(newDuration);
                  setSelectedSlot(null); // Resetear slot seleccionado
                  setLightingSelected(false); // Resetear selección de iluminación

                  // 🔄 Recargar slots con la nueva duración
                  if (selectedCourt && selectedDate) {
                    console.log('🔄 [DURATION-CHANGE-DESKTOP] Llamando loadTimeSlots con duración:', newDuration);
                    await loadTimeSlots(selectedCourt.id, clampDate(selectedDate), newDuration, selectedSport);
                  }
                }}
                timeSlots={timeSlots}
                selectedSlot={selectedSlot}
                onSlotSelect={(slot) => {
                  console.log('🔍 [DEBUG] Slot selected:', slot);
                  // Convertir TimeSlot a CalendarSlot
                  const calendarSlot: CalendarSlot = {
                    ...slot,
                    color: slot.available ? 'green' : 'red',
                    message: slot.available ? 'Disponible' : 'No disponible',
                    conflicts: []
                  };
                  setSelectedSlot(calendarSlot);
                  setSelectedCalendarSlot(calendarSlot);
                  // Reset lighting selection when changing slot
                  setLightingSelected(false);
                }}
                onUserBookedSelect={(slot) => {
                  setSlotForActions(slot);
                  setShowUserBookedActions(true);
                }}
                loading={loadingTimeSlots}
                loadingReservation={loadingReservation}
                courtName={selectedCourt?.name || ''}
                isDayTime={selectedSlot ? isDayTime(selectedSlot.startTime) : true}
                lightingSelected={lightingSelected}
                onLightingChange={(selected) => {
                  console.log('🔍 [DEBUG] Lighting changed:', selected);
                  setLightingSelected(selected);
                }}
                lightingExtraPrice={selectedCourt?.lightingExtraPerHour || 0}
                minDate={minSelectableDate}
                maxDate={maxSelectableDate}
                onContinue={async () => {
                  // En móvil, crear la reserva directamente con el slot seleccionado
                  if (selectedSlot && selectedCourt && selectedDate && !loadingReservation) {
                    try {
                      setLoadingReservation(true);

                      // Crear fecha ISO para startTime
                      const startDateTime = new Date(`${selectedDate}T${selectedSlot.startTime}`);

                      console.log('🔍 [DEBUG-MOBILE] Enviando datos al backend:', {
                        courtId: selectedCourt.id,
                        startTime: startDateTime.toISOString(),
                        duration: selectedDuration,
                        lightingSelected,
                        notes,
                        sport: selectedSport || (selectedCourt as any)?.sportType || undefined,
                      });

                      const reservationResponse: any = await api.reservations.create({
                        courtId: selectedCourt.id,
                        startTime: startDateTime.toISOString(),
                        duration: selectedDuration,
                        lightingSelected: lightingSelected,
                        paymentMethod: 'redsys' as 'redsys',
                        notes: notes,
                        sport: selectedSport || (selectedCourt as any)?.sportType || undefined,
                      });

                      const reservationId = reservationResponse?.reservation?.id || reservationResponse?.id;
                      if (reservationId) {
                        setCreatedReservationId(reservationId);
                        setShowPaymentModal(true);
                      } else {
                        console.error('No se obtuvo reservationId válido de la API:', reservationResponse);
                        alert('No se pudo crear la reserva. Intenta nuevamente.');
                      }
                    } catch (error: any) {
                      console.error('Error creating reservation:', error);

                      // Manejo específico de errores de conflicto de horario
                      if (error.status === 409 && error.message?.includes('Horario no disponible')) {
                        // Mostrar modal de conflicto con opciones
                        setError('conflict');
                        setShowConflictModal(true);
                      } else {
                        // Error genérico
                        setError(error.message || 'Error al crear la reserva. Intenta nuevamente.');
                      }
                    } finally {
                      setLoadingReservation(false);
                    }
                  }
                }}
              />
            ) : (
              // Vista escritorio original
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-gray-900">
                    🎯 Selecciona Fecha y Hora con Calendario Visual
                  </h2>
                  <button
                    onClick={() => setStep(2)}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    Cambiar cancha
                  </button>
                </div>

                {/* 🎨 FLUJO MEJORADO: CALENDARIO + HORARIOS */}
                <div className="mb-6">
                  <div className={`transition-all duration-500 ease-in-out ${showTimeSlotsDesktop ? 'grid grid-cols-1 lg:grid-cols-2 gap-6' : 'flex justify-center'}`}>
                    {/* CALENDARIO */}
                    <div className={`transition-all duration-500 ease-in-out ${showTimeSlotsDesktop ? 'lg:col-span-1' : 'w-full max-w-2xl'}`}>
                      <DesktopCalendar
                        selectedDate={selectedDate}
                        onDateChange={async (date) => {
                          setSelectedDate(date);
                          setSelectedTime('');
                          setSelectedCalendarSlot(null);
                          setSelectedSlot(null); // Resetear slot seleccionado
                          setSelectedSlotIndex(null); // Resetear index seleccionado
                          setLightingSelected(false); // Resetear selección de iluminación
                          setShowTimeSlotsDesktop(true);

                          // Cargar horarios automáticamente
                          if (selectedCourt?.id) {
                            await loadTimeSlots(selectedCourt.id, date, duration, selectedSport);
                          }
                        }}
                        duration={duration}
                        onDurationChange={async (newDuration) => {
                          console.log('🔄 [DURATION-CHANGE] Cambiando duración de', duration, 'a', newDuration);
                          setDuration(newDuration);
                          setSelectedTime('');
                          setSelectedCalendarSlot(null);
                          setSelectedSlot(null); // Resetear slot seleccionado
                          setSelectedSlotIndex(null); // Resetear index seleccionado
                          setLightingSelected(false); // Resetear selección de iluminación

                          // 🔄 Recargar slots con la nueva duración
                          if (selectedCourt && selectedDate) {
                            console.log('🔄 [DURATION-CHANGE] Llamando loadTimeSlots con duración:', newDuration);
                            await loadTimeSlots(selectedCourt.id, clampDate(selectedDate), newDuration, selectedSport);
                          }
                        }}
                        courtName={selectedCourt?.name}
                        minDate={minSelectableDate}
                        maxDate={maxSelectableDate}
                      />
                    </div>

                    {/* HORARIOS DISPONIBLES */}
                    {showTimeSlotsDesktop && selectedDate && (
                      <div className="lg:col-span-1">
                        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">
                              Horarios Disponibles
                            </h3>
                            <button
                              onClick={() => setShowTimeSlotsDesktop(false)}
                              className="text-gray-500 hover:text-gray-700 transition-colors"
                            >
                              <X className="h-5 w-5" />
                            </button>
                          </div>

                          <div className="mb-4">
                            <p className="text-sm text-gray-600">
                              {toDisplayDate(selectedDate)}
                            </p>
                            <p className="text-xs text-gray-500">
                              Duración: {duration === 60 ? '1 hora' : duration === 90 ? '1.5 horas' : duration === 120 ? '2 horas' : '3 horas'}
                            </p>
                          </div>

                          {/* ✅ HORARIO SELECCIONADO - ARRIBA */}
                          {selectedCalendarSlot && (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center">
                                  <div className="text-green-600 text-lg mr-2">✅</div>
                                  <div>
                                    <p className="font-semibold text-green-900 text-sm">
                                      {formatTime(selectedCalendarSlot.startTime)} - {formatTime(selectedCalendarSlot.endTime)}
                                    </p>
                                    <p className="text-xs text-green-700">
                                      {duration === 60 ? '1 hora' : duration === 90 ? '1.5 horas' : duration === 120 ? '2 horas' : '3 horas'}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="font-bold text-green-900 text-lg">€{selectedCalendarSlot.price}</p>
                                </div>
                              </div>

                              {/* Opción de iluminación para horarios de día (Desktop) */}
                              {selectedCalendarSlot && isDayTime(selectedCalendarSlot.startTime) && selectedCourt?.lightingExtraPerHour !== undefined && selectedCourt.lightingExtraPerHour > 0 && (
                                <div className="mt-4 p-3 border border-yellow-200 rounded-lg bg-yellow-50">
                                  <div className="flex items-center space-x-3">
                                    <Lightbulb className="h-5 w-5 text-yellow-600 flex-shrink-0" />
                                    <div className="flex-1">
                                      <label htmlFor="lighting-checkbox-desktop" className="flex items-center space-x-2 cursor-pointer">
                                        <input
                                          type="checkbox"
                                          id="lighting-checkbox-desktop"
                                          checked={lightingSelected}
                                          onChange={(e) => setLightingSelected(e.target.checked)}
                                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                        />
                                        <span className="text-sm font-medium text-yellow-800">
                                          Iluminación adicional (+€{(selectedCourt.lightingExtraPerHour * duration / 60).toFixed(2)})
                                        </span>
                                      </label>
                                      <p className="text-xs text-yellow-700 mt-1 ml-6">
                                        <strong>Horario de día:</strong> La iluminación es opcional. Si la seleccionas, se aplicará un cargo adicional de €{selectedCourt.lightingExtraPerHour}/hora.
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Mensaje para horarios de noche (Desktop) */}
                              {selectedCalendarSlot && !isDayTime(selectedCalendarSlot.startTime) && (
                                <div className="mt-4 p-3 border border-blue-200 rounded-lg bg-blue-50">
                                  <div className="flex items-center space-x-3">
                                    <Lightbulb className="h-5 w-5 text-blue-600 flex-shrink-0" />
                                    <p className="text-sm font-medium text-blue-800">
                                      <strong>Horario nocturno:</strong> Iluminación obligatoria (+€{((selectedCourt?.lightingExtraPerHour || 0) * duration / 60).toFixed(2)}).
                                    </p>
                                  </div>
                                </div>
                              )}
                              <button
                                onClick={() => handleSubmit(false)}
                                disabled={isLoading}
                                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {isLoading ? 'Creando Reserva...' : 'Continuar con la Reserva'}
                              </button>
                            </div>
                          )}

                          {loadingTimeSlots ? (
                            <div className="flex items-center justify-center py-8">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                              <span className="ml-2 text-gray-600">Cargando horarios...</span>
                            </div>
                          ) : timeSlots.length > 0 ? (
                            <div className="grid grid-cols-3 gap-2 max-h-96 overflow-y-auto">
                              {timeSlots.map((slot, index) => {
                                const isSelected = selectedSlotIndex === index;
                                return (
                                  <button
                                    key={index}
                                    onClick={() => {
                                      if (slot.status === 'AVAILABLE') {
                                        setSelectedSlotIndex(index);
                                        setSelectedSlot(slot);
                                        setSelectedTime(slot.time);
                                        setSelectedCalendarSlot({
                                          time: slot.time,
                                          startTime: slot.startTime,
                                          endTime: slot.endTime,
                                          status: slot.status,
                                          price: slot.price,
                                          available: slot.available,
                                          color: 'green',
                                          message: 'Disponible',
                                          conflicts: []
                                        });
                                      } else if (slot.status === 'USER_BOOKED') {
                                        // Mostrar opciones: Pagar, Liberar, Cancelar
                                        setSlotForActions(slot);
                                        setShowUserBookedActions(true);
                                      }
                                    }}
                                    disabled={!(slot.status === 'AVAILABLE' || slot.status === 'USER_BOOKED')}
                                    className={`
                                p-2 rounded-md text-center transition-all duration-200 font-medium text-xs
                                ${isSelected
                                        ? 'bg-blue-600 text-white border-2 border-blue-700 shadow-md'
                                        : slot.status === 'AVAILABLE'
                                          ? 'bg-green-100 text-green-900 hover:bg-green-200 border-2 border-green-400'
                                          : slot.status === 'BOOKED'
                                            ? 'bg-red-100 text-red-900 border-2 border-red-400 cursor-not-allowed'
                                            : slot.status === 'USER_BOOKED'
                                              ? 'bg-purple-100 text-purple-900 border-2 border-purple-400 hover:bg-purple-200'
                                              : slot.status === 'MAINTENANCE_OVERRIDE'
                                                ? 'bg-amber-100 text-amber-900 border-2 border-amber-500 hover:bg-amber-200 cursor-pointer'
                                                : slot.status === 'MAINTENANCE'
                                                  ? 'bg-gray-200 text-gray-600 border-2 border-gray-400 cursor-not-allowed'
                                                  : 'bg-gray-100 text-gray-500 border-2 border-gray-300 cursor-not-allowed'
                                      }
                              `}
                                    style={{
                                      backgroundColor: isSelected
                                        ? '#2563eb'
                                        : slot.status === 'AVAILABLE'
                                          ? '#dcfce7'
                                          : slot.status === 'BOOKED'
                                            ? '#fecaca'
                                            : slot.status === 'USER_BOOKED'
                                              ? '#e9d5ff'
                                              : slot.status === 'MAINTENANCE_OVERRIDE'
                                                ? '#fef3c7'
                                                : slot.status === 'MAINTENANCE'
                                                  ? '#e5e7eb'
                                                  : '#f3f4f6'
                                    }}
                                  >
                                    <div className="font-bold text-sm mb-1">
                                      {slot.time || slot.startTime || 'N/A'}
                                      {isSelected ? ' ✓' : ''}
                                    </div>
                                    <div className="text-xs mb-1">
                                      {isSelected
                                        ? 'SELECCIONADO'
                                        : slot.status === 'AVAILABLE'
                                          ? 'Disponible'
                                          : slot.status === 'BOOKED'
                                            ? 'Ocupado'
                                            : slot.status === 'USER_BOOKED'
                                              ? 'Mi reserva'
                                              : slot.status === 'MAINTENANCE_OVERRIDE'
                                                ? (slot as any)?.message || '⚙️ Mantenimiento - Disponible Admin'
                                                : slot.status === 'MAINTENANCE'
                                                  ? (slot as any)?.message || ((slot as any)?.activityType === 'TRAINING'
                                                    ? 'Entrenamiento'
                                                    : (slot as any)?.activityType === 'CLASS'
                                                      ? 'Clase'
                                                      : (slot as any)?.activityType === 'WARMUP'
                                                        ? 'Calentamiento'
                                                        : (slot as any)?.activityType === 'EVENT'
                                                          ? 'Evento'
                                                          : (slot as any)?.activityType === 'MEETING'
                                                            ? 'Reunión'
                                                            : 'Mantenimiento')
                                                  : 'No disponible'}
                                    </div>
                                    {slot.available && (
                                      <div className="text-xs font-semibold">
                                        €{slot.price}
                                      </div>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="text-center py-8 text-gray-500">
                              <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                              <p>No hay horarios disponibles para esta fecha</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>


                {/* 📝 NOTAS */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notas (Opcional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Agrega cualquier información adicional sobre tu reserva..."
                  />
                </div>


                {/* 🚀 NAVEGACIÓN */}
                {selectedDate && (
                  <div className="flex justify-start">
                    <button
                      onClick={() => setStep(2)}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Anterior
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Step 4 eliminado - flujo directo desde calendario al pago */}
      </div>

      {/* 🚀 Modal del Calendario Visual */}
      <CalendarVisualModal
        isOpen={showCalendarModal}
        courtId={selectedCourt?.id || ''}
        date={selectedDate}
        duration={duration}
        selectedSport={selectedSport}
        selectedCourt={selectedCourt}
        notes={notes}
        onSlotSelect={handleCalendarSlotSelection}
        onClose={handleCloseCalendarModal}
        onReservationCreated={(reservationId) => {
          setCreatedReservationId(reservationId);
          setShowPaymentModal(true);
        }}
      />



      {/* Modal de Pago Demo */}
      {shouldUseMobileView ? (
        <MobilePaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          reservationId={createdReservationId || ''}
          amount={Number(totalPrice || 0)}
          currency="EUR"
          courtName={selectedCourt?.name || ''}
          dateLabel={selectedDate ? formatDate(selectedDate) : ''}
          timeLabel={selectedSlot ? `${selectedSlot.startTime} - ${selectedSlot.endTime}` : selectedTime}
          onSuccess={() => router.push('/dashboard/reservations')}
          pricingDetails={
            pricing
              ? {
                basePrice: totalPrice ?? 0,
                discount: pricing.discount ?? 0,
                total: totalPrice ?? 0,
                breakdown: Array.isArray(pricing.breakdown) ? pricing.breakdown : [],
                appliedRules: Array.isArray(pricing.appliedRules) ? pricing.appliedRules : [],
              }
              : undefined
          }
        />
      ) : (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          reservationId={createdReservationId || ''}
          amount={Number(totalPrice || 0)}
          currency="EUR"
          courtName={selectedCourt?.name || ''}
          dateLabel={selectedDate ? formatDate(selectedDate) : ''}
          timeLabel={selectedCalendarSlot ? `${selectedCalendarSlot.startTime} - ${selectedCalendarSlot.endTime}` : selectedTime}
          pricingDetails={
            pricing
              ? {
                basePrice: totalPrice ?? 0,
                discount: pricing.discount ?? 0,
                total: totalPrice ?? 0,
                breakdown: Array.isArray(pricing.breakdown) ? pricing.breakdown : [],
                appliedRules: Array.isArray(pricing.appliedRules) ? pricing.appliedRules : [],
              }
              : undefined
          }
          onSuccess={() => router.push('/dashboard/reservations')}
        />
      )}

      {/* Modal de Conflicto de Horario */}
      {showConflictModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <AlertCircle className="h-6 w-6 text-orange-500 mr-3" />
                <h3 className="text-lg font-semibold text-gray-900">
                  {conflictKind === 'user_owned' ? '📅 Ya tienes una reserva en ese horario' : 'Horario No Disponible'}
                </h3>
              </div>

              <div className="mb-6">
                <p className="text-gray-600 mb-4">
                  {conflictKind === 'user_owned'
                    ? 'Ese horario ya pertenece a otra de tus reservas. Puedes ir a Mis Reservas o elegir otro horario.'
                    : 'El horario seleccionado ya está reservado o en proceso de pago. Tienes las siguientes opciones:'}
                </p>

                <div className="space-y-3">
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-1">Opción 1: Seleccionar otro horario</h4>
                    <p className="text-sm text-blue-700">
                      Elige un horario diferente disponible.
                    </p>
                  </div>

                  {conflictKind !== 'user_owned' && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <h4 className="font-medium text-green-900 mb-1">Opción 2: Liberar reserva anterior</h4>
                      <p className="text-sm text-green-700">
                        Si tienes una reserva pendiente en este horario, puedes liberarla.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowConflictModal(false);
                    setError(null);
                    // Recargar horarios para mostrar disponibilidad actualizada
                    if (selectedCourt?.id && selectedDate) {
                      loadTimeSlots(selectedCourt.id, selectedDate, selectedDuration);
                    }
                  }}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                >
                  Ver Horarios Actualizados
                </button>

                {conflictKind !== 'user_owned' && (
                  <button
                    onClick={releaseConflictsAndRetry}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors"
                  >
                    Liberar Reserva Anterior
                  </button>
                )}

                <button
                  onClick={goToPayForSelected}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors"
                >
                  {conflictKind === 'user_owned' ? 'Ver Mis Reservas' : 'Ir a Pagar'}
                </button>
              </div>

              <button
                onClick={() => {
                  setShowConflictModal(false);
                  setError(null);
                }}
                className="w-full mt-3 px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Acciones para chip "Mi reserva" */}
      {showUserBookedActions && slotForActions && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <AlertCircle className="h-6 w-6 text-purple-600 mr-3" />
                <h3 className="text-lg font-semibold text-gray-900">Tienes una reserva pendiente</h3>
              </div>
              <p className="text-gray-600 mb-6">
                El horario {slotForActions.time || slotForActions.startTime} está retenido como "Mi reserva". ¿Qué deseas hacer?
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    // Construir startTime ISO del slot para pasar al listado y abrir modal de pago
                    try {
                      let startIso: string;
                      if (slotForActions.startTime?.includes?.('T')) {
                        startIso = slotForActions.startTime;
                      } else if (selectedDate) {
                        startIso = new Date(`${selectedDate}T${slotForActions.startTime}:00`).toISOString();
                      } else {
                        startIso = '';
                      }
                      setShowUserBookedActions(false);
                      if (startIso) {
                        router.push(`/dashboard/reservations?payStart=${encodeURIComponent(startIso)}`);
                      } else {
                        router.push('/dashboard/reservations');
                      }
                    } catch {
                      setShowUserBookedActions(false);
                      router.push('/dashboard/reservations');
                    }
                  }}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                >
                  Pagar ahora
                </button>
                <button
                  onClick={async () => {
                    await releaseSpecificSlot(slotForActions);
                    setShowUserBookedActions(false);
                  }}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
                >
                  Liberar reserva
                </button>
              </div>
              <button
                onClick={() => setShowUserBookedActions(false)}
                className="w-full mt-3 px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}