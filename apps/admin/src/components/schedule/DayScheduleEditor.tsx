/**
 * DayScheduleEditor - Componente Enterprise para Configuración de Horarios
 * 
 * Permite configurar múltiples franjas horarias por día con:
 * - Validaciones robustas
 * - UX optimizada para móvil
 * - Compatibilidad con estructura legacy
 * - Manejo de errores gracioso
 * 
 * @author Sistema Polideportivo
 * @version 1.0.0
 * @since 2025-01-09
 */

'use client';

import { useState, useEffect } from 'react';
import { 
  PlusIcon, 
  TrashIcon, 
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

export interface TimeSlot {
  start: string;
  end: string;
}

export interface DaySchedule {
  closed: boolean;
  slots: TimeSlot[];
}

interface DayScheduleEditorProps {
  dayName: string;
  dayKey: string;
  schedule: DaySchedule;
  onChange: (schedule: DaySchedule) => void;
  disabled?: boolean;
  maxSlots?: number;
}

export default function DayScheduleEditor({
  dayName,
  dayKey,
  schedule,
  onChange,
  disabled = false,
  maxSlots = 4
}: DayScheduleEditorProps) {
  const [localSchedule, setLocalSchedule] = useState<DaySchedule>(schedule);
  const [errors, setErrors] = useState<string[]>([]);

  // Sincronizar con props externos
  useEffect(() => {
    setLocalSchedule(schedule);
  }, [schedule]);

  // Validar slots de tiempo
  const validateTimeSlot = (slot: TimeSlot): string[] => {
    const slotErrors: string[] = [];
    
    // Validar formato HH:MM
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(slot.start)) {
      slotErrors.push('Hora de inicio inválida (formato HH:MM)');
    }
    if (!timeRegex.test(slot.end)) {
      slotErrors.push('Hora de fin inválida (formato HH:MM)');
    }
    
    // Validar que end > start
    if (slot.start >= slot.end) {
      slotErrors.push('La hora de fin debe ser posterior a la hora de inicio');
    }
    
    return slotErrors;
  };

  // Validar solapamientos entre slots
  const validateSlotOverlaps = (slots: TimeSlot[]): string[] => {
    const overlapErrors: string[] = [];
    
    for (let i = 0; i < slots.length; i++) {
      for (let j = i + 1; j < slots.length; j++) {
        const slot1 = slots[i];
        const slot2 = slots[j];
        
        // Verificar que los slots existan antes de comparar
        if (!slot1 || !slot2) continue;
        
        // Verificar solapamiento
        if (slot1.start < slot2.end && slot1.end > slot2.start) {
          overlapErrors.push(`Las franjas ${slot1.start}-${slot1.end} y ${slot2.start}-${slot2.end} se solapan`);
        }
      }
    }
    
    return overlapErrors;
  };

  // Validar horario completo
  const validateSchedule = (schedule: DaySchedule): string[] => {
    const allErrors: string[] = [];
    
    if (!schedule.closed && schedule.slots.length === 0) {
      allErrors.push('Debe agregar al menos una franja horaria o marcar el día como cerrado');
    }
    
    if (schedule.slots.length > maxSlots) {
      allErrors.push(`Máximo ${maxSlots} franjas por día`);
    }
    
    // Validar cada slot
    schedule.slots.forEach((slot, index) => {
      const slotErrors = validateTimeSlot(slot);
      slotErrors.forEach(error => {
        allErrors.push(`Franja ${index + 1}: ${error}`);
      });
    });
    
    // Validar solapamientos
    const overlapErrors = validateSlotOverlaps(schedule.slots);
    allErrors.push(...overlapErrors);
    
    return allErrors;
  };

  // Actualizar horario y validar
  const updateSchedule = (newSchedule: DaySchedule) => {
    setLocalSchedule(newSchedule);
    
    const validationErrors = validateSchedule(newSchedule);
    setErrors(validationErrors);
    
    // Solo notificar cambios si no hay errores
    if (validationErrors.length === 0) {
      onChange(newSchedule);
    }
  };

  // Manejar cambio de estado cerrado/abierto
  const handleClosedChange = (closed: boolean) => {
    const newSchedule = {
      ...localSchedule,
      closed,
      slots: closed ? [] : localSchedule.slots
    };
    updateSchedule(newSchedule);
  };

  // Agregar nueva franja
  const addSlot = () => {
    if (localSchedule.slots.length >= maxSlots) return;
    
    const newSlot: TimeSlot = {
      start: '09:00',
      end: '17:00'
    };
    
    const newSchedule = {
      ...localSchedule,
      slots: [...localSchedule.slots, newSlot]
    };
    updateSchedule(newSchedule);
  };

  // Eliminar franja
  const removeSlot = (index: number) => {
    const newSchedule = {
      ...localSchedule,
      slots: localSchedule.slots.filter((_, i) => i !== index)
    };
    updateSchedule(newSchedule);
  };

  // Actualizar franja específica
  const updateSlot = (index: number, field: 'start' | 'end', value: string) => {
    const newSlots = [...localSchedule.slots];
    const currentSlot = newSlots[index];
    if (currentSlot) {
      newSlots[index] = { ...currentSlot, [field]: value };
    }
    
    const newSchedule = {
      ...localSchedule,
      slots: newSlots
    };
    updateSchedule(newSchedule);
  };

  // Generar opciones de tiempo
  const generateTimeOptions = () => {
    const options = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        options.push(timeString);
      }
    }
    return options;
  };

  const timeOptions = generateTimeOptions();

  return (
    <div className={`border rounded-lg p-4 ${disabled ? 'opacity-50' : ''} ${
      errors.length > 0 ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white'
    }`}>
      {/* Header del día */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <h3 className="text-lg font-semibold text-gray-900">{dayName}</h3>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id={`closed-${dayKey}`}
              checked={localSchedule.closed}
              onChange={(e) => handleClosedChange(e.target.checked)}
              disabled={disabled}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor={`closed-${dayKey}`} className="text-sm text-gray-700">
              Cerrado
            </label>
          </div>
        </div>
        
        {!localSchedule.closed && (
          <button
            onClick={addSlot}
            disabled={disabled || localSchedule.slots.length >= maxSlots}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <PlusIcon className="h-4 w-4 mr-1" />
            Agregar Franja
          </button>
        )}
      </div>

      {/* Franjas horarias */}
      {!localSchedule.closed && (
        <div className="space-y-3">
          {localSchedule.slots.map((slot, index) => (
            <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-2">
                <ClockIcon className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Franja {index + 1}</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <select
                  value={slot.start}
                  onChange={(e) => updateSlot(index, 'start', e.target.value)}
                  disabled={disabled}
                  className="block w-24 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  {timeOptions.map(time => (
                    <option key={time} value={time}>{time}</option>
                  ))}
                </select>
                
                <span className="text-gray-500">a</span>
                
                <select
                  value={slot.end}
                  onChange={(e) => updateSlot(index, 'end', e.target.value)}
                  disabled={disabled}
                  className="block w-24 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  {timeOptions.map(time => (
                    <option key={time} value={time}>{time}</option>
                  ))}
                </select>
              </div>
              
              <button
                onClick={() => removeSlot(index)}
                disabled={disabled}
                className="p-2 text-red-600 hover:text-red-800 hover:bg-red-100 rounded-md transition-colors"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </div>
          ))}
          
          {localSchedule.slots.length === 0 && (
            <div className="text-center py-6 text-gray-500">
              <ClockIcon className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p>No hay franjas horarias configuradas</p>
              <p className="text-sm">Haz clic en "Agregar Franja" para comenzar</p>
            </div>
          )}
        </div>
      )}

      {/* Mensaje cuando está cerrado */}
      {localSchedule.closed && (
        <div className="text-center py-6 text-gray-500">
          <ExclamationTriangleIcon className="h-8 w-8 mx-auto mb-2 text-gray-400" />
          <p>Centro cerrado los {dayName.toLowerCase()}s</p>
        </div>
      )}

      {/* Errores de validación */}
      {errors.length > 0 && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-start">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mt-0.5 mr-2" />
            <div>
              <h4 className="text-sm font-medium text-red-800">Errores de validación:</h4>
              <ul className="mt-1 text-sm text-red-700 list-disc list-inside">
                {errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Estado de validación exitosa */}
      {!localSchedule.closed && localSchedule.slots.length > 0 && errors.length === 0 && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
          <div className="flex items-center">
            <CheckCircleIcon className="h-5 w-5 text-green-400 mr-2" />
            <span className="text-sm text-green-800">
              Horario configurado correctamente ({localSchedule.slots.length} franja{localSchedule.slots.length !== 1 ? 's' : ''})
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
