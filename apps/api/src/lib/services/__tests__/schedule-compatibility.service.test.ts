/**
 * Tests Enterprise para ScheduleCompatibilityService
 * 
 * Verifica compatibilidad backward y forward, validaciones robustas
 * y comportamiento correcto en todos los escenarios.
 * 
 * @author Sistema Polideportivo
 * @version 1.0.0
 * @since 2025-01-09
 */

import { ScheduleCompatibilityService } from '../schedule-compatibility.service';

describe('ScheduleCompatibilityService', () => {
  describe('getDaySchedule', () => {
    it('debe usar nueva estructura schedule_slots cuando está disponible', () => {
      const settings = {
        schedule_slots: {
          monday: {
            closed: false,
            slots: [
              { start: '09:00', end: '12:00' },
              { start: '15:00', end: '18:00' }
            ]
          }
        }
      };

      const result = ScheduleCompatibilityService.getDaySchedule(settings, 1); // Lunes
      
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ start: '09:00', end: '12:00' });
      expect(result[1]).toEqual({ start: '15:00', end: '18:00' });
    });

    it('debe usar estructura legacy operatingHours como fallback', () => {
      const settings = {
        operatingHours: {
          monday: {
            open: '09:00',
            close: '18:00',
            closed: false
          }
        }
      };

      const result = ScheduleCompatibilityService.getDaySchedule(settings, 1); // Lunes
      
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ start: '09:00', end: '18:00' });
    });

    it('debe manejar centro cerrado en nueva estructura', () => {
      const settings = {
        schedule_slots: {
          monday: {
            closed: true,
            slots: []
          }
        }
      };

      const result = ScheduleCompatibilityService.getDaySchedule(settings, 1);
      
      expect(result).toHaveLength(0);
    });

    it('debe manejar centro cerrado en estructura legacy', () => {
      const settings = {
        operatingHours: {
          monday: {
            open: '09:00',
            close: '18:00',
            closed: true
          }
        }
      };

      const result = ScheduleCompatibilityService.getDaySchedule(settings, 1);
      
      expect(result).toHaveLength(0);
    });

    it('debe usar horario por defecto cuando no hay configuración', () => {
      const settings = {};

      const result = ScheduleCompatibilityService.getDaySchedule(settings, 1);
      
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ start: '09:00', end: '18:00' });
    });

    it('debe validar slots de tiempo correctamente', () => {
      const settings = {
        schedule_slots: {
          monday: {
            closed: false,
            slots: [
              { start: '09:00', end: '12:00' }, // Válido
              { start: '15:00', end: '14:00' }, // Inválido: end < start
              { start: '25:00', end: '18:00' }, // Inválido: hora incorrecta
              { start: '16:00', end: '18:00' }  // Válido
            ]
          }
        }
      };

      const result = ScheduleCompatibilityService.getDaySchedule(settings, 1);
      
      // Solo debe incluir slots válidos
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ start: '09:00', end: '12:00' });
      expect(result[1]).toEqual({ start: '16:00', end: '18:00' });
    });

    it('debe manejar días de semana correctamente', () => {
      const settings = {
        schedule_slots: {
          sunday: { closed: false, slots: [{ start: '10:00', end: '14:00' }] },
          monday: { closed: false, slots: [{ start: '09:00', end: '18:00' }] },
          tuesday: { closed: true, slots: [] },
          wednesday: { closed: false, slots: [{ start: '08:00', end: '20:00' }] },
          thursday: { closed: false, slots: [{ start: '09:00', end: '18:00' }] },
          friday: { closed: false, slots: [{ start: '09:00', end: '22:00' }] },
          saturday: { closed: false, slots: [{ start: '10:00', end: '16:00' }] }
        }
      };

      // Domingo (0)
      expect(ScheduleCompatibilityService.getDaySchedule(settings, 0)).toEqual([{ start: '10:00', end: '14:00' }]);
      // Lunes (1)
      expect(ScheduleCompatibilityService.getDaySchedule(settings, 1)).toEqual([{ start: '09:00', end: '18:00' }]);
      // Martes (2) - cerrado
      expect(ScheduleCompatibilityService.getDaySchedule(settings, 2)).toEqual([]);
      // Miércoles (3)
      expect(ScheduleCompatibilityService.getDaySchedule(settings, 3)).toEqual([{ start: '08:00', end: '20:00' }]);
    });
  });

  describe('convertLegacyToNew', () => {
    it('debe convertir estructura legacy correctamente', () => {
      const legacyHours = {
        monday: { open: '09:00', close: '18:00', closed: false },
        tuesday: { open: '09:00', close: '18:00', closed: false },
        wednesday: { open: '09:00', close: '18:00', closed: true },
        thursday: { open: '09:00', close: '18:00', closed: false },
        friday: { open: '09:00', close: '18:00', closed: false },
        saturday: { open: '10:00', close: '16:00', closed: false },
        sunday: { open: '10:00', close: '14:00', closed: false }
      };

      const result = ScheduleCompatibilityService.convertLegacyToNew(legacyHours);

      expect(result.monday).toEqual({
        closed: false,
        slots: [{ start: '09:00', end: '18:00' }]
      });
      expect(result.wednesday).toEqual({
        closed: true,
        slots: []
      });
      expect(result.saturday).toEqual({
        closed: false,
        slots: [{ start: '10:00', end: '16:00' }]
      });
    });

    it('debe manejar días sin configuración', () => {
      const legacyHours = {
        monday: { open: '09:00', close: '18:00', closed: false }
        // Otros días no definidos
      };

      const result = ScheduleCompatibilityService.convertLegacyToNew(legacyHours);

      expect(result.monday).toEqual({
        closed: false,
        slots: [{ start: '09:00', end: '18:00' }]
      });
      expect(result.tuesday).toEqual({
        closed: false,
        slots: []
      });
    });
  });

  describe('validateScheduleSlots', () => {
    it('debe validar estructura correcta', () => {
      const validSchedule = {
        monday: { closed: false, slots: [{ start: '09:00', end: '12:00' }, { start: '15:00', end: '18:00' }] },
        tuesday: { closed: false, slots: [{ start: '09:00', end: '18:00' }] },
        wednesday: { closed: true, slots: [] },
        thursday: { closed: false, slots: [{ start: '09:00', end: '18:00' }] },
        friday: { closed: false, slots: [{ start: '09:00', end: '18:00' }] },
        saturday: { closed: false, slots: [{ start: '10:00', end: '16:00' }] },
        sunday: { closed: false, slots: [{ start: '10:00', end: '14:00' }] }
      };

      const result = ScheduleCompatibilityService.validateScheduleSlots(validSchedule);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('debe detectar errores de validación', () => {
      const invalidSchedule = {
        monday: { closed: false, slots: [{ start: '25:00', end: '12:00' }] }, // Hora inválida
        tuesday: { closed: false, slots: [{ start: '15:00', end: '14:00' }] }  // End < start
      };

      const result = ScheduleCompatibilityService.validateScheduleSlots(invalidSchedule);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('debe detectar demasiados slots por día', () => {
      const invalidSchedule = {
        monday: { 
          closed: false, 
          slots: [
            { start: '09:00', end: '10:00' },
            { start: '11:00', end: '12:00' },
            { start: '13:00', end: '14:00' },
            { start: '15:00', end: '16:00' },
            { start: '17:00', end: '18:00' } // 5 slots (máximo 4)
          ]
        }
      };

      const result = ScheduleCompatibilityService.validateScheduleSlots(invalidSchedule);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('Máximo 4 franjas'))).toBe(true);
    });
  });

  describe('getMigrationStats', () => {
    it('debe calcular estadísticas correctamente', async () => {
      const centers = [
        { settings: { operatingHours: {}, schedule_slots: {} } }, // Migrado
        { settings: { operatingHours: {} } }, // Solo legacy
        { settings: { schedule_slots: {} } }, // Solo nuevo
        { settings: {} } // Sin configuración
      ];

      const stats = await ScheduleCompatibilityService.getMigrationStats(centers);

      expect(stats.total).toBe(4);
      expect(stats.withLegacy).toBe(2);
      expect(stats.withNew).toBe(2);
      expect(stats.migrated).toBe(1);
      expect(stats.percentage).toBe(25);
    });
  });

  describe('Casos Edge Enterprise', () => {
    it('debe manejar configuración corrupta graciosamente', () => {
      const settings = {
        schedule_slots: {
          monday: {
            closed: 'invalid', // Debería ser boolean
            slots: 'not-an-array' // Debería ser array
          }
        }
      };

      const result = ScheduleCompatibilityService.getDaySchedule(settings, 1);
      
      // Debe usar fallback sin fallar
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ start: '09:00', end: '18:00' });
    });

    it('debe manejar días de semana inválidos', () => {
      const settings = {
        schedule_slots: {
          monday: { closed: false, slots: [{ start: '09:00', end: '18:00' }] }
        }
      };

      // Día inválido (fuera de rango)
      const result = ScheduleCompatibilityService.getDaySchedule(settings, 8);
      
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ start: '09:00', end: '18:00' });
    });

    it('debe manejar slots con formato de tiempo inválido', () => {
      const settings = {
        schedule_slots: {
          monday: {
            closed: false,
            slots: [
              { start: '09:00', end: '12:00' }, // Válido
              { start: 'invalid', end: '12:00' }, // Inválido
              { start: '15:00', end: 'invalid' }, // Inválido
              { start: '16:00', end: '18:00' }  // Válido
            ]
          }
        }
      };

      const result = ScheduleCompatibilityService.getDaySchedule(settings, 1);
      
      // Solo debe incluir slots válidos
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ start: '09:00', end: '12:00' });
      expect(result[1]).toEqual({ start: '16:00', end: '18:00' });
    });
  });
});
