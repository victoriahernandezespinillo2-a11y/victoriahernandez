'use client';

import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, Check } from 'lucide-react';
import { api } from '@/lib/api';
import { CalendarData, CalendarSlot } from '@/types/calendar.types';
import PaymentModal from '@/app/components/PaymentModal';
import { useFirebaseAuth } from './auth/FirebaseAuthProvider';

interface CalendarVisualModalProps {
  isOpen: boolean;
  courtId: string;
  date: string;
  duration: number;
  selectedSport: string;
  selectedCourt: any;
  notes?: string;
  onSlotSelect: (slot: CalendarSlot) => void;
  onClose: () => void;
  onReservationCreated: (reservationId: string) => void;
}

export default function CalendarVisualModal({
  isOpen,
  courtId,
  date,
  duration,
  selectedSport,
  selectedCourt,
  notes,
  onSlotSelect,
  onClose,
  onReservationCreated
}: CalendarVisualModalProps) {
  const { firebaseUser, loading: authLoading } = useFirebaseAuth();
  const [calendarData, setCalendarData] = useState<CalendarData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<CalendarSlot | null>(null);
  const [currentStep, setCurrentStep] = useState<'selection' | 'confirmation'>('selection');
  const [isCreatingReservation, setIsCreatingReservation] = useState(false);
  
  // 🚀 GESTOS TÁCTILES PARA MÓVIL
  const [touchStart, setTouchStart] = useState<{ y: number; time: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  
  // 🚀 MANEJO DE GESTOS TÁCTILES
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;
    setTouchStart({ y: touch.clientY, time: Date.now() });
    setIsDragging(false);
    setDragOffset(0);
  };
  
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStart) return;
    
    const touch = e.touches[0];
    if (!touch) return;
    const deltaY = touch.clientY - touchStart.y;
    
    // Solo permitir swipe hacia abajo
    if (deltaY > 0) {
      setIsDragging(true);
      setDragOffset(Math.min(deltaY, 200)); // Limitar el drag
      
      // Prevenir scroll del body durante el drag
      e.preventDefault();
    }
  };
  
  const handleTouchEnd = () => {
    if (!touchStart || !isDragging) {
      setTouchStart(null);
      setIsDragging(false);
      setDragOffset(0);
      return;
    }
    
    const swipeDistance = dragOffset;
    const swipeTime = Date.now() - touchStart.time;
    const swipeVelocity = swipeDistance / swipeTime;
    
    // Cerrar modal si el swipe es suficiente (distancia > 100px o velocidad > 0.5)
    if (swipeDistance > 100 || swipeVelocity > 0.5) {
      onClose();
    }
    
    // Reset states
    setTouchStart(null);
    setIsDragging(false);
    setDragOffset(0);
  };

  // 🔄 CARGAR DATOS DEL CALENDARIO
  useEffect(() => {
    const loadCalendarData = async () => {
      // 🔒 Esperar a que la autenticación de Firebase se complete y el modal esté abierto
      if (!courtId || !date || !isOpen || authLoading || !firebaseUser) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const data = await api.courts.getCalendarStatus(courtId, { date, duration });
        setCalendarData(data);
      } catch (err: any) {
        setError(err?.message || 'Error cargando calendario');
        console.error('Error loading calendar:', err);
      } finally {
        setLoading(false);
      }
    };

    loadCalendarData();
  }, [courtId, date, duration, isOpen, authLoading, firebaseUser]);

  // 🎨 FUNCIÓN PARA OBTENER ESTILOS DEL SLOT MÓVIL-OPTIMIZADO
  const getSlotStyles = (slot: CalendarSlot) => {
    const baseStyles = {
      padding: '12px 8px',
      margin: '2px',
      borderRadius: '8px',
      cursor: slot.available ? 'pointer' : 'not-allowed',
      border: '2px solid transparent',
      transition: 'all 0.3s ease',
      fontSize: '12px',
      fontWeight: '600',
      textAlign: 'center' as const,
      minHeight: '60px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column' as const,
      position: 'relative' as const,
      userSelect: 'none' as const,
      WebkitTapHighlightColor: 'transparent'
    };

    // Estilos específicos por estado
    switch (slot.status) {
      case 'AVAILABLE':
        return {
          ...baseStyles,
          backgroundColor: slot.color,
          color: 'white',
          border: selectedSlot?.time === slot.time ? '3px solid #1f2937' : '2px solid transparent',
          transform: selectedSlot?.time === slot.time ? 'scale(1.08)' : 'scale(1)',
          boxShadow: selectedSlot?.time === slot.time ? '0 6px 20px rgba(0,0,0,0.2)' : '0 2px 8px rgba(0,0,0,0.1)'
        };
      
      case 'BOOKED':
        return {
          ...baseStyles,
          backgroundColor: slot.color,
          color: 'white',
          opacity: 0.8
        };
      
      case 'MAINTENANCE':
        return {
          ...baseStyles,
          backgroundColor: slot.color,
          color: 'white',
          opacity: 0.9
        };
      
      case 'USER_BOOKED':
        return {
          ...baseStyles,
          backgroundColor: slot.color,
          color: 'white',
          opacity: 0.9
        };
      
      case 'PAST':
        return {
          ...baseStyles,
          backgroundColor: slot.color,
          color: 'white',
          opacity: 0.6
        };
      
      case 'UNAVAILABLE':
        return {
          ...baseStyles,
          backgroundColor: slot.color,
          color: 'white',
          opacity: 0.7
        };
      
      default:
        return baseStyles;
    }
  };

  // 🕐 FUNCIÓN PARA FORMATEAR HORA
  const formatTime = (timeString: string) => {
    // Si viene ya en formato HH:MM desde la API, devolver tal cual
    if (/^\d{2}:\d{2}$/.test(timeString)) {
      return timeString;
    }

    // Intentar parsear como fecha completa (ISO u otros formatos válidos)
    const parsed = new Date(timeString);
    if (!isNaN(parsed.getTime())) {
      return parsed.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit'
      });
    }

    // Fallback: si parece una hora (HH:MM(:SS)?) pero no parsea, combinar con la fecha seleccionada
    const hhmm = timeString.match(/^(\d{2}):(\d{2})(?::\d{2})?$/);
    if (hhmm) {
      const composed = new Date(`${date}T${hhmm[0]}`);
      if (!isNaN(composed.getTime())) {
        return composed.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
      }
      // si aun así falla, devolvemos HH:MM
      return hhmm[0].slice(0, 5);
    }

    // Último recurso: devolver el string original
    return timeString;
  };

  // 🎯 FUNCIÓN PARA MANEJAR CLICK EN SLOT
  const handleSlotClick = (slot: CalendarSlot) => {
    if (slot.available) {
      setSelectedSlot(slot);
    }
  };

  // 🔍 FUNCIÓN PARA MOSTRAR TOOLTIP
  const getTooltipContent = (slot: CalendarSlot) => {
    let content = `${formatTime(slot.startTime)} - ${formatTime(slot.endTime)}\n${slot.message}`;
    
    if (slot.conflicts.length > 0) {
      content += '\n\nDetalles:';
      slot.conflicts.forEach(conflict => {
        if (conflict.type === 'maintenance') {
          content += `\n• Mantenimiento: ${conflict.description}`;
        } else if (conflict.type === 'reservation') {
          content += `\n• Reserva: ${conflict.status}`;
        }
      });
    }
    
    return content;
  };

  // 🚀 FUNCIÓN PARA CONFIRMAR SELECCIÓN
  const handleConfirm = () => {
    if (selectedSlot) {
      setCurrentStep('confirmation');
    }
  };

  // 🚀 FUNCIÓN PARA CREAR RESERVA Y CONTINUAR AL PAGO
  const handleContinue = async () => {
    if (!selectedSlot) return;
    
    setIsCreatingReservation(true);
    
    try {
      // Crear la reserva directamente con los campos correctos según la API
      const hhmm = (selectedSlot.startTime || '').slice(0, 5);
      const startISO = `${date}T${hhmm}:00.000Z`;
      console.log('🔍 [FRONTEND-DEBUG] Creando reserva con datos:', {
        courtId,
        startTime: startISO,
        duration,
        notes: notes || undefined
      });
      
      const reservationData = {
        courtId,
        startTime: startISO,
        duration,
        paymentMethod: 'redsys' as 'redsys', // ⭐ AGREGAR método de pago por defecto con literal tipo
        notes: notes || undefined
      };
      
      const response = await api.reservations.create(reservationData);
      console.log('🔍 [REDSYS-DEBUG] Response API reserva:', response);
      // Extraer objeto de reserva: puede venir directo o en 'reservation'
      const reservation = (response as any)?.reservation ?? (response as any);
      
      if (reservation?.id) {
        if (window.innerWidth >= 768) {
          // Mostrar modal de métodos de pago en escritorio
          const start = new Date(startISO);
          const end = new Date(start.getTime() + duration * 60000);
          const dateLabel = start.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
          const timeLabel = `${start.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;
          setPaymentInfo({ reservationId: reservation.id, amount: reservation.totalPrice || 0, dateLabel, timeLabel });
        } else {
          // Mobile: misma lógica previa
          window.location.href = `/api/payments/redsys/redirect?rid=${reservation.id}`;
        }
        return;
      } else {
        throw new Error('No se pudo crear la reserva');
      }
    } catch (error: any) {
      console.error('Error creating reservation:', error);
      setError(error?.message || 'Error al crear la reserva');
    } finally {
      setIsCreatingReservation(false);
    }
  };

  // 🚀 FUNCIÓN PARA VOLVER A SELECCIÓN
  const handleBackToSelection = () => {
    setCurrentStep('selection');
  };

  // 🗓️ FUNCIÓN PARA FORMATEAR FECHA
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // 📊 Helper para mapear las claves de la leyenda al resumen
  const getSummaryCount = (key: string) => {
    if (!calendarData) return 0;
    const map: Record<string, keyof typeof calendarData.summary> = {
      AVAILABLE: 'available',
      BOOKED: 'booked',
      MAINTENANCE: 'maintenance',
      USER_BOOKED: 'userBooked',
      PAST: 'past',
      UNAVAILABLE: 'unavailable',
    };
    const mappedKey = (map[key] || (key.toLowerCase() as keyof typeof calendarData.summary));
    return calendarData.summary[mappedKey] || 0;
  };

  const [paymentInfo, setPaymentInfo] = useState<{
    reservationId: string;
    amount: number;
    dateLabel: string;
    timeLabel: string;
  } | null>(null);

  const closePaymentModal = () => setPaymentInfo(null);

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay de fondo */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal central responsive - Optimizado para móvil */}
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
        <div 
          className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl border border-gray-200 w-full max-w-6xl h-[98vh] xs:h-[95vh] sm:max-h-[95vh] overflow-hidden animate-slide-up sm:animate-none modal-mobile"
          style={{
            transform: `translateY(${dragOffset}px)`,
            opacity: isDragging ? Math.max(0.5, 1 - dragOffset / 200) : 1,
            transition: isDragging ? 'none' : 'transform 0.3s ease-out, opacity 0.3s ease-out'
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
                     {/* Header del modal - Optimizado para móvil */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-3 xs:p-4 sm:p-6 rounded-t-3xl sm:rounded-t-2xl relative">
             {/* 🚀 BOTÓN DE CERRAR MÓVIL-FRIENDLY */}
             <button
               onClick={onClose}
               className="absolute top-4 right-4 text-white hover:text-blue-100 transition-colors p-2 rounded-full hover:bg-blue-600 z-10 bg-black bg-opacity-20 button-native touch-feedback"
               aria-label="Cerrar modal"
             >
               <X className="h-5 w-5" />
             </button>
             
             {/* 🚀 HANDLE VISUAL PARA MÓVIL */}
             <div className="sm:hidden w-12 h-1 bg-white bg-opacity-30 rounded-full mx-auto mb-4"></div>
             
             <div className="flex items-center justify-between">
               <div className="flex items-center space-x-3">
                 <Calendar className="h-6 w-6" />
                 <div>
                   <h2 className="text-lg sm:text-xl font-bold">Calendario Visual Inteligente</h2>
                   <p className="text-blue-100 text-sm sm:text-base">
                     {formatDate(date)} • {duration} minutos
                   </p>
                 </div>
               </div>
             </div>
             
             {/* 🚀 INDICADORES DE PROGRESO */}
             <div className="mt-4 flex items-center justify-center space-x-4">
               <div className={`flex items-center space-x-2 ${currentStep === 'selection' ? 'text-white' : 'text-blue-200'}`}>
                 <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold ${
                   currentStep === 'selection' ? 'border-white bg-white text-blue-600' : 'border-blue-200 text-blue-200'
                 }`}>
                   1
                 </div>
                 <span className="text-sm">Seleccionar Horario</span>
               </div>
               
               <div className="w-8 h-0.5 bg-blue-400"></div>
               
               <div className={`flex items-center space-x-2 ${currentStep === 'confirmation' ? 'text-white' : 'text-blue-200'}`}>
                 <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold ${
                   currentStep === 'confirmation' ? 'border-white bg-white text-blue-600' : 'border-blue-200 text-blue-200'
                 }`}>
                   2
                 </div>
                 <span className="text-sm">Confirmar</span>
               </div>
             </div>
           </div>

           {/* 🚀 BOTÓN CONFIRMAR HORARIO MÓVIL-OPTIMIZADO */}
           {currentStep === 'selection' && (
             <div className="px-4 sm:px-6 py-4 bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
               <div className="flex justify-center">
                 <button
                   onClick={handleConfirm}
                   disabled={!selectedSlot}
                   className={`
                     w-full sm:w-auto px-8 sm:px-12 py-4 sm:py-4 rounded-xl font-bold text-base sm:text-lg transition-all duration-200 flex items-center justify-center space-x-3 shadow-lg transform active:scale-95 touch-manipulation
                     ${selectedSlot
                       ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-blue-200 ring-2 ring-blue-200 ring-opacity-50 animate-pulse'
                       : 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-gray-200'
                     }
                   `}
                 >
                   <span className="text-center">{selectedSlot ? '✓ Confirmar Horario Seleccionado' : '💡 Selecciona un Horario Primero'}</span>
                   <Check className="h-5 w-5" />
                 </button>
               </div>
               {selectedSlot && (
                 <p className="text-center text-sm text-gray-600 mt-3">
                   📅 {formatTime(selectedSlot.startTime)} - {formatTime(selectedSlot.endTime)} • {duration} min
                 </p>
               )}
             </div>
           )}

                     {/* Contenido del modal móvil-optimizado */}
           <div className="p-3 xs:p-4 sm:p-6 overflow-y-auto max-h-[70vh] xs:max-h-[65vh] sm:max-h-[70vh] overscroll-behavior-contain">
             {loading ? (
                <div className="space-y-6">
                  <div className="flex flex-col items-center justify-center p-8 space-y-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    <p className="text-gray-600 loading-pulse">Cargando horarios disponibles...</p>
                  </div>
                  
                  {/* Skeleton loading para slots */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {Array.from({ length: 12 }).map((_, i) => (
                      <div key={i} className="h-16 sm:h-14 rounded-lg shimmer"></div>
                    ))}
                  </div>
                </div>
              ) : error ? (
               <div className="text-center p-8 text-red-600">
                 <p>❌ Error cargando calendario: {error}</p>
                 <button 
                   onClick={() => window.location.reload()} 
                   className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                 >
                   Reintentar
                 </button>
               </div>
             ) : !calendarData ? (
               <div className="text-center p-8 text-gray-500">
                 No hay datos del calendario disponibles
               </div>
             ) : currentStep === 'selection' ? (
               // 🚀 PASO 1: SELECCIÓN DE HORARIO
               <div className="space-y-6">
                 {/* 🎯 HORARIO SELECCIONADO */}
                 {selectedSlot && (
                   <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                     <div className="flex items-center justify-between">
                       <div className="flex items-center space-x-3">
                         <Check className="h-6 w-6 text-green-600" />
                         <div>
                           <p className="font-semibold text-green-800">Horario Seleccionado:</p>
                           <p className="text-green-700">
                             {formatTime(selectedSlot.startTime)} - {formatTime(selectedSlot.endTime)}
                           </p>
                         </div>
                       </div>
                       <div className="text-sm text-green-600">
                         {duration} minutos
                       </div>
                     </div>
                   </div>
                 )}

                 {/* 📊 RESUMEN DEL CALENDARIO */}
                 <div className="bg-white rounded-lg shadow-sm border p-4">
                   <h3 className="text-lg font-semibold mb-3">Resumen del {formatDate(date)}</h3>
                   
                   <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                     {calendarData.legend && Object.entries(calendarData.legend).map(([key, legend]) => (
                       <div key={key} className="flex items-center space-x-2">
                         <div 
                           className="w-4 h-4 rounded-full" 
                           style={{ backgroundColor: legend.color }}
                         ></div>
                         <span className="text-sm text-gray-600">
                           {legend.label}: {getSummaryCount(key)}
                         </span>
                       </div>
                     ))}
                   </div>
                 </div>



                 {/* 📅 CALENDARIO VISUAL MÓVIL-OPTIMIZADO */}
                 <div className="bg-white rounded-lg shadow-sm border p-4">
                   <h4 className="font-medium mb-4">Horarios Disponibles</h4>
                   
                   <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-2">
                     {calendarData.slots && calendarData.slots.map((slot, index) => (
                       <div
                         key={index}
                         style={getSlotStyles(slot)}
                         onClick={() => handleSlotClick(slot)}
                         title={getTooltipContent(slot)}
                         className={`
                           min-h-[60px] sm:min-h-[50px] touch-manipulation
                           ${slot.available ? 'hover:scale-105 hover:shadow-md active:scale-95' : ''}
                           ${selectedSlot?.time === slot.time ? 'ring-4 ring-blue-400 ring-opacity-75 scale-105 shadow-xl border-blue-400 animate-pulse' : ''}
                         `}
                       >
                         <div className="font-medium text-sm sm:text-xs">
                           {formatTime(slot.startTime)}
                         </div>
                         <div className="text-xs opacity-90 block sm:hidden truncate">
                           {slot.message}
                         </div>
                         <div className="text-xs opacity-90 hidden sm:block">
                           {slot.message}
                         </div>
                         
                         {/* Indicador de duración móvil-optimizado */}
                         {slot.available && (
                           <div className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded-full font-bold">
                             {duration}min
                           </div>
                         )}
                       </div>
                     ))}
                   </div>
                 </div>

                 {/* 💡 INFORMACIÓN ADICIONAL */}
                 <div className="bg-blue-50 rounded-lg p-4">
                   <h4 className="font-medium text-blue-800 mb-2">💡 Consejos</h4>
                   <ul className="text-sm text-blue-700 space-y-1">
                     <li>• <strong>Verde:</strong> Horario disponible para reservar</li>
                     <li>• <strong>Rojo:</strong> Horario ocupado por otro usuario</li>
                     <li>• <strong>Naranja:</strong> Cancha en mantenimiento</li>
                     <li>• <strong>Púrpura:</strong> Tu reserva existente</li>
                     <li>• <strong>Gris:</strong> Horario pasado</li>
                     <li>• <strong>Rojo oscuro:</strong> Cancha no disponible</li>
                   </ul>
                 </div>
               </div>
             ) : (
               // 🚀 PASO 2: CONFIRMACIÓN DEL HORARIO
               <div className="space-y-6">
                 <div className="text-center">
                   <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                     <Check className="h-8 w-8 text-green-600" />
                   </div>
                   <h3 className="text-2xl font-bold text-gray-900 mb-2">¡Horario Confirmado!</h3>
                   <p className="text-gray-600">Revisa los detalles de tu selección</p>
                 </div>

                 {/* 🎯 DETALLES DEL HORARIO */}
                 <div className="bg-white rounded-xl shadow-sm border p-6">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     {/* Fecha */}
                     <div className="flex items-start space-x-3">
                       <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                         <Calendar className="h-5 w-5 text-blue-600" />
                       </div>
                       <div>
                         <p className="text-sm font-medium text-gray-500">Fecha</p>
                         <p className="text-lg font-semibold text-gray-900">{formatDate(date)}</p>
                       </div>
                     </div>

                     {/* Horario */}
                     <div className="flex items-start space-x-3">
                       <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                         <Clock className="h-5 w-5 text-green-600" />
                       </div>
                       <div>
                         <p className="text-sm font-medium text-gray-500">Horario</p>
                         <p className="text-lg font-semibold text-gray-900">
                           {selectedSlot ? `${formatTime(selectedSlot.startTime)} - ${formatTime(selectedSlot.endTime)}` : ''}
                         </p>
                       </div>
                     </div>

                     {/* Duración */}
                     <div className="flex items-start space-x-3">
                       <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                         <span className="text-sm font-bold text-purple-600">{duration}</span>
                       </div>
                       <div>
                         <p className="text-sm font-medium text-gray-500">Duración</p>
                         <p className="text-lg font-semibold text-gray-900">{duration} minutos</p>
                       </div>
                     </div>

                     {/* Estado */}
                     <div className="flex items-start space-x-3">
                       <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                         <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                       </div>
                       <div>
                         <p className="text-sm font-medium text-gray-500">Estado</p>
                         <p className="text-lg font-semibold text-green-600">Disponible</p>
                       </div>
                     </div>
                   </div>
                 </div>

                 {/* 💡 INFORMACIÓN ADICIONAL */}
                 <div className="bg-blue-50 rounded-lg p-4">
                   <h4 className="font-medium text-blue-800 mb-2">💡 Próximo paso</h4>
                   <p className="text-sm text-blue-700">
                     Al continuar, serás dirigido al paso final de confirmación de tu reserva donde podrás revisar todos los detalles antes de confirmar.
                   </p>
                 </div>
               </div>
             )}
           </div>

                     {/* 🚀 BOTONES DE ACCIÓN MÓVIL-OPTIMIZADOS */}
           <div className="bg-white px-3 xs:px-4 sm:px-6 py-3 xs:py-4 sm:py-4 border-t border-gray-200 safe-area-bottom">
             {currentStep === 'selection' ? (
               <div className="flex flex-col sm:flex-row sm:justify-center space-y-3 sm:space-y-0">
                 <button
                   onClick={onClose}
                   className="w-full sm:w-auto px-8 py-4 sm:py-3 border border-gray-300 text-gray-700 rounded-xl sm:rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors font-medium text-base sm:text-sm button-native touch-feedback"
                 >
                   ❌ Cancelar
                 </button>
               </div>
             ) : (
               <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
                 <button
                   onClick={handleBackToSelection}
                   className="w-full sm:w-auto px-6 py-4 sm:py-3 border border-gray-300 text-gray-700 rounded-xl sm:rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors font-medium text-base sm:text-sm button-native touch-feedback"
                 >
                   ← Volver
                 </button>
                 
                 <button
                   onClick={handleContinue}
                   disabled={isCreatingReservation}
                   className="w-full sm:w-auto px-10 py-4 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-xl font-bold text-lg transition-all duration-200 flex items-center justify-center space-x-3 shadow-lg transform hover:scale-105 ring-2 ring-green-200 ring-opacity-50 shadow-green-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 button-native touch-feedback"
                 >
                   <span>{isCreatingReservation ? '⏳ Creando Reserva...' : '🚀 Confirmar y Pagar'}</span>
                   {isCreatingReservation ? (
                     <div className="flex items-center justify-center gap-3">
                       <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                       <span className="loading-pulse">Creando reserva...</span>
                     </div>
                   ) : (
                     <Check className="h-5 w-5" />
                   )}
                 </button>
               </div>
             )}
           </div>
        </div>
      </div>

      {/* PaymentModal escritorio */}
      {paymentInfo && (
        <PaymentModal
          isOpen={!!paymentInfo}
          onClose={closePaymentModal}
          reservationId={paymentInfo.reservationId}
          amount={paymentInfo.amount}
          courtName={selectedCourt?.name || 'Cancha'}
          dateLabel={paymentInfo.dateLabel}
          timeLabel={paymentInfo.timeLabel}
          onSuccess={closePaymentModal}
        />
      )}
    </>
  );
}
