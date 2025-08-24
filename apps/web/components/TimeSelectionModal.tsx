'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Check, X, ArrowRight } from 'lucide-react';

interface CalendarSlot {
  time: string;
  startTime: string;
  endTime: string;
  status: string;
  color: string;
  message: string;
  conflicts: any[];
  available: boolean;
}

interface TimeSelectionModalProps {
  isOpen: boolean;
  selectedDate: string;
  duration: number;
  onTimeSelect: (slot: CalendarSlot) => void;
  onClose: () => void;
}

export default function TimeSelectionModal({
  isOpen,
  selectedDate,
  duration,
  onTimeSelect,
  onClose
}: TimeSelectionModalProps) {
  const [selectedSlot, setSelectedSlot] = useState<CalendarSlot | null>(null);

  // 🕐 GENERAR HORARIOS DISPONIBLES CON COLORES REALES
  const generateTimeSlots = (): CalendarSlot[] => {
    const slots: CalendarSlot[] = [];
    const startHour = 6; // 6:00 AM
    const endHour = 22; // 10:00 PM
    
    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        const startTime = new Date(`${selectedDate}T${timeString}:00`);
        const endTime = new Date(startTime.getTime() + duration * 60000);
        
        // Solo incluir horarios que no pasen de las 22:00
        if (endTime.getHours() <= endHour) {
          // 🎨 COLORES REALES DEL SISTEMA
          const now = new Date();
          const slotDate = new Date(startTime);
          
          if (slotDate < now) {
            // Horario pasado
            slots.push({
              time: timeString,
              startTime: startTime.toISOString(),
              endTime: endTime.toISOString(),
              status: 'PAST',
              color: '#6b7280', // Gris
              message: 'Pasado',
              conflicts: [],
              available: false
            });
          } else {
            // Horario disponible
            slots.push({
              time: timeString,
              startTime: startTime.toISOString(),
              endTime: endTime.toISOString(),
              status: 'AVAILABLE',
              color: '#10b981', // Verde
              message: 'Disponible',
              conflicts: [],
              available: true
            });
          }
        }
      }
    }
    
    return slots;
  };

  const timeSlots = generateTimeSlots();

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleSlotSelect = (slot: CalendarSlot) => {
    setSelectedSlot(slot);
  };

  const handleConfirm = () => {
    if (selectedSlot) {
      onTimeSelect(selectedSlot);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay de fondo */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal central */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-4xl w-full max-h-[90vh] overflow-hidden">
          {/* Header del modal */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Clock className="h-6 w-6" />
                <div>
                  <h2 className="text-xl font-bold">Selecciona tu Horario</h2>
                  <p className="text-blue-100">{formatDate(selectedDate)} • {duration} minutos</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-white hover:text-blue-100 transition-colors p-2 rounded-full hover:bg-blue-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Contenido del modal */}
          <div className="p-6 overflow-y-auto max-h-[60vh]">
            {/* 🎯 HORARIO SELECCIONADO (si hay uno) */}
            {selectedSlot && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Check className="h-6 w-6 text-green-600" />
                    <div>
                      <p className="font-semibold text-green-800">Horario Seleccionado:</p>
                      <p className="text-green-700">
                        {selectedSlot.time} - {new Date(selectedSlot.endTime).toLocaleTimeString('es-ES', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="text-sm text-green-600">
                    {duration} minutos
                  </div>
                </div>
              </div>
            )}

            {/* 🕐 GRID DE HORARIOS DISPONIBLES */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Calendar className="h-5 w-5 mr-2 text-blue-600" />
                Horarios Disponibles
              </h3>
              
                             <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                 {timeSlots.map((slot) => (
                   <button
                     key={slot.time}
                     onClick={() => slot.available ? handleSlotSelect(slot) : undefined}
                     disabled={!slot.available}
                     className={`
                       p-4 rounded-lg text-center transition-all duration-200 border-2 relative
                       ${selectedSlot?.time === slot.time
                         ? 'border-blue-600 bg-blue-50 text-blue-900 shadow-lg scale-105'
                         : slot.available
                         ? 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50 text-gray-700'
                         : 'border-gray-300 bg-gray-100 text-gray-500 cursor-not-allowed opacity-60'
                       }
                     `}
                     style={{
                       backgroundColor: slot.available ? 'white' : slot.color,
                       color: slot.available ? 'inherit' : 'white'
                     }}
                   >
                     <div className="font-bold text-lg mb-1">{slot.time}</div>
                     <div className="text-xs opacity-75">
                       {new Date(slot.endTime).toLocaleTimeString('es-ES', { 
                         hour: '2-digit', 
                         minute: '2-digit' 
                       })}
                     </div>
                     <div className="text-xs mt-1 font-medium">
                       {slot.message}
                     </div>
                     
                     {/* 🎨 INDICADOR DE ESTADO */}
                     {!slot.available && (
                       <div className="absolute -top-1 -right-1 bg-gray-600 text-white text-xs px-1 rounded-full">
                         {slot.status === 'PAST' ? 'Pasado' : 'No disp.'}
                       </div>
                     )}
                     
                     {selectedSlot?.time === slot.time && (
                       <div className="mt-2">
                         <Check className="h-4 w-4 text-blue-600 mx-auto" />
                       </div>
                     )}
                   </button>
                 ))}
               </div>
            </div>

            {/* 🎨 LEYENDA DE COLORES */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4">
              <h4 className="font-medium text-gray-800 mb-3">🎨 Leyenda de Colores</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-gray-700">Disponible</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-gray-500 rounded-full"></div>
                  <span className="text-sm text-gray-700">Pasado</span>
                </div>
              </div>
            </div>

            {/* 💡 CONSEJOS */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-start space-x-3">
                <div className="text-blue-600 text-lg">💡</div>
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">Consejos para la selección:</p>
                  <ul className="space-y-1">
                    <li>• Selecciona el horario de <strong>inicio</strong> de tu reserva</li>
                    <li>• El sistema calculará automáticamente el horario de fin</li>
                    <li>• Duración seleccionada: <strong>{duration} minutos</strong></li>
                    <li>• Solo los horarios <strong>verdes</strong> están disponibles</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="p-6 border-t border-gray-200 bg-gray-50">
            <div className="flex justify-between items-center">
              <button
                onClick={onClose}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancelar
              </button>
              
              <button
                onClick={handleConfirm}
                disabled={!selectedSlot}
                className={`
                  px-8 py-3 rounded-lg font-medium transition-colors flex items-center space-x-2
                  ${selectedSlot
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }
                `}
              >
                <span>Confirmar Horario</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
