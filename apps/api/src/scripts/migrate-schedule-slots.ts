#!/usr/bin/env tsx
/**
 * Script de Migración Enterprise: Schedule Slots
 * 
 * Migra datos existentes de operatingHours a schedule_slots
 * manteniendo compatibilidad total y sin pérdida de datos.
 * 
 * Uso:
 *   npm run migrate:schedule-slots
 *   npm run migrate:schedule-slots -- --dry-run
 *   npm run migrate:schedule-slots -- --force
 * 
 * @author Sistema Polideportivo
 * @version 1.0.0
 * @since 2025-01-09
 */

import { db } from '@repo/db';
import { ScheduleCompatibilityService } from '../lib/services/schedule-compatibility.service';

interface MigrationOptions {
  dryRun: boolean;
  force: boolean;
  verbose: boolean;
}

interface MigrationResult {
  total: number;
  migrated: number;
  skipped: number;
  errors: number;
  details: Array<{
    centerId: string;
    centerName: string;
    status: 'migrated' | 'skipped' | 'error';
    error?: string;
  }>;
}

class ScheduleSlotsMigration {
  private options: MigrationOptions;

  constructor(options: MigrationOptions) {
    this.options = options;
  }

  async run(): Promise<MigrationResult> {
    console.log('🚀 [MIGRATION] Iniciando migración de schedule_slots...');
    
    if (this.options.dryRun) {
      console.log('🔍 [MIGRATION] Modo DRY-RUN: No se realizarán cambios reales');
    }

    try {
      // 1. Obtener todos los centros
      const centers = await db.center.findMany({
        select: {
          id: true,
          name: true,
          settings: true
        }
      });

      console.log(`📊 [MIGRATION] Encontrados ${centers.length} centros`);

      // 2. Filtrar centros que necesitan migración
      const centersToMigrate = centers.filter(center => {
        const settings = center.settings as any;
        return settings?.operatingHours && !settings?.schedule_slots;
      });

      console.log(`🎯 [MIGRATION] ${centersToMigrate.length} centros necesitan migración`);

      if (centersToMigrate.length === 0) {
        console.log('✅ [MIGRATION] No hay centros que migrar');
        return {
          total: centers.length,
          migrated: 0,
          skipped: centers.length,
          errors: 0,
          details: []
        };
      }

      // 3. Ejecutar migración
      const result = await this.migrateCenters(centersToMigrate);

      // 4. Mostrar estadísticas
      this.printStats(result);

      return result;

    } catch (error) {
      console.error('❌ [MIGRATION] Error durante la migración:', error);
      throw error;
    }
  }

  private async migrateCenters(centers: any[]): Promise<MigrationResult> {
    const result: MigrationResult = {
      total: centers.length,
      migrated: 0,
      skipped: 0,
      errors: 0,
      details: []
    };

    for (const center of centers) {
      try {
        const migrationResult = await this.migrateCenter(center);
        result.details.push(migrationResult);

        if (migrationResult.status === 'migrated') {
          result.migrated++;
        } else if (migrationResult.status === 'skipped') {
          result.skipped++;
        } else {
          result.errors++;
        }

      } catch (error) {
        console.error(`❌ [MIGRATION] Error migrando centro ${center.name}:`, error);
        result.errors++;
        result.details.push({
          centerId: center.id,
          centerName: center.name,
          status: 'error',
          error: error instanceof Error ? error.message : 'Error desconocido'
        });
      }
    }

    return result;
  }

  private async migrateCenter(center: any): Promise<{
    centerId: string;
    centerName: string;
    status: 'migrated' | 'skipped' | 'error';
    error?: string;
  }> {
    const settings = center.settings as any;
    const operatingHours = settings.operatingHours;

    if (!operatingHours) {
      return {
        centerId: center.id,
        centerName: center.name,
        status: 'skipped'
      };
    }

    // Convertir estructura legacy a nueva
    const scheduleSlots = ScheduleCompatibilityService.convertLegacyToNew(operatingHours);

    // Validar nueva estructura
    const validation = ScheduleCompatibilityService.validateScheduleSlots(scheduleSlots);
    if (!validation.isValid) {
      throw new Error(`Estructura inválida: ${validation.errors.join(', ')}`);
    }

    if (this.options.dryRun) {
      console.log(`🔍 [MIGRATION] [DRY-RUN] Migraría centro: ${center.name}`);
      return {
        centerId: center.id,
        centerName: center.name,
        status: 'migrated'
      };
    }

    // Actualizar en base de datos
    await db.center.update({
      where: { id: center.id },
      data: {
        settings: {
          ...settings,
          schedule_slots: scheduleSlots
        }
      }
    });

    console.log(`✅ [MIGRATION] Centro migrado: ${center.name}`);
    return {
      centerId: center.id,
      centerName: center.name,
      status: 'migrated'
    };
  }

  private printStats(result: MigrationResult): void {
    console.log('\n📊 [MIGRATION] Estadísticas de migración:');
    console.log(`   Total centros: ${result.total}`);
    console.log(`   Migrados: ${result.migrated}`);
    console.log(`   Omitidos: ${result.skipped}`);
    console.log(`   Errores: ${result.errors}`);
    console.log(`   Tasa de éxito: ${Math.round((result.migrated / result.total) * 100)}%`);

    if (result.errors > 0) {
      console.log('\n❌ [MIGRATION] Centros con errores:');
      result.details
        .filter(d => d.status === 'error')
        .forEach(d => {
          console.log(`   - ${d.centerName}: ${d.error}`);
        });
    }

    if (this.options.dryRun) {
      console.log('\n🔍 [MIGRATION] Modo DRY-RUN completado. Ejecuta sin --dry-run para aplicar cambios.');
    } else {
      console.log('\n✅ [MIGRATION] Migración completada exitosamente');
    }
  }
}

// Función principal
async function main() {
  const args = process.argv.slice(2);
  const options: MigrationOptions = {
    dryRun: args.includes('--dry-run'),
    force: args.includes('--force'),
    verbose: args.includes('--verbose')
  };

  if (options.verbose) {
    console.log('🔧 [MIGRATION] Opciones:', options);
  }

  const migration = new ScheduleSlotsMigration(options);
  
  try {
    const result = await migration.run();
    
    if (result.errors > 0) {
      process.exit(1);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('💥 [MIGRATION] Error fatal:', error);
    process.exit(1);
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  main();
}

export { ScheduleSlotsMigration };



