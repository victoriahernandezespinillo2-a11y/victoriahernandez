/**
 * ScheduleEditor - Componente Enterprise Principal para Configuración de Horarios
 * 
 * Gestiona la configuración completa de horarios semanales con:
 * - Soporte para franjas múltiples por día
 * - Validaciones robustas
 * - Compatibilidad con estructura legacy
 * - UX optimizada para móvil y desktop
 * 
 * @author Sistema Polideportivo
 * @version 1.0.0
 * @since 2025-01-09
 */

'use client';

import { useState, useEffect } from 'react';
import { 
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import DayScheduleEditor, { DaySchedule, TimeSlot } from './DayScheduleEditor';

export interface ScheduleSlots {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

interface ScheduleEditorProps {
  scheduleSlots?: ScheduleSlots;
  operatingHours?: any; // Estructura legacy
  onChange: (scheduleSlots: ScheduleSlots) => void;
  onLegacyChange?: (operatingHours: any) => void;
  disabled?: boolean;
  showLegacyMode?: boolean;
  className?: string;
}

const DAYS_CONFIG = [
  { key: 'monday', name: 'Lunes', shortName: 'Lun' },
  { key: 'tuesday', name: 'Martes', shortName: 'Mar' },
  { key: 'wednesday', name: 'Miércoles', shortName: 'Mié' },
  { key: 'thursday', name: 'Jueves', shortName: 'Jue' },
  { key: 'friday', name: 'Viernes', shortName: 'Vie' },
  { key: 'saturday', name: 'Sábado', shortName: 'Sáb' },
  { key: 'sunday', name: 'Domingo', shortName: 'Dom' }
] as const;

export default function ScheduleEditor({
  scheduleSlots,
  operatingHours,
  onChange,
  onLegacyChange,
  disabled = false,
  showLegacyMode = false,
  className = ''
}: ScheduleEditorProps) {
  const [currentSchedule, setCurrentSchedule] = useState<ScheduleSlots>(scheduleSlots || getDefaultSchedule());
  const [useLegacyMode, setUseLegacyMode] = useState(showLegacyMode);
  const [isValid, setIsValid] = useState(true);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Sincronizar con props externos
  useEffect(() => {
    if (scheduleSlots) {
      setCurrentSchedule(scheduleSlots);
    } else if (operatingHours) {
      // Convertir estructura legacy a nueva
      const converted = convertLegacyToNew(operatingHours);
      setCurrentSchedule(converted);
    }
  }, [scheduleSlots, operatingHours]);

  // Obtener horario por defecto
  function getDefaultSchedule(): ScheduleSlots {
    const defaultDay: DaySchedule = {
      closed: false,
      slots: [{ start: '09:00', end: '18:00' }]
    };

    return {
      monday: { ...defaultDay },
      tuesday: { ...defaultDay },
      wednesday: { ...defaultDay },
      thursday: { ...defaultDay },
      friday: { ...defaultDay },
      saturday: { ...defaultDay },
      sunday: { ...defaultDay }
    };
  }

  // Convertir estructura legacy a nueva
  function convertLegacyToNew(legacyHours: any): ScheduleSlots {
    const result: Partial<ScheduleSlots> = {};

    for (const day of DAYS_CONFIG) {
      const legacyConfig = legacyHours[day.key];
      
      if (legacyConfig) {
        result[day.key] = {
          closed: legacyConfig.closed || false,
          slots: legacyConfig.open && legacyConfig.close ? [{
            start: legacyConfig.open,
            end: legacyConfig.close
          }] : []
        };
      } else {
        result[day.key] = {
          closed: false,
          slots: []
        };
      }
    }

    return result as ScheduleSlots;
  }

  // Convertir nueva estructura a legacy
  function convertNewToLegacy(schedule: ScheduleSlots): any {
    const result: any = {};

    for (const day of DAYS_CONFIG) {
      const daySchedule = schedule[day.key];
      
      if (daySchedule.closed) {
        result[day.key] = {
          open: '09:00',
          close: '18:00',
          closed: true
        };
      } else if (daySchedule.slots.length === 1 && daySchedule.slots[0]) {
        // Una sola franja - compatible con legacy
        result[day.key] = {
          open: daySchedule.slots[0].start,
          close: daySchedule.slots[0].end,
          closed: false
        };
      } else if (daySchedule.slots.length > 1 && daySchedule.slots[0]) {
        // Múltiples franjas - usar la primera como principal
        result[day.key] = {
          open: daySchedule.slots[0].start,
          close: daySchedule.slots[0].end,
          closed: false
        };
      } else {
        // Sin franjas - usar horario por defecto
        result[day.key] = {
          open: '09:00',
          close: '18:00',
          closed: false
        };
      }
    }

    return result;
  }

  // Validar horario completo
  const validateSchedule = (schedule: ScheduleSlots): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    for (const day of DAYS_CONFIG) {
      const daySchedule = schedule[day.key];
      
      // Verificar que si no está cerrado, tenga al menos una franja
      if (!daySchedule.closed && daySchedule.slots.length === 0) {
        errors.push(`${day.name}: Debe agregar al menos una franja horaria o marcar como cerrado`);
      }
      
      // Validar cada franja del día
      daySchedule.slots.forEach((slot, index) => {
        if (slot.start >= slot.end) {
          errors.push(`${day.name} - Franja ${index + 1}: La hora de fin debe ser posterior a la hora de inicio`);
        }
      });
      
      // Validar solapamientos dentro del mismo día
      for (let i = 0; i < daySchedule.slots.length; i++) {
        for (let j = i + 1; j < daySchedule.slots.length; j++) {
          const slot1 = daySchedule.slots[i];
          const slot2 = daySchedule.slots[j];
          
          if (slot1 && slot2 && slot1.start < slot2.end && slot1.end > slot2.start) {
            errors.push(`${day.name}: Las franjas ${slot1.start}-${slot1.end} y ${slot2.start}-${slot2.end} se solapan`);
          }
        }
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  };

  // Manejar cambio de horario de un día
  const handleDayChange = (dayKey: string, daySchedule: DaySchedule) => {
    const newSchedule = {
      ...currentSchedule,
      [dayKey]: daySchedule
    };
    
    setCurrentSchedule(newSchedule);
    
    // Validar
    const validation = validateSchedule(newSchedule);
    setIsValid(validation.isValid);
    setValidationErrors(validation.errors);
    
    // Notificar cambios
    onChange(newSchedule);
    
    // Si está en modo legacy, también actualizar estructura legacy
    if (useLegacyMode && onLegacyChange) {
      const legacyHours = convertNewToLegacy(newSchedule);
      onLegacyChange(legacyHours);
    }
  };

  // Cambiar modo de visualización
  const toggleLegacyMode = () => {
    setUseLegacyMode(!useLegacyMode);
  };

  // Obtener estadísticas del horario
  const getScheduleStats = () => {
    let totalSlots = 0;
    let closedDays = 0;
    let daysWithMultipleSlots = 0;
    
    for (const day of DAYS_CONFIG) {
      const daySchedule = currentSchedule[day.key];
      totalSlots += daySchedule.slots.length;
      if (daySchedule.closed) closedDays++;
      if (daySchedule.slots.length > 1) daysWithMultipleSlots++;
    }
    
    return {
      totalSlots,
      closedDays,
      daysWithMultipleSlots,
      averageSlotsPerDay: totalSlots / (DAYS_CONFIG.length - closedDays) || 0
    };
  };

  const stats = getScheduleStats();

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header con controles */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div className="flex items-center space-x-3">
          <ClockIcon className="h-6 w-6 text-blue-600" />
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Configuración de Horarios</h2>
            <p className="text-sm text-gray-600">
              Configure las franjas horarias para cada día de la semana
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Estadísticas */}
          <div className="text-sm text-gray-600">
            {stats.totalSlots} franjas • {stats.closedDays} cerrados • {stats.daysWithMultipleSlots} con múltiples franjas
          </div>
          
          {/* Toggle modo legacy */}
          {onLegacyChange && (
            <button
              onClick={toggleLegacyMode}
              disabled={disabled}
              className={`inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 ${
                useLegacyMode ? 'bg-blue-50 border-blue-300 text-blue-700' : ''
              }`}
            >
              <ArrowPathIcon className="h-4 w-4 mr-1" />
              {useLegacyMode ? 'Modo Avanzado' : 'Modo Simple'}
            </button>
          )}
        </div>
      </div>

      {/* Información sobre el modo */}
      {useLegacyMode && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <div className="flex items-start">
            <InformationCircleIcon className="h-5 w-5 text-blue-400 mt-0.5 mr-2" />
            <div>
              <h4 className="text-sm font-medium text-blue-800">Modo Simple</h4>
              <p className="text-sm text-blue-700 mt-1">
                En modo simple, cada día puede tener solo una franja horaria continua. 
                Para configurar múltiples franjas (ej: 9:00-12:00 y 15:00-18:00), 
                cambie al modo avanzado.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Configuración de días */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {DAYS_CONFIG.map((day) => (
          <DayScheduleEditor
            key={day.key}
            dayName={day.name}
            dayKey={day.key}
            schedule={currentSchedule[day.key]}
            onChange={(daySchedule) => handleDayChange(day.key, daySchedule)}
            disabled={disabled}
            maxSlots={useLegacyMode ? 1 : 4}
          />
        ))}
      </div>

      {/* Errores de validación globales */}
      {validationErrors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex items-start">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mt-0.5 mr-2" />
            <div>
              <h4 className="text-sm font-medium text-red-800">Errores de configuración:</h4>
              <ul className="mt-1 text-sm text-red-700 list-disc list-inside">
                {validationErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Estado de validación exitosa */}
      {isValid && stats.totalSlots > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4">
          <div className="flex items-center">
            <CheckCircleIcon className="h-5 w-5 text-green-400 mr-2" />
            <div>
              <h4 className="text-sm font-medium text-green-800">Configuración válida</h4>
              <p className="text-sm text-green-700 mt-1">
                Horario configurado correctamente con {stats.totalSlots} franjas horarias
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
