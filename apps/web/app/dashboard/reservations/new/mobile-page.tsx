"use client";

import React, { useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  CreditCard,
  ArrowLeft,
  Check,
  AlertCircle,
  ChevronRight,
  Star,
  Zap,
  Wifi,
  Car,
  Shield,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import PaymentModal from '@/app/components/PaymentModal';
import { api } from '@/lib/api';
import { useCourts, usePricing } from '@/lib/hooks';
import { ErrorHandler } from '../../../../lib/error-handler';
import CalendarVisualModal from '@/components/CalendarVisualModal';

interface Court {
  id: string;
  name: string;
  type: string;
  capacity: number;
  pricePerHour: number;
  amenities: string[];
  image?: string;
  rating?: number;
  sportType?: string;
  lightingExtraPerHour?: number;
  centerId?: string; // Added centerId to Court interface
}

interface CalendarSlot {
  time: string;
  startTime: string;
  endTime: string;
  status: 'AVAILABLE' | 'BOOKED' | 'MAINTENANCE' | 'USER_BOOKED' | 'PAST' | 'UNAVAILABLE';
  color: string;
  message: string;
  conflicts: any[];
  available: boolean;
}

export default function MobileNewReservationPage() {
  const router = useRouter();
  const { courts, loading: courtsLoading, error: courtsError } = useCourts();
  const { pricing, calculatePrice } = usePricing();

  // Estados principales
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedSport, setSelectedSport] = useState<string>('');
  const [selectedCourt, setSelectedCourt] = useState<Court | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [duration, setDuration] = useState(60);
  const [notes, setNotes] = useState('');
  const [selectedCalendarSlot, setSelectedCalendarSlot] = useState<CalendarSlot | null>(null);

  // Estados de UI
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [createdReservationId, setCreatedReservationId] = useState<string | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [bookingPolicy, setBookingPolicy] = useState<{ maxAdvanceDays: number; minAdvanceHours: number } | null>(null);
  const [policyCache, setPolicyCache] = useState<Record<string, { maxAdvanceDays: number; minAdvanceHours: number }>>({});

  // Deportes disponibles
  const sports = ['football', 'basketball', 'tennis', 'volleyball'];

  // Funciones de utilidad
  const getSportIcon = (sport: string) => {
    const icons: { [key: string]: string } = {
      football: '⚽',
      basketball: '🏀',
      tennis: '🎾',
      volleyball: '🏐',
    };
    return icons[sport] || '🏃';
  };

  const getSportLabel = (sport: string) => {
    const labels: { [key: string]: string } = {
      football: 'Fútbol',
      basketball: 'Baloncesto',
      tennis: 'Tenis',
      volleyball: 'Voleibol',
    };
    return labels[sport] || sport;
  };

  const getAmenityIcon = (amenity: string) => {
    const icons: { [key: string]: React.ReactElement } = {
      'Iluminación LED': <Zap className="h-4 w-4" />,
      'WiFi gratuito': <Wifi className="h-4 w-4" />,
      'Estacionamiento': <Car className="h-4 w-4" />,
      'Seguridad 24/7': <Shield className="h-4 w-4" />,
    };
    return icons[amenity] || <Check className="h-4 w-4" />;
  };

  // Filtrar canchas por deporte
  const filteredCourts = useMemo(() => {
    if (!selectedSport || !courts) return [];
    return courts.filter(court => court.sportType === selectedSport);
  }, [selectedSport, courts]);

  const DEFAULT_MAX_ADVANCE_DAYS = 90;

  const formatYMD = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

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

  const todayYMD = useMemo(() => formatYMD(new Date()), []);
  const maxAdvanceDays = bookingPolicy?.maxAdvanceDays ?? DEFAULT_MAX_ADVANCE_DAYS;
  const minSelectableDate = todayYMD;
  const maxSelectableDate = useMemo(() => formatYMD(addDaysLocal(new Date(), maxAdvanceDays)), [maxAdvanceDays]);
  const clampDate = useMemo(() => {
    return (value: string) => clampDateString(value, minSelectableDate, maxSelectableDate);
  }, [minSelectableDate, maxSelectableDate]);

  useEffect(() => {
    const clamped = clampDate(selectedDate || minSelectableDate);
    if (clamped !== selectedDate) {
      setSelectedDate(clamped);
    }
  }, [selectedDate, clampDate, minSelectableDate]);

  // Calcular precio cuando cambien las selecciones
  useEffect(() => {
    const run = async () => {
      try {
        if (!selectedCourt || !selectedCalendarSlot || !selectedDate) return;
        
        // Construir startTime como ISO válido
        const raw = selectedCalendarSlot.startTime;
        let startISO: string | null = null;
        
        if (/^\d{2}:\d{2}$/.test(raw)) {
          const local = new Date(`${selectedDate}T${raw}:00`);
          if (!isNaN(local.getTime())) {
            startISO = new Date(local.getTime() - local.getTimezoneOffset()*60000).toISOString();
          }
        } else {
          const d = new Date(raw);
          if (!isNaN(d.getTime())) {
            startISO = d.toISOString();
          }
        }
        
        if (startISO) {
          await calculatePrice({ 
            courtId: selectedCourt.id, 
            startTime: startISO, 
            duration 
          });
        }
      } catch {
        // noop
      }
    };
    run();
  }, [selectedCourt, selectedCalendarSlot, selectedDate, duration, calculatePrice]);

  // Calcular precio total usando el resultado del backend
  const totalCost = useMemo(() => {
    if (!selectedCourt || !selectedCalendarSlot) return 0;
    
    // Si tenemos pricing del backend, usarlo (incluye iluminación nocturna automática)
    if (pricing?.total !== undefined) {
      return pricing.total;
    }
    
    // Fallback: precio base solo (no debería llegar aquí normalmente)
    return selectedCourt.pricePerHour * (duration / 60);
  }, [selectedCourt, selectedCalendarSlot, duration, pricing]);

  // Formatear moneda
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Navegación entre pasos con animación
  const navigateToStep = (step: number) => {
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentStep(step);
      setIsAnimating(false);
    }, 150);
  };

  // Manejo del calendario
  const handleOpenCalendarModal = () => {
    if (!selectedCourt || !selectedDate) return;
    setShowCalendarModal(true);
  };

  const handleCloseCalendarModal = () => {
    setShowCalendarModal(false);
  };

  const handleCalendarSlotSelection = (slot: CalendarSlot) => {
    setSelectedCalendarSlot(slot);
    setSelectedTime(slot.time);
    setShowCalendarModal(false);
  };

  // Progreso del flujo
  const getProgress = () => {
    if (currentStep === 1) return 25;
    if (currentStep === 2) return 50;
    if (currentStep === 3) return 75;
    return 100;
  };

  // Validaciones por paso
  const canProceedFromStep = (step: number) => {
    switch (step) {
      case 1: return selectedSport;
      case 2: return selectedCourt;
      case 3: return selectedDate && selectedCalendarSlot;
      default: return false;
    }
  };

  // Cargar política de reservas del centro asociado a la cancha seleccionada
  useEffect(() => {
    const controller = new AbortController();
    const fetchPolicy = async (centerId: string) => {
      if (policyCache[centerId]) {
        setBookingPolicy(policyCache[centerId]);
        return;
      }
      try {
        const response: any = await api.centers.getById(centerId);
        const data = (response?.data || response) as any;
        const settings = data?.settings || {};
        const rawMax = settings?.reservations?.maxAdvanceDays ?? data?.bookingPolicy?.maxAdvanceDays;
        const rawMin = settings?.reservations?.minAdvanceHours ?? data?.bookingPolicy?.minAdvanceHours;
        let maxDays = Number(rawMax);
        if (!Number.isFinite(maxDays)) maxDays = DEFAULT_MAX_ADVANCE_DAYS;
        maxDays = Math.min(Math.max(Math.trunc(maxDays), 1), 365);
        let minHours = Number(rawMin);
        if (!Number.isFinite(minHours) || minHours < 0) minHours = 0;
        const policy = { maxAdvanceDays: maxDays, minAdvanceHours: minHours };
        if (!controller.signal.aborted) {
          setPolicyCache(prev => ({ ...prev, [centerId]: policy }));
          setBookingPolicy(policy);
        }
      } catch {
        if (!controller.signal.aborted) {
          setBookingPolicy({ maxAdvanceDays: DEFAULT_MAX_ADVANCE_DAYS, minAdvanceHours: 0 });
        }
      }
    };

    if (selectedCourt?.centerId) {
      fetchPolicy(selectedCourt.centerId);
    } else {
      setBookingPolicy(null);
    }

    return () => controller.abort();
  }, [selectedCourt?.centerId, policyCache]);

  useEffect(() => {
    if (!selectedCourt?.centerId) return;
    const clamped = clampDate(selectedDate || minSelectableDate);
    if (clamped !== selectedDate) {
      setSelectedDate(clamped);
    }
  }, [selectedCourt?.centerId, clampDate, selectedDate, minSelectableDate]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header móvil con progreso */}
      <div className="bg-white shadow-sm sticky top-0 z-40">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => currentStep > 1 ? navigateToStep(currentStep - 1) : router.back()}
              className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-lg font-semibold text-gray-900">Nueva Reserva</h1>
            <div className="w-9" /> {/* Spacer */}
          </div>
          
          {/* Barra de progreso */}
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${getProgress()}%` }}
            />
          </div>
          
          {/* Indicadores de pasos */}
          <div className="flex justify-between mt-3 text-xs">
            <span className={currentStep >= 1 ? 'text-blue-600 font-medium' : 'text-gray-400'}>
              Deporte
            </span>
            <span className={currentStep >= 2 ? 'text-blue-600 font-medium' : 'text-gray-400'}>
              Cancha
            </span>
            <span className={currentStep >= 3 ? 'text-blue-600 font-medium' : 'text-gray-400'}>
              Fecha & Hora
            </span>
            <span className={currentStep >= 4 ? 'text-blue-600 font-medium' : 'text-gray-400'}>
              Confirmar
            </span>
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      <div className={`transition-all duration-300 ${isAnimating ? 'opacity-0 transform translate-x-4' : 'opacity-100 transform translate-x-0'}`}>
        
        {/* Paso 1: Selección de Deporte */}
        {currentStep === 1 && (
          <div className="p-4">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                ¿Qué deporte vas a practicar?
              </h2>
              <p className="text-gray-600">
                Selecciona el deporte para ver las canchas disponibles
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              {sports.map((sport) => (
                <button
                  key={sport}
                  onClick={() => {
                    setSelectedSport(sport);
                    setSelectedCourt(null);
                  }}
                  className={`p-6 rounded-2xl border-2 transition-all duration-200 active:scale-95 ${
                    selectedSport === sport
                      ? 'border-blue-500 bg-blue-50 shadow-lg'
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
                  }`}
                >
                  <div className="text-center">
                    <div className="text-4xl mb-3">{getSportIcon(sport)}</div>
                    <div className={`font-semibold ${
                      selectedSport === sport ? 'text-blue-900' : 'text-gray-700'
                    }`}>
                      {getSportLabel(sport)}
                    </div>
                  </div>
                </button>
              ))}
            </div>
            
            {selectedSport && (
              <div className="mt-8">
                <button
                  onClick={() => navigateToStep(2)}
                  className="w-full bg-blue-600 text-white py-4 rounded-2xl font-semibold text-lg hover:bg-blue-700 transition-colors active:scale-98 flex items-center justify-center"
                >
                  Continuar
                  <ChevronRight className="h-5 w-5 ml-2" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Paso 2: Selección de Cancha */}
        {currentStep === 2 && (
          <div className="p-4">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Elige tu cancha de {getSportLabel(selectedSport)}
              </h2>
              <p className="text-gray-600">
                {filteredCourts.length} canchas disponibles
              </p>
            </div>
            
            <div className="space-y-4">
              {filteredCourts.map((court) => (
                <div
                  key={court.id}
                  onClick={() => setSelectedCourt(court)}
                  className={`p-5 rounded-2xl border-2 transition-all duration-200 active:scale-98 ${
                    selectedCourt?.id === court.id
                      ? 'border-blue-500 bg-blue-50 shadow-lg'
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="text-3xl">{getSportIcon(court.sportType || selectedSport)}</div>
                      <div>
                        <h3 className="font-bold text-gray-900 text-lg">{court.name}</h3>
                        <div className="flex items-center space-x-4 mt-1">
                          <div className="flex items-center text-gray-600">
                            <Users className="h-4 w-4 mr-1" />
                            <span className="text-sm">Hasta {court.capacity}</span>
                          </div>
                          {court.rating && (
                            <div className="flex items-center text-yellow-500">
                              <Star className="h-4 w-4 mr-1 fill-current" />
                              <span className="text-sm font-medium">{court.rating}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-xl text-gray-900">
                        {formatCurrency(court.pricePerHour)}
                      </div>
                      <div className="text-sm text-gray-500">por hora</div>
                    </div>
                  </div>
                  
                  {/* Amenidades */}
                  <div className="grid grid-cols-2 gap-2">
                    {court.amenities.slice(0, 4).map((amenity: string, index: number) => (
                      <div key={index} className="flex items-center text-sm text-gray-600">
                        <div className="text-green-500 mr-2">
                          {getAmenityIcon(amenity)}
                        </div>
                        <span className="truncate">{amenity}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            
            {selectedCourt && (
              <div className="mt-8">
                <button
                  onClick={() => navigateToStep(3)}
                  className="w-full bg-blue-600 text-white py-4 rounded-2xl font-semibold text-lg hover:bg-blue-700 transition-colors active:scale-98 flex items-center justify-center"
                >
                  Continuar
                  <ChevronRight className="h-5 w-5 ml-2" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Paso 3: Selección de Fecha y Hora */}
        {currentStep === 3 && (
          <div className="p-4">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                ¿Cuándo quieres jugar?
              </h2>
              <p className="text-gray-600">
                Selecciona la fecha y hora perfecta
              </p>
            </div>
            
            {/* Configuración rápida */}
            <div className="bg-white rounded-2xl p-5 mb-6 shadow-sm border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-4">Configuración</h3>
              
              <div className="space-y-4">
                {/* Fecha */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Calendar className="h-4 w-4 inline mr-2" />
                    Fecha
                  </label>
                  <input
                    type="date"
                    min={minSelectableDate}
                    max={maxSelectableDate}
                    value={selectedDate}
                    lang="es-ES"
                    data-locale="es-ES"
                    onChange={(e) => {
                      const clamped = clampDate(e.target.value);
                      setSelectedDate(clamped);
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                  />
                </div>

                {/* Duración */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Clock className="h-4 w-4 inline mr-2" />
                    Duración
                  </label>
                  <select
                    value={duration}
                    onChange={(e) => {
                      setDuration(Number(e.target.value));
                      setSelectedTime('');
                      setSelectedCalendarSlot(null);
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                  >
                    <option value={60}>1 hora</option>
                    <option value={90}>1.5 horas</option>
                    <option value={120}>2 horas</option>
                    <option value={180}>3 horas</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Calendario */}
            {selectedDate && (
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 mb-6 border border-blue-200">
                <div className="text-center">
                  <div className="text-4xl mb-4">📅</div>
                  <h3 className="text-xl font-bold text-blue-900 mb-2">
                    Calendario Inteligente
                  </h3>
                  <p className="text-blue-700 mb-6">
                    Ve todos los horarios disponibles en tiempo real
                  </p>
                  <button
                    onClick={handleOpenCalendarModal}
                    className="w-full bg-blue-600 text-white py-4 rounded-xl font-semibold text-lg hover:bg-blue-700 transition-colors active:scale-98 flex items-center justify-center"
                  >
                    <Calendar className="h-5 w-5 mr-2" />
                    Abrir Calendario
                  </button>
                </div>
              </div>
            )}

            {/* Horario seleccionado */}
            {selectedCalendarSlot && (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-5 mb-6">
                <div className="flex items-center">
                  <div className="text-2xl mr-3">✅</div>
                  <div>
                    <h4 className="font-semibold text-green-900">Horario Confirmado</h4>
                    <p className="text-green-700">
                      {formatTime(selectedCalendarSlot.startTime)} - {formatTime(selectedCalendarSlot.endTime)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Notas opcionales */}
            <div className="bg-white rounded-2xl p-5 mb-6 shadow-sm border border-gray-200">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Notas adicionales (opcional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                placeholder="¿Algo especial que debamos saber?"
              />
            </div>
            
            {canProceedFromStep(3) && (
              <div className="space-y-4">
                {/* Resumen del costo */}
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Total a pagar:</span>
                    <span className="text-2xl font-bold text-gray-900">
                      {formatCurrency(totalCost)}
                    </span>
                  </div>
                </div>
                
                <button
                  onClick={async () => {
                    console.log('🚀 [MOBILE-RESERVATION] Iniciando proceso de creación de reserva...');
                    console.log('🚀 [MOBILE-RESERVATION] Datos seleccionados:', {
                      selectedCourt: selectedCourt?.id,
                      selectedDate,
                      selectedCalendarSlot: selectedCalendarSlot?.startTime,
                      duration,
                      notes
                    });
                    
                    // Crear la reserva antes de abrir el modal de pago
                    if (!selectedCourt || !selectedDate || !selectedCalendarSlot) {
                      console.error('❌ [MOBILE-RESERVATION] Validación fallida:', {
                        hasCourt: !!selectedCourt,
                        hasDate: !!selectedDate,
                        hasSlot: !!selectedCalendarSlot
                      });
                      alert('Por favor completa la selección de cancha, fecha y horario.');
                      return;
                    }
                    
                    try {
                      const raw = selectedCalendarSlot.startTime;
                      console.log('🕐 [MOBILE-RESERVATION] Procesando horario:', raw);
                      
                      let startISO: string | null = null;
                      if (/^\d{2}:\d{2}$/.test(raw)) {
                        const local = new Date(`${selectedDate}T${raw}:00`);
                        if (!isNaN(local.getTime())) {
                          startISO = new Date(local.getTime() - local.getTimezoneOffset()*60000).toISOString();
                        }
                      } else {
                        const d = new Date(raw);
                        if (!isNaN(d.getTime())) startISO = d.toISOString();
                      }
                      
                      console.log('✅ [MOBILE-RESERVATION] StartISO generado:', startISO);
                      
                      if (!startISO) {
                        console.error('❌ [MOBILE-RESERVATION] Horario inválido');
                        alert('Horario seleccionado inválido. Intenta nuevamente.');
                        return;
                      }
                      
                      console.log('📤 [MOBILE-RESERVATION] Enviando datos a API:', {
                        courtId: selectedCourt.id,
                        startTime: startISO,
                        duration,
                        notes,
                      });
                      
                      const res: any = await api.reservations.create({
                        courtId: selectedCourt.id,
                        startTime: startISO,
                        duration,
                        notes,
                      });
                      
                      console.log('📥 [MOBILE-RESERVATION] Respuesta de API:', res);
                      
                       const reservationId = res?.reservation?.id || res?.id;
                       console.log('🆔 [MOBILE-RESERVATION] Reservation ID extraído:', reservationId);
                       
                       if (reservationId) {
                         console.log('✅ [MOBILE-RESERVATION] Abriendo modal de pago...');
                         setCreatedReservationId(reservationId);
                         setShowPaymentModal(true);
                         console.log('🎉 [MOBILE-RESERVATION] Modal de pago abierto exitosamente');
                       } else {
                         console.error('❌ [MOBILE-RESERVATION] No se obtuvo reservationId válido');
                         alert('No se pudo crear la reserva.');
                       }
                     } catch (error) {
                       console.error('💥 [MOBILE-RESERVATION] Error creating reservation:', error);
                       alert('Error al crear la reserva. Intenta nuevamente.');
                     }
                   }}
                   className="w-full bg-green-600 text-white py-4 rounded-2xl font-semibold text-lg hover:bg-green-700 transition-colors active:scale-98 flex items-center justify-center"
                 >
                  <CreditCard className="h-5 w-5 mr-2" />
                  Proceder al Pago
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modales */}
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

      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        reservationId={createdReservationId || ''}
        amount={Number((pricing?.total ?? totalCost) || 0)}
        currency="COP"
        courtName={selectedCourt?.name || ''}
        dateLabel={selectedDate}
        timeLabel={selectedTime}
        pricingDetails={
          pricing
            ? {
                basePrice: pricing.basePrice ?? pricing.subtotal ?? totalCost ?? 0,
                discount: pricing.discount ?? 0,
                total: pricing.total ?? totalCost ?? 0,
                breakdown: Array.isArray(pricing.breakdown) ? pricing.breakdown : [],
                appliedRules: Array.isArray(pricing.appliedRules) ? pricing.appliedRules : [],
              }
            : undefined
        }
        onSuccess={() => router.push('/dashboard/reservations')}
      />
    </div>
  );
}

// Helper para formatear horas (acepta 'HH:MM' o ISO)
const formatTime = (timeString: string) => {
  if (/^\d{2}:\d{2}$/.test(timeString)) return timeString;
  const parsed = new Date(timeString);
  if (!isNaN(parsed.getTime())) {
    return parsed.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  }
  const hhmm = timeString.match(/^(\d{2}):(\d{2})(?::\d{2})?$/);
  if (hhmm) {
    return hhmm[0].slice(0, 5);
  }
  return timeString;
};