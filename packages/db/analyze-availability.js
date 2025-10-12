/**
 * Script de análisis completo de disponibilidad
 * Compara configuración de centro, canchas, horarios, mantenimiento, prácticas
 * e identifica inconsistencias que puedan causar "no disponible"
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Fecha a analizar (puedes cambiarla)
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

async function analyzeAvailability() {
  console.log('🔍 ANÁLISIS COMPLETO DE DISPONIBILIDAD\n');
  console.log(`📅 Fecha de análisis: ${TEST_DATE} (${getDayName(TEST_DATE)})`);
  console.log(`⏱️ Duración de reserva: ${TEST_DURATION} minutos\n`);
  console.log('='.repeat(80));

  try {
    // 1. OBTENER CENTRO Y CANCHAS
    const centers = await prisma.center.findMany({
      include: {
        courts: {
          where: { isActive: true }
        }
      }
    });

    if (centers.length === 0) {
      console.log('❌ No se encontraron centros');
      return;
    }

    for (const center of centers) {
      console.log(`\n\n🏢 CENTRO: ${center.name}`);
      console.log('='.repeat(80));
      
      const settings = center.settings || {};
      const dayName = getDayName(TEST_DATE);
      
      console.log(`\n📋 CONFIGURACIÓN DEL CENTRO:`);
      console.log(`   Timezone: ${center.timezone || 'No configurado'}`);
      console.log(`   Day Start: ${center.dayStart || 'No configurado'}`);
      console.log(`   Night Start: ${center.nightStart || 'No configurado'}`);
      
      // 2. ANALIZAR HORARIOS DEL DÍA
      console.log(`\n⏰ HORARIOS PARA ${dayName.toUpperCase()}:`);
      
      let daySlots = [];
      let scheduleSource = 'ninguno';
      
      // Verificar schedule_slots (prioridad 1)
      if (settings?.schedule_slots?.[dayName]) {
        const daySchedule = settings.schedule_slots[dayName];
        console.log(`   ✅ Tiene schedule_slots configurado`);
        console.log(`   Cerrado: ${daySchedule.closed ? 'SÍ' : 'NO'}`);
        
        if (!daySchedule.closed && Array.isArray(daySchedule.slots)) {
          daySlots = daySchedule.slots;
          scheduleSource = 'schedule_slots';
          console.log(`   Franjas horarias:`);
          daySchedule.slots.forEach((slot, i) => {
            console.log(`      ${i + 1}. ${slot.start} - ${slot.end}`);
          });
        } else if (daySchedule.closed) {
          console.log(`   ⚠️ CENTRO CERRADO EN schedule_slots`);
        }
      } else {
        console.log(`   ❌ NO tiene schedule_slots configurado`);
      }
      
      // Verificar operatingHours (prioridad 2)
      if (settings?.operatingHours?.[dayName]) {
        const legacySchedule = settings.operatingHours[dayName];
        console.log(`   ✅ Tiene operatingHours configurado`);
        console.log(`   Cerrado: ${legacySchedule.closed ? 'SÍ' : 'NO'}`);
        
        if (!legacySchedule.closed && legacySchedule.open && legacySchedule.close) {
          if (scheduleSource === 'ninguno') {
            daySlots = [{ start: legacySchedule.open, end: legacySchedule.close }];
            scheduleSource = 'operatingHours';
          }
          console.log(`   Horario: ${legacySchedule.open} - ${legacySchedule.close}`);
        }
      } else {
        console.log(`   ❌ NO tiene operatingHours configurado`);
      }
      
      console.log(`\n   📊 Fuente de horarios utilizada: ${scheduleSource}`);
      
      if (daySlots.length === 0) {
        console.log(`   ❌ PROBLEMA: No hay horarios definidos para este día`);
        console.log(`   💡 SOLUCIÓN: Configurar schedule_slots o operatingHours para ${dayName}`);
        continue;
      }
      
      // 3. VERIFICAR EXCEPCIONES
      console.log(`\n📆 EXCEPCIONES:`);
      if (Array.isArray(settings?.exceptions)) {
        const exception = settings.exceptions.find(ex => ex.date === TEST_DATE);
        if (exception) {
          console.log(`   ⚠️ EXCEPCIÓN ENCONTRADA para ${TEST_DATE}:`);
          if (exception.closed) {
            console.log(`   ❌ CENTRO CERRADO POR EXCEPCIÓN`);
            console.log(`   💡 Este es el motivo de "no disponible"`);
            continue;
          }
          if (exception.ranges && exception.ranges.length > 0) {
            console.log(`   ✅ Horarios especiales:`);
            exception.ranges.forEach((range, i) => {
              console.log(`      ${i + 1}. ${range.start} - ${range.end}`);
            });
            daySlots = exception.ranges; // Usar horarios de excepción
            scheduleSource = 'exception';
          }
        } else {
          console.log(`   ✅ No hay excepciones para ${TEST_DATE}`);
        }
      } else {
        console.log(`   ✅ No hay excepciones configuradas`);
      }
      
      // 4. ANALIZAR CADA CANCHA
      console.log(`\n\n🏟️ ANÁLISIS DE CANCHAS (${center.courts.length} activas):`);
      console.log('-'.repeat(80));
      
      for (const court of center.courts) {
        console.log(`\n   📍 ${court.name} (${court.sportType})`);
        console.log(`   ID: ${court.id}`);
        console.log(`   Activa: ${court.isActive ? '✅ SÍ' : '❌ NO'}`);
        
        if (!court.isActive) {
          console.log(`   ❌ PROBLEMA: Cancha desactivada`);
          console.log(`   💡 SOLUCIÓN: Activar la cancha en el panel de administración`);
          continue;
        }
        
        // 5. VERIFICAR MANTENIMIENTO
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
        
        console.log(`   🔧 Mantenimientos programados: ${maintenances.length}`);
        if (maintenances.length > 0) {
          maintenances.forEach((m, i) => {
            const scheduledTime = new Date(m.scheduledAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
            const duration = m.estimatedDuration ? `${m.estimatedDuration} min` : 'Sin duración';
            console.log(`      ${i + 1}. ${scheduledTime} - ${duration} (${m.type}) - ${m.status}`);
          });
        }
        
        // 6. VERIFICAR RESERVAS
        const reservations = await prisma.reservation.findMany({
          where: {
            courtId: court.id,
            startTime: {
              gte: new Date(`${TEST_DATE}T00:00:00`),
              lt: new Date(`${TEST_DATE}T23:59:59`)
            },
            status: { in: ['PENDING', 'PAID', 'IN_PROGRESS'] }
          }
        });
        
        console.log(`   📅 Reservas existentes: ${reservations.length}`);
        if (reservations.length > 0) {
          reservations.forEach((r, i) => {
            const start = new Date(r.startTime).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
            const end = new Date(r.endTime).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
            console.log(`      ${i + 1}. ${start} - ${end} (${r.status})`);
          });
        }
        
        // 7. GENERAR SLOTS Y VERIFICAR DISPONIBILIDAD
        console.log(`\n   🎯 GENERACIÓN DE SLOTS:`);
        console.log(`   Usando horarios de: ${scheduleSource}`);
        
        const allSlots = [];
        const slotMinutes = 30;
        
        for (const daySlot of daySlots) {
          const startMinutes = timeToMinutes(daySlot.start);
          const endMinutes = timeToMinutes(daySlot.end);
          
          console.log(`   Franja: ${daySlot.start} - ${daySlot.end}`);
          
          let slotsGenerated = 0;
          for (let currentMinutes = startMinutes; currentMinutes < endMinutes; currentMinutes += slotMinutes) {
            const slotEndMinutes = Math.min(currentMinutes + TEST_DURATION, endMinutes);
            
            if (slotEndMinutes - currentMinutes >= TEST_DURATION) {
              const slotStartTime = minutesToTime(currentMinutes);
              const slotEndTime = minutesToTime(slotEndMinutes);
              
              allSlots.push({
                start: slotStartTime,
                end: slotEndTime
              });
              slotsGenerated++;
            }
          }
          console.log(`   Slots generados: ${slotsGenerated}`);
        }
        
        console.log(`\n   📊 RESUMEN:`);
        console.log(`   Total slots generados: ${allSlots.length}`);
        console.log(`   Slots bloqueados por mantenimiento: ${maintenances.length}`);
        console.log(`   Slots bloqueados por reservas: ${reservations.length}`);
        console.log(`   Slots potencialmente disponibles: ${Math.max(0, allSlots.length - maintenances.length - reservations.length)}`);
        
        if (allSlots.length === 0) {
          console.log(`\n   ❌ PROBLEMA: No se generaron slots`);
          console.log(`   💡 POSIBLES CAUSAS:`);
          console.log(`      - Horarios muy cortos para la duración de reserva (${TEST_DURATION} min)`);
          console.log(`      - Horarios mal configurados (hora fin < hora inicio)`);
          console.log(`      - Centro cerrado ese día`);
        }
      }
    }
    
    // 8. RESUMEN FINAL
    console.log(`\n\n${'='.repeat(80)}`);
    console.log(`📊 RESUMEN DE ANÁLISIS`);
    console.log(`${'='.repeat(80)}`);
    
    const totalCourts = centers.reduce((acc, c) => acc + c.courts.length, 0);
    console.log(`\n✅ Centros analizados: ${centers.length}`);
    console.log(`✅ Canchas activas: ${totalCourts}`);
    console.log(`\n💡 RECOMENDACIONES:`);
    console.log(`   1. Verificar que schedule_slots esté configurado correctamente`);
    console.log(`   2. Asegurar que no haya excepciones bloqueando el día`);
    console.log(`   3. Confirmar que las canchas estén activas`);
    console.log(`   4. Revisar que los horarios sean suficientes para la duración de reserva`);
    
  } catch (error) {
    console.error('\n❌ ERROR EN EL ANÁLISIS:', error);
  } finally {
    await prisma.$disconnect();
  }
}

console.log('🚀 Iniciando análisis de disponibilidad...\n');
analyzeAvailability();
