/**
 * ANÁLISIS PROFUNDO DE DISPONIBILIDAD
 * Compara horarios configurados vs mantenimientos vs actividades vs reservas
 * Detecta inconsistencias y problemas de configuración
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Fecha a analizar
const TEST_DATE = '2025-10-10'; // Viernes
const TEST_DURATION = 60; // minutos

function getDayName(dateString) {
  const date = new Date(dateString);
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return dayNames[date.getDay()];
}

function timeToMinutes(time) {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

function timeOverlaps(time1Start, time1End, time2Start, time2End) {
  const start1 = timeToMinutes(time1Start);
  const end1 = timeToMinutes(time1End);
  const start2 = timeToMinutes(time2Start);
  const end2 = timeToMinutes(time2End);
  
  return start1 < end2 && start2 < end1;
}

function generateTimeSlots(daySlots, duration = 60) {
  const allSlots = [];
  const slotMinutes = 30;
  
  for (const daySlot of daySlots) {
    const startMinutes = timeToMinutes(daySlot.start);
    const endMinutes = timeToMinutes(daySlot.end);
    
    for (let currentMinutes = startMinutes; currentMinutes < endMinutes; currentMinutes += slotMinutes) {
      const slotEndMinutes = Math.min(currentMinutes + duration, endMinutes);
      
      if (slotEndMinutes - currentMinutes >= duration) {
        const slotStartTime = minutesToTime(currentMinutes);
        const slotEndTime = minutesToTime(slotEndMinutes);
        
        allSlots.push({
          start: slotStartTime,
          end: slotEndTime,
          status: 'available'
        });
      }
    }
  }
  
  return allSlots;
}

async function deepAvailabilityAnalysis() {
  console.log('🔍 ANÁLISIS PROFUNDO DE DISPONIBILIDAD');
  console.log('='.repeat(80));
  console.log(`📅 Fecha: ${TEST_DATE} (${getDayName(TEST_DATE)})`);
  console.log(`⏱️ Duración reserva: ${TEST_DURATION} minutos`);
  console.log('='.repeat(80));

  try {
    // Obtener centros con canchas
    const centers = await prisma.center.findMany({
      include: {
        courts: {
          where: { isActive: true }
        }
      }
    });

    for (const center of centers) {
      console.log(`\n\n🏢 CENTRO: ${center.name}`);
      console.log('='.repeat(80));
      
      const settings = center.settings || {};
      const dayName = getDayName(TEST_DATE);
      
      // 1. ANÁLISIS DE HORARIOS CONFIGURADOS
      console.log(`\n📋 HORARIOS CONFIGURADOS PARA ${dayName.toUpperCase()}:`);
      
      let configuredSlots = [];
      let scheduleSource = 'ninguno';
      
      // Verificar schedule_slots
      if (settings?.schedule_slots?.[dayName]) {
        const daySchedule = settings.schedule_slots[dayName];
        console.log(`   ✅ schedule_slots encontrado`);
        console.log(`   Cerrado: ${daySchedule.closed ? 'SÍ' : 'NO'}`);
        
        if (!daySchedule.closed && Array.isArray(daySchedule.slots)) {
          configuredSlots = daySchedule.slots;
          scheduleSource = 'schedule_slots';
          console.log(`   Franjas horarias configuradas:`);
          daySchedule.slots.forEach((slot, i) => {
            console.log(`      ${i + 1}. ${slot.start} - ${slot.end}`);
          });
        }
      }
      
      // Verificar operatingHours
      if (settings?.operatingHours?.[dayName]) {
        const legacySchedule = settings.operatingHours[dayName];
        console.log(`   ✅ operatingHours encontrado`);
        console.log(`   Cerrado: ${legacySchedule.closed ? 'SÍ' : 'NO'}`);
        
        if (!legacySchedule.closed && legacySchedule.open && legacySchedule.close) {
          if (scheduleSource === 'ninguno') {
            configuredSlots = [{ start: legacySchedule.open, end: legacySchedule.close }];
            scheduleSource = 'operatingHours';
          }
          console.log(`   Horario legacy: ${legacySchedule.open} - ${legacySchedule.close}`);
        }
      }
      
      // 2. VERIFICAR EXCEPCIONES
      console.log(`\n📆 EXCEPCIONES PARA ${TEST_DATE}:`);
      if (Array.isArray(settings?.exceptions)) {
        const exception = settings.exceptions.find(ex => ex.date === TEST_DATE);
        if (exception) {
          console.log(`   ⚠️ EXCEPCIÓN ENCONTRADA:`);
          if (exception.closed) {
            console.log(`   ❌ CENTRO CERRADO POR EXCEPCIÓN`);
            console.log(`   💡 ESTO EXPLICA "NO DISPONIBLE"`);
            continue;
          }
          if (exception.ranges && exception.ranges.length > 0) {
            console.log(`   ✅ Horarios especiales de excepción:`);
            exception.ranges.forEach((range, i) => {
              console.log(`      ${i + 1}. ${range.start} - ${range.end}`);
            });
            configuredSlots = exception.ranges;
            scheduleSource = 'exception';
          }
        } else {
          console.log(`   ✅ No hay excepciones para este día`);
        }
      }
      
      if (configuredSlots.length === 0) {
        console.log(`\n   ❌ PROBLEMA CRÍTICO: No hay horarios configurados para ${dayName}`);
        console.log(`   💡 SOLUCIÓN: Configurar schedule_slots o operatingHours`);
        continue;
      }
      
      // 3. GENERAR SLOTS TEÓRICOS
      const theoreticalSlots = generateTimeSlots(configuredSlots, TEST_DURATION);
      console.log(`\n   📊 Slots teóricos generados: ${theoreticalSlots.length}`);
      
      // 4. ANÁLISIS POR CANCHA
      console.log(`\n\n🏟️ ANÁLISIS DETALLADO POR CANCHA:`);
      console.log('-'.repeat(80));
      
      for (const court of center.courts) {
        console.log(`\n   📍 ${court.name} (${court.sportType}) - ID: ${court.id}`);
        
        // 5. OBTENER MANTENIMIENTOS
        const maintenances = await prisma.maintenanceSchedule.findMany({
          where: {
            courtId: court.id,
            scheduledAt: {
              gte: new Date(`${TEST_DATE}T00:00:00`),
              lt: new Date(`${TEST_DATE}T23:59:59`)
            },
            status: { in: ['SCHEDULED', 'IN_PROGRESS'] }
          }
        });
        
        console.log(`\n   🔧 MANTENIMIENTOS (${maintenances.length}):`);
        const maintenanceBlocks = [];
        if (maintenances.length > 0) {
          maintenances.forEach((m, i) => {
            const scheduledTime = new Date(m.scheduledAt);
            const startTime = scheduledTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
            const duration = m.estimatedDuration || 60;
            const endTime = new Date(scheduledTime.getTime() + duration * 60000).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
            
            console.log(`      ${i + 1}. ${startTime} - ${endTime} (${duration} min) - ${m.type} - ${m.status}`);
            console.log(`         Descripción: ${m.description}`);
            
            maintenanceBlocks.push({
              start: startTime,
              end: endTime,
              type: 'maintenance',
              description: m.description
            });
          });
        } else {
          console.log(`      ✅ No hay mantenimientos programados`);
        }
        
        // 6. OBTENER RESERVAS
        const reservations = await prisma.reservation.findMany({
          where: {
            courtId: court.id,
            startTime: {
              gte: new Date(`${TEST_DATE}T00:00:00`),
              lt: new Date(`${TEST_DATE}T23:59:59`)
            },
            status: { in: ['PENDING', 'PAID', 'IN_PROGRESS'] }
          },
          include: {
            user: {
              select: {
                name: true,
                email: true
              }
            }
          }
        });
        
        console.log(`\n   📅 RESERVAS (${reservations.length}):`);
        const reservationBlocks = [];
        if (reservations.length > 0) {
          reservations.forEach((r, i) => {
            const startTime = new Date(r.startTime).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
            const endTime = new Date(r.endTime).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
            
            console.log(`      ${i + 1}. ${startTime} - ${endTime} (${r.status}) - ${r.user?.name || 'Usuario'}`);
            
            reservationBlocks.push({
              start: startTime,
              end: endTime,
              type: 'reservation',
              status: r.status
            });
          });
        } else {
          console.log(`      ✅ No hay reservas programadas`);
        }
        
        // 7. ANÁLISIS CRUZADO DE CONFLICTOS
        console.log(`\n   🔍 ANÁLISIS DE CONFLICTOS:`);
        
        const allBlocks = [...maintenanceBlocks, ...reservationBlocks];
        let conflictsFound = 0;
        let slotsBlocked = 0;
        
        for (const block of allBlocks) {
          console.log(`\n      🚫 Bloqueo: ${block.start} - ${block.end} (${block.type})`);
          
          // Verificar si este bloqueo afecta a los horarios configurados
          let affectsConfiguredHours = false;
          for (const configuredSlot of configuredSlots) {
            if (timeOverlaps(block.start, block.end, configuredSlot.start, configuredSlot.end)) {
              affectsConfiguredHours = true;
              console.log(`         ✅ Justificado: Bloquea horario configurado ${configuredSlot.start}-${configuredSlot.end}`);
              break;
            }
          }
          
          if (!affectsConfiguredHours) {
            console.log(`         ⚠️ POSIBLE PROBLEMA: Bloqueo fuera de horarios configurados`);
            console.log(`         💡 Revisar si este bloqueo debería existir`);
            conflictsFound++;
          }
          
          // Contar slots afectados
          for (const slot of theoreticalSlots) {
            if (timeOverlaps(block.start, block.end, slot.start, slot.end)) {
              slot.status = 'blocked';
              slotsBlocked++;
            }
          }
        }
        
        // 8. RESUMEN POR CANCHA
        const availableSlots = theoreticalSlots.filter(s => s.status === 'available').length;
        const blockedSlots = slotsBlocked;
        
        console.log(`\n   📊 RESUMEN PARA ${court.name}:`);
        console.log(`      Slots teóricos: ${theoreticalSlots.length}`);
        console.log(`      Slots bloqueados: ${blockedSlots}`);
        console.log(`      Slots disponibles: ${availableSlots}`);
        console.log(`      Conflictos detectados: ${conflictsFound}`);
        
        // 9. DETECTAR PROBLEMAS
        if (availableSlots === 0 && theoreticalSlots.length > 0) {
          console.log(`\n   ❌ PROBLEMA CRÍTICO: ${court.name} tiene 0 slots disponibles`);
          console.log(`   💡 POSIBLES CAUSAS:`);
          console.log(`      - Demasiados mantenimientos programados`);
          console.log(`      - Mantenimientos mal configurados`);
          console.log(`      - Horarios muy restrictivos`);
        } else if (availableSlots > 0) {
          console.log(`\n   ✅ ${court.name} tiene ${availableSlots} slots disponibles`);
        }
        
        if (conflictsFound > 0) {
          console.log(`\n   ⚠️ ATENCIÓN: ${conflictsFound} conflictos detectados`);
          console.log(`   💡 Revisar configuración de mantenimientos/reservas`);
        }
      }
      
      // 10. RESUMEN GENERAL DEL CENTRO
      console.log(`\n\n📊 RESUMEN GENERAL DEL CENTRO:`);
      console.log('-'.repeat(80));
      console.log(`   Horarios configurados: ${scheduleSource}`);
      console.log(`   Franjas horarias: ${configuredSlots.length}`);
      console.log(`   Slots teóricos por cancha: ${theoreticalSlots.length}`);
      console.log(`   Canchas activas: ${center.courts.length}`);
      
      let totalMaintenances = 0;
      let totalReservations = 0;
      
      for (const court of center.courts) {
        const maintenances = await prisma.maintenanceSchedule.count({
          where: {
            courtId: court.id,
            scheduledAt: {
              gte: new Date(`${TEST_DATE}T00:00:00`),
              lt: new Date(`${TEST_DATE}T23:59:59`)
            }
          }
        });
        
        const reservations = await prisma.reservation.count({
          where: {
            courtId: court.id,
            startTime: {
              gte: new Date(`${TEST_DATE}T00:00:00`),
              lt: new Date(`${TEST_DATE}T23:59:59`)
            },
            status: { in: ['PENDING', 'PAID', 'IN_PROGRESS'] }
          }
        });
        
        totalMaintenances += maintenances;
        totalReservations += reservations;
      }
      
      console.log(`   Total mantenimientos: ${totalMaintenances}`);
      console.log(`   Total reservas: ${totalReservations}`);
      
      if (totalMaintenances === 0 && totalReservations === 0 && configuredSlots.length > 0) {
        console.log(`\n   ✅ TODO PARECE ESTAR BIEN CONFIGURADO`);
        console.log(`   💡 Si aún dice "no disponible", el problema está en el servidor de la API`);
      }
    }
    
  } catch (error) {
    console.error('\n❌ ERROR EN EL ANÁLISIS:', error);
  } finally {
    await prisma.$disconnect();
  }
}

console.log('🚀 Iniciando análisis profundo de disponibilidad...\n');
deepAvailabilityAnalysis();




