"use client";

import { useState, useEffect, useRef } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  Check,
  X,
  AlertCircle,
  Zap,
} from 'lucide-react';

interface TimeSlot {
  time: string;
  startTime: string;
  endTime: string;
  status: 'AVAILABLE' | 'BOOKED' | 'MAINTENANCE' | 'USER_BOOKED' | 'PAST' | 'UNAVAILABLE';
  price: number;
  available: boolean;
}

interface MobileCalendarProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
  duration: number;
  onDurationChange: (duration: number) => void;
  timeSlots: TimeSlot[];
  selectedSlot: TimeSlot | null;
  onSlotSelect: (slot: TimeSlot) => void;
  loading?: boolean;
  courtName?: string;
  onContinue?: () => void;
}

export function MobileCalendar({
  selectedDate,
  onDateChange,
  duration,
  onDurationChange,
  timeSlots,
  selectedSlot,
  onSlotSelect,
  loading = false,
  courtName = '',
  onContinue,
}: MobileCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Helper consistente: YYYY-MM-DD en zona local
  const toLocalYMD = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };
  const [showTimeSlots, setShowTimeSlots] = useState(false);
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null);
  const calendarRef = useRef<HTMLDivElement>(null);
  const timeSlotsRef = useRef<HTMLDivElement>(null);

  // Generar días del mes - Formato español (lunes a domingo)
  const generateCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // Calcular el primer lunes de la semana que contiene el primer día del mes
    const startDate = new Date(firstDay);
    const dayOfWeek = firstDay.getDay(); // 0 = domingo, 1 = lunes, ..., 6 = sábado
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Si es domingo (0), restar 6 días; si no, restar (día - 1)
    startDate.setDate(startDate.getDate() - daysToSubtract);

    const days = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      
      const isCurrentMonth = date.getMonth() === month;
      const isToday = date.getTime() === today.getTime();
      const isPast = date < today;
      const isSelected = selectedDate === toLocalYMD(date);
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
      
      days.push({
        date,
        day: date.getDate(),
        isCurrentMonth,
        isToday,
        isPast,
        isSelected,
        isWeekend,
      dateString: toLocalYMD(date),
      });
    }

    return days;
  };

  const calendarDays = generateCalendarDays();

  // Navegación de meses
  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  // Gestos táctiles para navegación
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    if (e.targetTouches[0]) {
      setTouchStart({
        x: e.targetTouches[0].clientX,
        y: e.targetTouches[0].clientY,
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.targetTouches[0]) {
      setTouchEnd({
        x: e.targetTouches[0].clientX,
        y: e.targetTouches[0].clientY,
      });
    }
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distanceX = touchStart.x - touchEnd.x;
    const distanceY = Math.abs(touchStart.y - touchEnd.y);
    const isHorizontalSwipe = Math.abs(distanceX) > distanceY;
    const minSwipeDistance = 50;

    if (isHorizontalSwipe && Math.abs(distanceX) > minSwipeDistance) {
      if (distanceX > 0) {
        // Swipe left - next month
        goToNextMonth();
      } else {
        // Swipe right - previous month
        goToPreviousMonth();
      }
      
      // Haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate(10);
      }
    }
  };

  // Formatear fecha
  const formatMonth = (date: Date) => {
    return date.toLocaleDateString('es-ES', { 
      month: 'long', 
      year: 'numeric' 
    });
  };

  const formatTime = (time: string) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Obtener color del slot según estado
  const getSlotColor = (slot: TimeSlot) => {
    switch (slot.status) {
      case 'AVAILABLE':
        return 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200';
      case 'BOOKED':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'MAINTENANCE':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'USER_BOOKED':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'PAST':
        return 'bg-gray-100 text-gray-500 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-500 border-gray-200';
    }
  };

  const getSlotIcon = (slot: TimeSlot) => {
    switch (slot.status) {
      case 'AVAILABLE':
        return <Check className="h-4 w-4" />;
      case 'BOOKED':
        return <X className="h-4 w-4" />;
      case 'MAINTENANCE':
        return <AlertCircle className="h-4 w-4" />;
      case 'USER_BOOKED':
        return <Zap className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  // Formatear precio
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Manejar selección de fecha
  const handleDateSelect = (dateString: string) => {
    onDateChange(dateString);
    setShowTimeSlots(true);
    
    // Scroll suave a los horarios
    setTimeout(() => {
      timeSlotsRef.current?.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
      });
    }, 100);
  };

  // Duración disponible
  const durationOptions = [
    { value: 60, label: '1 hora' },
    { value: 90, label: '1.5 horas' },
    { value: 120, label: '2 horas' },
    { value: 180, label: '3 horas' },
  ];

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
      {/* Header del calendario */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={goToPreviousMonth}
            className="p-2 rounded-full hover:bg-white hover:bg-opacity-20 transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          
          <h2 className="text-xl font-bold capitalize">
            {formatMonth(currentMonth)}
          </h2>
          
          <button
            onClick={goToNextMonth}
            className="p-2 rounded-full hover:bg-white hover:bg-opacity-20 transition-colors"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
        
        {courtName && (
          <p className="text-center text-blue-100 text-sm">
            {courtName}
          </p>
        )}
      </div>

      {/* Días de la semana - Formato español (lunes a domingo) */}
      <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
        {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((day) => (
          <div key={day} className="p-3 text-center text-sm font-medium text-gray-600">
            {day}
          </div>
        ))}
      </div>

      {/* Calendario */}
      <div
        ref={calendarRef}
        className="grid grid-cols-7"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {calendarDays.map((day, index) => (
          <button
            key={index}
            onClick={() => !day.isPast && day.isCurrentMonth && day.dateString && handleDateSelect(day.dateString)}
            disabled={day.isPast || !day.isCurrentMonth}
            className={`
              aspect-square p-2 text-sm font-medium transition-all duration-200 relative
              ${day.isCurrentMonth ? 'text-gray-900' : 'text-gray-300'}
              ${day.isPast ? 'cursor-not-allowed' : 'cursor-pointer'}
              ${day.isSelected ? 'bg-blue-600 text-white' : ''}
              ${day.isToday && !day.isSelected ? 'bg-blue-100 text-blue-600' : ''}
              ${!day.isPast && day.isCurrentMonth && !day.isSelected ? 'hover:bg-gray-100 active:scale-95' : ''}
              ${day.isWeekend && day.isCurrentMonth ? 'text-red-600' : ''}
            `}
          >
            <span className="relative z-10">{day.day}</span>
            
            {day.isToday && (
              <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-blue-600 rounded-full" />
            )}
            
            {day.isSelected && (
              <div className="absolute inset-0 bg-blue-600 rounded-lg" />
            )}
          </button>
        ))}
      </div>

      {/* Selector de duración */}
      {selectedDate && (
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            <Clock className="h-4 w-4 inline mr-2" />
            Duración de la reserva
          </label>
          <div className="grid grid-cols-2 gap-2">
            {durationOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => onDurationChange(option.value)}
                className={`p-3 rounded-xl text-sm font-medium transition-all duration-200 active:scale-95 ${
                  duration === option.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-200 hover:border-gray-300'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Horarios disponibles */}
      {showTimeSlots && selectedDate && (
        <div ref={timeSlotsRef} className="p-4 border-t border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Horarios disponibles
            </h3>
            <span className="text-sm text-gray-500">
              {new Date(selectedDate).toLocaleDateString('es-ES', {
                weekday: 'long',
                day: 'numeric',
                month: 'long'
              })}
            </span>
          </div>
          
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2" />
              <p className="text-gray-600">Cargando horarios...</p>
            </div>
          ) : timeSlots.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-2">😔</div>
              <p className="text-gray-600">No hay horarios disponibles para esta fecha</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {timeSlots.map((slot, index) => (
                <button
                  key={index}
                  onClick={() => slot.available && onSlotSelect(slot)}
                  disabled={!slot.available}
                  className={`
                    p-4 rounded-xl border-2 transition-all duration-200 text-left
                    ${selectedSlot?.time === slot.time ? 'ring-2 ring-blue-500 ring-offset-2' : ''}
                    ${slot.available ? 'active:scale-95' : 'cursor-not-allowed opacity-60'}
                    ${getSlotColor(slot)}
                  `}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      {getSlotIcon(slot)}
                      <span className="ml-2 font-semibold">
                        {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                      </span>
                    </div>
                    {selectedSlot?.time === slot.time && (
                      <Check className="h-5 w-5 text-blue-600" />
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium">
                      {slot.status === 'AVAILABLE' ? 'Disponible' :
                       slot.status === 'BOOKED' ? 'Ocupado' :
                       slot.status === 'MAINTENANCE' ? 'Mantenimiento' :
                       slot.status === 'USER_BOOKED' ? 'Tu reserva' :
                       'No disponible'}
                    </span>
                    {slot.available && (
                      <span className="text-sm font-bold">
                        {formatCurrency(slot.price)}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Botón de continuar */}
      {selectedSlot && onContinue && (
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={onContinue}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors duration-200 flex items-center justify-center"
          >
            <Check className="h-5 w-5 mr-2" />
            Continuar con la reserva
          </button>
        </div>
      )}

      {/* Instrucciones de uso */}
      <div className="p-4 bg-blue-50 border-t border-blue-200">
        <div className="flex items-start">
          <Calendar className="h-5 w-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Cómo usar el calendario:</p>
            <ul className="space-y-1 text-xs">
              <li>• Desliza horizontalmente para cambiar de mes</li>
              <li>• Toca una fecha para ver horarios disponibles</li>
              <li>• Selecciona la duración antes de elegir horario</li>
              <li>• Los horarios en verde están disponibles</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}