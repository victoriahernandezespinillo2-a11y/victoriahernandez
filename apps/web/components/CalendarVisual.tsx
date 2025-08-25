'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';

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

interface CalendarData {
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

interface CalendarVisualProps {
  courtId: string;
  date: string;
  duration: number;
  onSlotSelect?: (slot: CalendarSlot) => void;
  selectedSlot?: CalendarSlot | null;
  onOpenTimeModal?: (slot: CalendarSlot) => void; // 🚀 NUEVO: Para abrir modal automáticamente
}

export default function CalendarVisual({ 
  courtId, 
  date, 
  duration, 
  onSlotSelect, 
  selectedSlot,
  onOpenTimeModal
}: CalendarVisualProps) {
  const [calendarData, setCalendarData] = useState<CalendarData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 🔄 CARGAR DATOS DEL CALENDARIO
  useEffect(() => {
    const loadCalendarData = async () => {
      if (!courtId || !date) return;
      
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
  }, [courtId, date, duration]);

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
      // 🚀 ABRIR MODAL AUTOMÁTICAMENTE
      if (onOpenTimeModal) {
        onOpenTimeModal(slot);
      }
      // También mantener la funcionalidad original si existe
      if (onSlotSelect) {
        onSlotSelect(slot);
      }
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

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Cargando calendario...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8 text-red-600">
        <p>❌ Error cargando calendario: {error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (!calendarData) {
    return (
      <div className="text-center p-8 text-gray-500">
        No hay datos del calendario disponibles
      </div>
    );
  }

  // Mapea las claves de leyenda a las claves del resumen (corrige USER_BOOKED -> userBooked)
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

  return (
    <div className="space-y-6">
      {/* 📊 RESUMEN DEL CALENDARIO */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <h3 className="text-lg font-semibold mb-3">Resumen del {new Date(date).toLocaleDateString('es-ES', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })}</h3>
        
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

      {/* 🎨 LEYENDA DE COLORES */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <h4 className="font-medium mb-3">Leyenda de Colores</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {calendarData.legend && Object.entries(calendarData.legend).map(([key, legend]) => (
            <div key={key} className="flex items-center space-x-2">
              <div 
                className="w-4 h-4 rounded-full" 
                style={{ backgroundColor: legend.color }}
              ></div>
              <span className="text-sm text-gray-600">{legend.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 📅 CALENDARIO VISUAL */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <h4 className="font-medium mb-4">Horarios Disponibles</h4>
        
        <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
          {calendarData.slots && calendarData.slots.map((slot, index) => (
            <div
              key={index}
              style={getSlotStyles(slot)}
              onClick={() => handleSlotClick(slot)}
              title={getTooltipContent(slot)}
              className={`
                ${slot.available ? 'hover:scale-105 hover:shadow-md' : ''}
                ${selectedSlot?.time === slot.time ? 'ring-2 ring-blue-500 ring-offset-2' : ''}
              `}
            >
              <div className="font-medium">
                {formatTime(slot.startTime)}
              </div>
              <div className="text-xs opacity-90">
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
  );
}
