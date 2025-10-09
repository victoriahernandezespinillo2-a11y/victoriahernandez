/**
 * Servicio de Compatibilidad de Horarios Enterprise
 * 
 * Gestiona la transición entre la estructura legacy (operatingHours) 
 * y la nueva estructura (schedule_slots) manteniendo compatibilidad total.
 * 
 * Características:
 * - Backward compatibility: Funciona con datos legacy
 * - Forward compatibility: Soporta nueva estructura
 * - Zero downtime: Sin interrupciones en producción
 * - Enterprise grade: Validaciones robustas y logging
 * 
 * @author Sistema Polideportivo
 * @version 1.0.0
 * @since 2025-01-09
 */

import { z } from 'zod';

// Tipos TypeScript para la nueva estructura
export interface TimeSlot {
  start: string; // Formato HH:MM
  end: string;   // Formato HH:MM
}

export interface DaySchedule {
  closed: boolean;
  slots: TimeSlot[];
}

export interface ScheduleSlots {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

// Tipos para estructura legacy
export interface LegacyOperatingHours {
  [key: string]: {
    open: string;
    close: string;
    closed: boolean;
  };
}

// Schemas de validación Zod
export const TimeSlotSchema = z.object({
  start: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido (HH:MM)'),
  end: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido (HH:MM)'),
}).refine(data => data.start < data.end, {
  message: 'La hora de inicio debe ser anterior a la hora de fin',
  path: ['end']
});

export const DayScheduleSchema = z.object({
  closed: z.boolean(),
  slots: z.array(TimeSlotSchema).max(4, 'Máximo 4 franjas por día').default([])
});

export const ScheduleSlotsSchema = z.object({
  monday: DayScheduleSchema,
  tuesday: DayScheduleSchema,
  wednesday: DayScheduleSchema,
  thursday: DayScheduleSchema,
  friday: DayScheduleSchema,
  saturday: DayScheduleSchema,
  sunday: DayScheduleSchema,
});

/**
 * Servicio principal de compatibilidad de horarios
 */
export class ScheduleCompatibilityService {
  private static readonly DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
  private static readonly MAX_SLOTS_PER_DAY = 4;

  /**
   * Obtiene los horarios de un día específico con compatibilidad total
   * 
   * @param settings - Configuración del centro
   * @param dayOfWeek - Día de la semana (0=domingo, 6=sábado)
   * @returns Array de franjas horarias para el día
   */
  static getDaySchedule(settings: any, dayOfWeek: number): TimeSlot[] {
    try {
      const dayName = this.DAY_NAMES[dayOfWeek];
      if (!dayName) {
        console.warn(`[SCHEDULE-COMPAT] Día de semana inválido: ${dayOfWeek}`);
        return this.getDefaultSchedule();
      }

      // 1. PRIORIDAD: Nueva estructura (schedule_slots)
      if (settings?.schedule_slots?.[dayName]) {
        const daySchedule = settings.schedule_slots[dayName];
        
        if (daySchedule.closed) {
          console.log(`[SCHEDULE-COMPAT] Centro cerrado el ${dayName}`);
          return [];
        }

        if (Array.isArray(daySchedule.slots) && daySchedule.slots.length > 0) {
          // Validar slots
          const validSlots = daySchedule.slots.filter((slot: any) => this.isValidTimeSlot(slot));
          console.log(`[SCHEDULE-COMPAT] Usando nueva estructura para ${dayName}: ${validSlots.length} franjas`);
          return validSlots;
        }
      }

      // 2. FALLBACK: Estructura legacy (operatingHours)
      if (settings?.operatingHours?.[dayName]) {
        const legacyConfig = settings.operatingHours[dayName];
        
        if (legacyConfig.closed) {
          console.log(`[SCHEDULE-COMPAT] Centro cerrado el ${dayName} (legacy)`);
          return [];
        }

        if (legacyConfig.open && legacyConfig.close) {
          const legacySlot = {
            start: legacyConfig.open,
            end: legacyConfig.close
          };

          if (this.isValidTimeSlot(legacySlot)) {
            console.log(`[SCHEDULE-COMPAT] Usando estructura legacy para ${dayName}: ${legacySlot.start}-${legacySlot.end}`);
            return [legacySlot];
          }
        }
      }

      // 3. FALLBACK FINAL: Horario por defecto
      console.warn(`[SCHEDULE-COMPAT] No se encontró configuración para ${dayName}, usando horario por defecto`);
      return this.getDefaultSchedule();

    } catch (error) {
      console.error(`[SCHEDULE-COMPAT] Error obteniendo horario para día ${dayOfWeek}:`, error);
      return this.getDefaultSchedule();
    }
  }

  /**
   * Convierte estructura legacy a nueva estructura
   * 
   * @param legacyHours - Horarios en formato legacy
   * @returns Horarios en nueva estructura
   */
  static convertLegacyToNew(legacyHours: LegacyOperatingHours): ScheduleSlots {
    const result: Partial<ScheduleSlots> = {};

    for (const dayName of this.DAY_NAMES) {
      const legacyConfig = legacyHours[dayName];
      
      if (legacyConfig) {
        result[dayName] = {
          closed: legacyConfig.closed || false,
          slots: legacyConfig.open && legacyConfig.close ? [{
            start: legacyConfig.open,
            end: legacyConfig.close
          }] : []
        };
      } else {
        result[dayName] = {
          closed: false,
          slots: []
        };
      }
    }

    return result as ScheduleSlots;
  }

  /**
   * Valida si un slot de tiempo es válido
   */
  private static isValidTimeSlot(slot: any): slot is TimeSlot {
    if (!slot || typeof slot !== 'object') return false;
    if (typeof slot.start !== 'string' || typeof slot.end !== 'string') return false;
    
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(slot.start) || !timeRegex.test(slot.end)) return false;
    
    return slot.start < slot.end;
  }

  /**
   * Obtiene horario por defecto (9:00-18:00)
   */
  private static getDefaultSchedule(): TimeSlot[] {
    return [{
      start: '09:00',
      end: '18:00'
    }];
  }

  /**
   * Valida la estructura completa de schedule_slots
   */
  static validateScheduleSlots(scheduleSlots: any): { isValid: boolean; errors: string[] } {
    try {
      ScheduleSlotsSchema.parse(scheduleSlots);
      return { isValid: true, errors: [] };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          isValid: false,
          errors: error.errors.map(err => `${err.path.join('.')}: ${err.message}`)
        };
      }
      return {
        isValid: false,
        errors: ['Error de validación desconocido']
      };
    }
  }

  /**
   * Obtiene estadísticas de migración para monitoreo
   */
  static async getMigrationStats(centers: any[]): Promise<{
    total: number;
    withLegacy: number;
    withNew: number;
    migrated: number;
    percentage: number;
  }> {
    const total = centers.length;
    let withLegacy = 0;
    let withNew = 0;
    let migrated = 0;

    for (const center of centers) {
      const settings = center.settings || {};
      
      if (settings.operatingHours) withLegacy++;
      if (settings.schedule_slots) withNew++;
      if (settings.operatingHours && settings.schedule_slots) migrated++;
    }

    return {
      total,
      withLegacy,
      withNew,
      migrated,
      percentage: total > 0 ? Math.round((migrated / total) * 100) : 0
    };
  }
}
