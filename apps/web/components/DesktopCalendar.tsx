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
} from 'lucide-react';

interface TimeSlot {
  time: string;
  startTime: string;
  endTime: string;
  status: 'AVAILABLE' | 'BOOKED' | 'MAINTENANCE' | 'USER_BOOKED' | 'PAST' | 'UNAVAILABLE';
  price: number;
  available: boolean;
}

interface DesktopCalendarProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
  duration: number;
  onDurationChange: (duration: number) => void;
  courtName?: string;
}

export function DesktopCalendar({
  selectedDate,
  onDateChange,
  duration,
  onDurationChange,
  courtName = '',
}: DesktopCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const calendarRef = useRef<HTMLDivElement>(null);

  // Helper: construir YYYY-MM-DD en hora local (sin uso de toISOString)
  const toLocalYMD = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  // Generar días del mes - Formato español (lunes a domingo)
  const generateCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    
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
      // Comparar usando fecha local para evitar desfases por UTC
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
        // Persistir la fecha seleccionable en formato local (no UTC)
        dateString: toLocalYMD(date),
      });
    }

    return days;
  };

  const calendarDays = generateCalendarDays();

  // Navegación del calendario
  const goToPreviousMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  // Formatear mes y año
  const formatMonth = (date: Date) => {
    return date.toLocaleDateString('es-ES', { 
      month: 'long', 
      year: 'numeric' 
    });
  };

  // Manejar selección de fecha
  const handleDateSelect = (dateString: string) => {
    onDateChange(dateString);
  };

  // Opciones de duración
  const durationOptions = [
    { value: 60, label: '1 hora' },
    { value: 90, label: '1.5 horas' },
    { value: 120, label: '2 horas' },
    { value: 180, label: '3 horas' },
  ];

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200 max-w-2xl mx-auto">
      {/* Header del calendario - Compacto */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4">
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={goToPreviousMonth}
            className="p-1.5 rounded-full hover:bg-white hover:bg-opacity-20 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          
          <h2 className="text-lg font-bold capitalize">
            {formatMonth(currentMonth)}
          </h2>
          
          <button
            onClick={goToNextMonth}
            className="p-1.5 rounded-full hover:bg-white hover:bg-opacity-20 transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        
        {courtName && (
          <p className="text-center text-blue-100 text-sm">
            {courtName}
          </p>
        )}
      </div>

      {/* Días de la semana - Compacto */}
      <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
        {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((day) => (
          <div key={day} className="p-2 text-center text-xs font-semibold text-gray-600">
            {day}
          </div>
        ))}
      </div>

      {/* Calendario - Compacto */}
      <div
        ref={calendarRef}
        className="grid grid-cols-7"
      >
        {calendarDays.map((day, index) => (
          <button
            key={index}
            onClick={() => !day.isPast && day.dateString && handleDateSelect(day.dateString)}
            disabled={day.isPast}
            className={`
              p-2 text-center transition-all duration-200 hover:bg-blue-50
              ${day.isCurrentMonth ? 'text-gray-900' : 'text-gray-400'}
              ${day.isToday ? 'bg-blue-100 font-bold' : ''}
              ${day.isSelected ? 'bg-blue-600 text-white font-bold' : ''}
              ${day.isPast ? 'cursor-not-allowed opacity-50' : 'hover:bg-blue-50 cursor-pointer'}
              ${day.isWeekend ? 'bg-gray-50' : ''}
              ${day.isSelected && day.isWeekend ? 'bg-blue-700' : ''}
            `}
          >
            <div className="text-sm">{day.day}</div>
            {day.isToday && !day.isSelected && (
              <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mx-auto mt-1"></div>
            )}
          </button>
        ))}
      </div>

      {/* Selección de duración - Compacta */}
      <div className="p-4 bg-gray-50 border-t border-gray-200">
        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Clock className="h-4 w-4 inline mr-1" />
            Duración
          </label>
          <div className="grid grid-cols-4 gap-2">
            {durationOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => onDurationChange(option.value)}
                className={`
                  px-3 py-2 rounded-md text-xs font-medium transition-colors
                  ${duration === option.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-blue-50'
                  }
                `}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Información de la fecha seleccionada - Compacta */}
        {selectedDate && (
          <div className="bg-white rounded-md p-3 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">
                  Fecha seleccionada
                </h3>
                <p className="text-xs text-gray-600">
                  {new Date(selectedDate).toLocaleDateString('es-ES', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Duración</p>
                <p className="text-sm font-semibold text-gray-900">
                  {durationOptions.find(opt => opt.value === duration)?.label}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
