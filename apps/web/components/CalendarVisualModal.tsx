'use client';

import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, Check } from 'lucide-react';
import { api } from '@/lib/api';
import { CalendarData, CalendarSlot } from '@/types/calendar.types';

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
  const [calendarData, setCalendarData] = useState<CalendarData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<CalendarSlot | null>(null);
  const [currentStep, setCurrentStep] = useState<'selection' | 'confirmation'>('selection');
  const [isCreatingReservation, setIsCreatingReservation] = useState(false);

  // 🔄 CARGAR DATOS DEL CALENDARIO
  useEffect(() => {
    const loadCalendarData = async () => {
      if (!courtId || !date || !isOpen) return;
      
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
  }, [courtId, date, duration, isOpen]);

  // 🎨 FUNCIÓN PARA OBTENER ESTILOS DEL SLOT
  const getSlotStyles = (slot: CalendarSlot) => {
    const baseStyles = {
      padding: '8px 12px',
      margin: '2px',
      borderRadius: '6px',
      cursor: slot.available ? 'pointer' : 'not-allowed',
      border: '2px solid transparent',
      transition: 'all 0.2s ease',
      fontSize: '12px',
      fontWeight: '500',
      textAlign: 'center' as const,
      minHeight: '40px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column' as const,
      position: 'relative' as const
    };

    // Estilos específicos por estado
    switch (slot.status) {
      case 'AVAILABLE':
        return {
          ...baseStyles,
          backgroundColor: slot.color,
          color: 'white',
          border: selectedSlot?.time === slot.time ? '2px solid #1f2937' : '2px solid transparent',
          transform: selectedSlot?.time === slot.time ? 'scale(1.05)' : 'scale(1)',
          boxShadow: selectedSlot?.time === slot.time ? '0 4px 12px rgba(0,0,0,0.15)' : 'none'
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
    const date = new Date(timeString);
    return date.toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
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
      const reservationData = {
        courtId,
        startTime: selectedSlot.startTime,
        duration,
        notes: notes || undefined
      };
      
      const response = await api.reservations.create(reservationData);
      
      if (response?.id) {
        // Notificar al componente padre que se creó la reserva
        onSlotSelect(selectedSlot);
        onReservationCreated(response.id);
        onClose();
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

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay de fondo */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal central responsive */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-6xl max-h-[95vh] overflow-hidden">
                     {/* Header del modal */}
           <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 sm:p-6 rounded-t-2xl relative">
             {/* 🚀 BOTÓN DE CERRAR REPOSICIONADO - MÁS VISIBLE */}
             <button
               onClick={onClose}
               className="absolute top-2 right-2 text-white hover:text-blue-100 transition-colors p-3 rounded-full hover:bg-blue-600 z-10"
             >
               <X className="h-6 w-6" />
             </button>
             
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

           {/* 🚀 BOTÓN CONFIRMAR HORARIO FIJO EN LA PARTE SUPERIOR */}
           {currentStep === 'selection' && (
             <div className="px-4 sm:px-6 py-3 bg-white border-b border-gray-200 shadow-sm">
               <div className="flex justify-center">
                 <button
                   onClick={handleConfirm}
                   disabled={!selectedSlot}
                   className={`
                     px-12 py-4 rounded-xl font-bold text-lg transition-all duration-200 flex items-center justify-center space-x-3 shadow-lg transform hover:scale-105
                     ${selectedSlot
                       ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-blue-200 ring-2 ring-blue-200 ring-opacity-50 animate-pulse'
                       : 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-gray-200'
                     }
                   `}
                 >
                   <span>{selectedSlot ? '✓ Confirmar Horario Seleccionado' : '💡 Selecciona un Horario Primero'}</span>
                   <Check className="h-5 w-5" />
                 </button>
               </div>
               {selectedSlot && (
                 <p className="text-center text-sm text-gray-600 mt-2">
                   📅 {formatTime(selectedSlot.startTime)} - {formatTime(selectedSlot.endTime)} • {duration} min
                 </p>
               )}
             </div>
           )}

                     {/* Contenido del modal */}
           <div className="p-4 sm:p-6 overflow-y-auto max-h-[70vh]">
             {loading ? (
               <div className="flex items-center justify-center p-8">
                 <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                 <span className="ml-2 text-gray-600">Cargando calendario...</span>
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
                     {Object.entries(calendarData.legend).map(([key, legend]) => (
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



                 {/* 📅 CALENDARIO VISUAL RESPONSIVE */}
                 <div className="bg-white rounded-lg shadow-sm border p-4">
                   <h4 className="font-medium mb-4">Horarios Disponibles</h4>
                   
                   <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                     {calendarData.slots.map((slot, index) => (
                       <div
                         key={index}
                         style={getSlotStyles(slot)}
                         onClick={() => handleSlotClick(slot)}
                         title={getTooltipContent(slot)}
                         className={`
                           ${slot.available ? 'hover:scale-105 hover:shadow-md' : ''}
                           ${selectedSlot?.time === slot.time ? 'ring-4 ring-blue-400 ring-opacity-75 scale-105 shadow-xl border-blue-400 animate-pulse' : ''}
                         `}
                       >
                         <div className="font-medium text-xs sm:text-sm">
                           {formatTime(slot.startTime)}
                         </div>
                         <div className="text-xs opacity-90 hidden sm:block">
                           {slot.message}
                         </div>
                         
                         {/* Indicador de duración */}
                         {slot.available && (
                           <div className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs px-1 rounded-full">
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

                     {/* Botones de acción */}
           <div className="p-4 sm:p-6 border-t border-gray-200 bg-gray-50">
             <div className="flex flex-col sm:flex-row justify-between items-center space-y-3 sm:space-y-0">
               {currentStep === 'selection' ? (
                 // 🚀 PASO 1: SOLO BOTÓN CANCELAR (Confirmar está arriba)
                 <div className="flex justify-center">
                   <button
                     onClick={onClose}
                     className="px-8 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                   >
                     ❌ Cancelar
                   </button>
                 </div>
               ) : (
                 // 🚀 PASO 2: BOTONES DE CONFIRMACIÓN
                 <>
                   <button
                     onClick={handleBackToSelection}
                     className="w-full sm:w-auto px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                   >
                     ← Volver
                   </button>
                   
                   <button
                     onClick={handleContinue}
                     disabled={isCreatingReservation}
                     className="w-full sm:w-auto px-10 py-4 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-xl font-bold text-lg transition-all duration-200 flex items-center justify-center space-x-3 shadow-lg transform hover:scale-105 ring-2 ring-green-200 ring-opacity-50 shadow-green-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                   >
                     <span>{isCreatingReservation ? '⏳ Creando Reserva...' : '🚀 Confirmar y Pagar'}</span>
                     {isCreatingReservation ? (
                       <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                     ) : (
                       <Check className="h-5 w-5" />
                     )}
                   </button>
                 </>
               )}
             </div>
           </div>
        </div>
      </div>
    </>
  );
}
