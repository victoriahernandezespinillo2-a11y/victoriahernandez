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
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import PaymentModal from '@/app/components/PaymentModal';
import { api } from '@/lib/api';
import { useCourts, usePricing } from '@/lib/hooks';
import { ErrorHandler } from '../../../../lib/error-handler';
import { useFirebaseAuth } from '@/components/auth/FirebaseAuthProvider';

import CalendarVisualModal from '@/components/CalendarVisualModal';
import { MobileCourtSelector } from '@/app/components/MobileCourtSelector';
import { MobileCalendar } from '@/app/components/MobileCalendar';
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

interface Court {
  id: string;
  name: string;
  type: string;
  capacity: number;
  pricePerHour: number;
  amenities: string[];
  image?: string;
}

interface TimeSlot {
  time: string;
  startTime: string;
  endTime: string;
  status: 'AVAILABLE' | 'BOOKED' | 'MAINTENANCE' | 'USER_BOOKED' | 'PAST' | 'UNAVAILABLE';
  available: boolean;
  price: number;
}



// Datos reales se cargan desde la API

// Los slots se calcularán desde el backend en base a disponibilidad real

export default function NewReservationPage() {
  const router = useRouter();
  const { courts, getCourts } = useCourts();
  const { pricing, calculatePrice, reset: resetPricing } = usePricing();
  const isMobile = useIsMobile();
  const { firebaseUser, loading: authLoading } = useFirebaseAuth();
  
  // Estado para forzar vista móvil/escritorio
  const [forceMobileView, setForceMobileView] = useState(false);
  const shouldUseMobileView = isMobile || forceMobileView;
  const [step, setStep] = useState(1);
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
  const [error, setError] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [createdReservationId, setCreatedReservationId] = useState<string | null>(null);
  const [selectedCalendarSlot, setSelectedCalendarSlot] = useState<CalendarSlot | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<CalendarSlot | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<number>(60);

  const [showCalendarModal, setShowCalendarModal] = useState(false);

  // Calculate total price
  const totalPrice = useMemo(() => {
    if (!selectedCourt || !selectedDuration) return 0;
    return (selectedCourt.pricePerHour * selectedDuration) / 60;
  }, [selectedCourt, selectedDuration]);

  // Función para cargar timeSlots desde la API
  const loadTimeSlots = async (courtId: string, date: string, duration: number) => {
    if (!courtId || !date) return;
    
    setLoadingTimeSlots(true);
    try {
      console.log('🔴 [FRONTEND-DEBUG] Llamando a getCalendarStatus con los siguientes datos:', {
        courtId,
        date,
        duration
      });
      const calendarData = await api.courts.getCalendarStatus(courtId, {
        date,
        duration
      });
      
      // Convertir CalendarSlots a TimeSlots
      const convertedTimeSlots: TimeSlot[] = calendarData.slots.map(slot => ({
        time: slot.time,
        startTime: slot.startTime,
        endTime: slot.endTime,
        status: slot.status,
        available: slot.available,
        price: selectedCourt?.pricePerHour ? (selectedCourt.pricePerHour * duration) / 60 : 0
      }));
      
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
      loadTimeSlots(selectedCourt.id, selectedDate, duration);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCourt, selectedDate, duration, authLoading, firebaseUser]);

  // Cargar canchas activas
  useEffect(() => {
    // 🔒 Solo cargar si la autenticación ha terminado y hay un usuario
    if (!authLoading && firebaseUser) {
      console.log('🔄 [DEBUG] Auth lista, iniciando carga de canchas...');
      getCourts({ isActive: true })
        .then((result) => {
          console.log('✅ [DEBUG] Canchas cargadas exitosamente:', result);
        })
        .catch((error) => {
          console.error('❌ [DEBUG] Error cargando canchas:', error);
        });
    } else {
      console.log('⏳ [DEBUG] Esperando autenticación de Firebase para cargar canchas...');
    }
  }, [getCourts, authLoading, firebaseUser]);

  // Deportes disponibles a partir de las canchas
  const sports = useMemo(() => {
    console.log('🎯 [DEBUG] Procesando deportes, courts:', courts);
    
    // 🔧 EXTRAER EL ARRAY DE CANCHAS DEL OBJETO RESPONSE
    let courtsArray: any[] = [];
    const cAny: any = courts as any;
    if (Array.isArray(cAny)) {
      courtsArray = cAny;
    } else if (cAny && typeof cAny === 'object' && Array.isArray(cAny.courts)) {
      courtsArray = cAny.courts;
    }
    
    console.log('📋 [DEBUG] Array de canchas extraído:', courtsArray);
    
    const unique = new Set<string>();
    courtsArray.forEach((c: any) => {
      if (c?.sportType) {
        unique.add(c.sportType);
        console.log('🏅 [DEBUG] Deporte encontrado:', c.sportType);
      }
    });
    
    const result = Array.from(unique);
    console.log('📊 [DEBUG] Deportes finales:', result);
    return result;
  }, [courts]);

  // Canchas filtradas por deporte
  const filteredCourts: any[] = useMemo(() => {
    // 🔧 EXTRAER EL ARRAY DE CANCHAS DEL OBJETO RESPONSE
    let courtsArray: any[] = [];
    const cAny: any = courts as any;
    if (Array.isArray(cAny)) {
      courtsArray = cAny;
    } else if (cAny && typeof cAny === 'object' && Array.isArray(cAny.courts)) {
      courtsArray = cAny.courts;
    }
    
    if (!selectedSport) return courtsArray; // mostrar todas si no se eligió deporte
    return courtsArray.filter((c: any) => c.sportType === selectedSport);
  }, [courts, selectedSport]);

  const getSportIcon = (sport: string) => {
    switch (sport) {
      case 'FOOTBALL':
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
      default:
        return '🏅';
    }
  };

  const getSportLabel = (sport: string) => {
    switch (sport) {
      case 'FOOTBALL':
        return 'Fútbol';
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
      default:
        return sport;
    }
  };
  
  const totalCost = pricing?.total ?? (selectedCourt ? (selectedCourt.pricePerHour * duration / 60) : 0);

  // Obtener fecha mínima (hoy)
  const today = new Date();
  const minDate = today.toISOString().split('T')[0];
  
  // Obtener fecha máxima (30 días desde hoy)
  const maxDate = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const handleSubmit = async () => {
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
      // 🎯 USAR EL SLOT DEL CALENDARIO VISUAL
      const startTime = selectedCalendarSlot.startTime;
      
      const res: any = await api.reservations.create({
        courtId: selectedCourt.id,
        startTime: startTime,
        duration,
        // paymentMethod omitido para usar flujo predeterminado en backend
        notes,
        sport: selectedSport || undefined,
      } as any);
      const reservationId = res?.reservation?.id || res?.id;
      if (reservationId) {
        setCreatedReservationId(reservationId);
        setShowPaymentModal(true);
      } else {
        router.push('/dashboard/reservations');
      }
    } catch (error: any) {
      // 🔒 MANEJO ROBUSTO DE ERRORES CON ERROR HANDLER
      const userMessage = ErrorHandler.handleError(error, {
        action: 'Crear reserva',
        endpoint: '/api/reservations',
        timestamp: new Date().toISOString()
      });
      
      // Mostrar mensaje específico al usuario
      alert(userMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };



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
        await calculatePrice({ 
          courtId: selectedCourt.id, 
          startTime: startISO, 
          duration 
        });
      } catch {
        // noop
      }
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCalendarSlot]);

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
            className={`p-2 rounded-lg transition-colors ${
              shouldUseMobileView 
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
            {[
              { number: 1, title: 'Deporte', completed: step > 1 },
              { number: 2, title: 'Cancha', completed: step > 2 },
              { number: 3, title: 'Fecha y Hora', completed: false }
            ].map((stepItem, index) => (
              <div key={stepItem.number} className="flex flex-col items-center relative">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 mb-2 ${
                  stepItem.completed
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
                <span className={`text-xs font-medium text-center ${
                  stepItem.completed || step === stepItem.number
                    ? 'text-gray-900'
                    : 'text-gray-500'
                }`}>
                  {stepItem.title}
                </span>
                {index < 2 && (
                  <div className={`absolute top-5 left-full w-8 h-0.5 ${
                    stepItem.completed ? 'bg-green-600' : 'bg-gray-300'
                  }`}></div>
                )}
              </div>
            ))}
          </div>
        ) : (
          // Vista escritorio original
          <div className="flex items-center justify-between">
            {[
              { number: 1, title: 'Deporte', completed: step > 1 },
              { number: 2, title: 'Cancha', completed: step > 2 },
              { number: 3, title: 'Fecha y Hora', completed: false }
            ].map((stepItem, index) => (
              <div key={stepItem.number} className="flex items-center">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                  stepItem.completed
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
                <span className={`ml-2 text-sm font-medium ${
                  stepItem.completed || step === stepItem.number
                    ? 'text-gray-900'
                    : 'text-gray-500'
                }`}>
                  {stepItem.title}
                </span>
                {index < 2 && (
                  <div className={`w-16 h-0.5 mx-4 ${
                    stepItem.completed ? 'bg-green-600' : 'bg-gray-300'
                  }`}></div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Step Content */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {/* Step 1: Select Sport */}
        {step === 1 && (
          <div className={shouldUseMobileView ? "p-4 mobile-fade-in-up" : "p-6"}>
            <h2 className={`font-semibold text-gray-900 mb-4 ${
              shouldUseMobileView ? "text-xl text-center" : "text-lg"
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
                  className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                    selectedSport === sport
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
              <div className={`mt-6 flex ${
                shouldUseMobileView ? "justify-center" : "justify-end"
              }`}>
                <button
                  onClick={() => setStep(2)}
                  className={`bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                    shouldUseMobileView ? "px-8 py-3 text-lg font-medium" : "px-4 py-2"
                  }`}
                >
                  Continuar
                </button>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Select Court */}
        {step === 2 && (
          <div className={shouldUseMobileView ? "mobile-fade-in-up" : "p-6"}>
            {shouldUseMobileView ? (
              // Vista móvil con MobileCourtSelector
              <MobileCourtSelector
                courts={filteredCourts}
                selectedCourt={selectedCourt}
                onCourtSelect={(court) => {
                  setSelectedCourt(court);
                  setStep(3);
                }}
                selectedSport={selectedSport}
              />
            ) : (
              // Vista escritorio original
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Selecciona la Cancha de {selectedSport}
                  </h2>
                  <button
                    onClick={() => setStep(1)}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    Cambiar deporte
                  </button>
                </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredCourts.map((court) => (
                <div
                  key={court.id}
                  onClick={() => setSelectedCourt(court)}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                    selectedCourt?.id === court.id
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
                        {formatCurrency(court.pricePerHour)}
                      </div>
                      <div className="text-sm text-gray-500">por hora</div>
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
                {selectedCourt && (
                  <div className="mt-6 flex justify-between">
                    <button
                      onClick={() => setStep(1)}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Anterior
                    </button>
                    <button
                      onClick={() => setStep(3)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Continuar
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Select Date and Time with Visual Calendar */}
        {step === 3 && (
          <div className={shouldUseMobileView ? "mobile-fade-in-up" : "p-6"}>
            {shouldUseMobileView ? (
              // Vista móvil con MobileCalendar
              <MobileCalendar
                selectedDate={selectedDate}
                onDateChange={setSelectedDate}
                duration={selectedDuration}
                onDurationChange={setSelectedDuration}
                timeSlots={timeSlots}
                selectedSlot={selectedSlot}
                onSlotSelect={(slot) => {
                  // Convertir TimeSlot a CalendarSlot
                  const calendarSlot: CalendarSlot = {
                    ...slot,
                    color: slot.available ? 'green' : 'red',
                    message: slot.available ? 'Disponible' : 'No disponible',
                    conflicts: []
                  };
                  setSelectedSlot(calendarSlot);
                }}
                loading={loadingTimeSlots}
                courtName={selectedCourt?.name || ''}
                onContinue={async () => {
                   // En móvil, crear la reserva directamente con el slot seleccionado
                   if (selectedSlot && selectedCourt && selectedDate) {
                     try {
                       // Crear fecha ISO para startTime
                       const startDateTime = new Date(`${selectedDate}T${selectedSlot.startTime}`);
                       
                       const reservationResponse: any = await api.reservations.create({
                         courtId: selectedCourt.id,
                         startTime: startDateTime.toISOString(),
                         duration: selectedDuration,
                         paymentMethod: 'redsys' as 'redsys',
                         notes: notes
                       });
                       
                       const reservationId = reservationResponse?.reservation?.id || reservationResponse?.id;
                       if (reservationId) {
                         setCreatedReservationId(reservationId);
                         setShowPaymentModal(true);
                       } else {
                         console.error('No se obtuvo reservationId válido de la API:', reservationResponse);
                         alert('No se pudo crear la reserva. Intenta nuevamente.');
                       }
                     } catch (error) {
                       console.error('Error creating reservation:', error);
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
            
            {/* 🎨 CONFIGURACIÓN INICIAL */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Date Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="h-4 w-4 inline mr-1" />
                  Fecha
                </label>
                <input
                  type="date"
                  min={minDate}
                  max={maxDate}
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    setSelectedTime('');
                    setSelectedCalendarSlot(null);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Duration Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Clock className="h-4 w-4 inline mr-1" />
                  Duración
                </label>
                <select
                  value={duration}
                  onChange={(e) => {
                    setDuration(Number(e.target.value));
                    setSelectedTime('');
                    setSelectedCalendarSlot(null);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value={60}>1 hora</option>
                  <option value={90}>1.5 horas</option>
                  <option value={120}>2 horas</option>
                  <option value={180}>3 horas</option>
                </select>
              </div>
            </div>

            {/* 🎨 CALENDARIO VISUAL INTELIGENTE */}
            {selectedDate && (
              <div className="mb-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start">
                      <div className="text-blue-600 text-lg mr-3">💡</div>
                      <div className="text-sm text-blue-800">
                        <p className="font-medium mb-1">Calendario Visual Inteligente:</p>
                        <p>Selecciona directamente un horario disponible del calendario. Los colores te indican el estado de cada horario.</p>
                      </div>
                    </div>
                    
                    {/* 🚀 BOTÓN PARA ABRIR MODAL DEL CALENDARIO */}
                    <button
                      onClick={handleOpenCalendarModal}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center space-x-2"
                    >
                      <Calendar className="h-4 w-4" />
                      <span>Ver Calendario</span>
                    </button>
                  </div>
                </div>
                
                {/* 🚀 CALENDARIO VISUAL ELIMINADO - FUNCIONALIDAD INTEGRADA EN EL MODAL */}
                <div className="text-center py-8">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                    <Calendar className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-blue-900 mb-2">
                      Calendario Visual
                    </h3>
                    <p className="text-blue-700 mb-4">
                      Haz clic en "Ver Calendario" para abrir el calendario visual completo
                    </p>
                    <button
                      onClick={handleOpenCalendarModal}
                      className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center mx-auto"
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      Abrir Calendario
                    </button>
                  </div>
                </div>
              </div>
            )}

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

            {/* 🎯 INDICADOR DE SELECCIÓN */}
            {selectedCalendarSlot && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-center">
                  <div className="text-blue-600 text-lg mr-3">🎯</div>
                  <div className="text-sm text-blue-800">
                    <p className="font-medium">Horario seleccionado: <strong>{formatTime(selectedCalendarSlot.startTime)} - {formatTime(selectedCalendarSlot.endTime)}</strong></p>
                    <p className="text-xs mt-1">Revisa el modal flotante para continuar</p>
                  </div>
                </div>
              </div>
            )}

            {/* 🚀 BOTONES DE NAVEGACIÓN */}
            {selectedDate && selectedCalendarSlot && (
              <div className="flex justify-between">
                <button
                  onClick={() => setStep(2)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Anterior
                </button>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm text-green-800 mb-2">
                    ✅ <strong>Horario confirmado:</strong> {formatTime(selectedCalendarSlot.startTime)} - {formatTime(selectedCalendarSlot.endTime)}
                  </p>
                  <p className="text-xs text-green-700">
                    🚀 Al confirmar en el calendario visual, tu reserva se creará automáticamente y se abrirá el modal de pago.
                  </p>
                </div>
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
          amount={Number(totalCost || 0)}
          currency="COP"
          courtName={selectedCourt?.name || ''}
          dateLabel={selectedDate ? formatDate(selectedDate) : ''}
          timeLabel={selectedTime}
          onSuccess={() => router.push('/dashboard/reservations')}
        />
      ) : (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          reservationId={createdReservationId || ''}
          amount={Number(totalCost || 0)}
          currency="COP"
          courtName={selectedCourt?.name || ''}
          dateLabel={selectedDate ? formatDate(selectedDate) : ''}
          timeLabel={selectedTime}
          onSuccess={() => router.push('/dashboard/reservations')}
        />
      )}
    </div>
  );
}