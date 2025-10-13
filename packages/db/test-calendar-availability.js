/**
 * Script para consultar la disponibilidad del calendario
 * Simula exactamente lo que hace el endpoint calendar-status
 * para identificar por qué todas las canchas dicen "no disponible"
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Fechas a probar
const TEST_DATES = [
  '2025-10-10', // Viernes
  '2025-10-11', // Sábado  
  '2025-10-12', // Domingo
  '2025-10-13', // Lunes
  '2025-10-14'  // Martes
];

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

async function testCalendarAvailability() {
  console.log('🔍 CONSULTA DE DISPONIBILIDAD DEL CALENDARIO');
  console.log('='.repeat(80));
  console.log(`⏱️ Duración de reserva: ${TEST_DURATION} minutos`);
  console.log(`📅 Fechas a probar: ${TEST_DATES.join(', ')}`);
  console.log('='.repeat(80));

  try {
    // Obtener centros y canchas
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
      
      // Probar cada fecha
      for (const testDate of TEST_DATES) {
        console.log(`\n\n📅 FECHA: ${testDate} (${getDayName(testDate)})`);
        console.log('-'.repeat(60));
        
        const dayName = getDayName(testDate);
        
        // 1. OBTENER HORARIOS DEL DÍA
        let daySlots = [];
        let scheduleSource = 'ninguno';
        
        // Verificar schedule_slots (prioridad 1)
        if (settings?.schedule_slots?.[dayName]) {
          const daySchedule = settings.schedule_slots[dayName];
          console.log(`   ✅ schedule_slots encontrado`);
          console.log(`   Cerrado: ${daySchedule.closed ? 'SÍ' : 'NO'}`);
          
          if (!daySchedule.closed && Array.isArray(daySchedule.slots)) {
            daySlots = daySchedule.slots;
            scheduleSource = 'schedule_slots';
            console.log(`   Franjas horarias:`);
            daySchedule.slots.forEach((slot, i) => {
              console.log(`      ${i + 1}. ${slot.start} - ${slot.end}`);
            });
          }
        }
        
        // Verificar operatingHours (prioridad 2)
        if (settings?.operatingHours?.[dayName]) {
          const legacySchedule = settings.operatingHours[dayName];
          console.log(`   ✅ operatingHours encontrado`);
          console.log(`   Cerrado: ${legacySchedule.closed ? 'SÍ' : 'NO'}`);
          
          if (!legacySchedule.closed && legacySchedule.open && legacySchedule.close) {
            if (scheduleSource === 'ninguno') {
              daySlots = [{ start: legacySchedule.open, end: legacySchedule.close }];
              scheduleSource = 'operatingHours';
            }
            console.log(`   Horario: ${legacySchedule.open} - ${legacySchedule.close}`);
          }
        }
        
        // Verificar excepciones
        if (Array.isArray(settings?.exceptions)) {
          const exception = settings.exceptions.find(ex => ex.date === testDate);
          if (exception) {
            console.log(`   ⚠️ EXCEPCIÓN ENCONTRADA:`);
            if (exception.closed) {
              console.log(`   ❌ CENTRO CERRADO POR EXCEPCIÓN`);
              console.log(`   💡 ESTO EXPLICA "NO DISPONIBLE"`);
              continue;
            }
            if (exception.ranges && exception.ranges.length > 0) {
              console.log(`   ✅ Horarios especiales:`);
              exception.ranges.forEach((range, i) => {
                console.log(`      ${i + 1}. ${range.start} - ${range.end}`);
              });
              daySlots = exception.ranges;
              scheduleSource = 'exception';
            }
          }
        }
        
        if (daySlots.length === 0) {
          console.log(`   ❌ PROBLEMA: No hay horarios configurados para ${dayName}`);
          console.log(`   💡 ESTO EXPLICA "NO DISPONIBLE"`);
          continue;
        }
        
        // 2. GENERAR SLOTS TEÓRICOS
        const theoreticalSlots = generateTimeSlots(daySlots, TEST_DURATION);
        console.log(`   📊 Slots teóricos generados: ${theoreticalSlots.length}`);
        
        // 3. ANALIZAR CADA CANCHA
        console.log(`\n   🏟️ ANÁLISIS POR CANCHA:`);
        
        for (const court of center.courts) {
          console.log(`\n      📍 ${court.name} (${court.sportType})`);
          
          // Obtener mantenimientos del día
          const maintenances = await prisma.maintenanceSchedule.findMany({
            where: {
              courtId: court.id,
              scheduledAt: {
                gte: new Date(`${testDate}T00:00:00`),
                lt: new Date(`${testDate}T23:59:59`)
              },
              status: { in: ['SCHEDULED', 'IN_PROGRESS'] }
            }
          });
          
          console.log(`         🔧 Mantenimientos: ${maintenances.length}`);
          if (maintenances.length > 0) {
            maintenances.forEach((m, i) => {
              const time = new Date(m.scheduledAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
              const duration = m.estimatedDuration || 60;
              console.log(`            ${i + 1}. ${time} - ${duration} min (${m.type})`);
            });
          }
          
          // Obtener reservas del día
          const reservations = await prisma.reservation.findMany({
            where: {
              courtId: court.id,
              startTime: {
                gte: new Date(`${testDate}T00:00:00`),
                lt: new Date(`${testDate}T23:59:59`)
              },
              status: { in: ['PENDING', 'PAID', 'IN_PROGRESS'] }
            }
          });
          
          console.log(`         📅 Reservas: ${reservations.length}`);
          if (reservations.length > 0) {
            reservations.forEach((r, i) => {
              const start = new Date(r.startTime).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
              const end = new Date(r.endTime).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
              console.log(`            ${i + 1}. ${start} - ${end} (${r.status})`);
            });
          }
          
          // Calcular slots disponibles
          const allBlocks = [...maintenances, ...reservations];
          let availableSlots = 0;
          let blockedSlots = 0;
          
          for (const slot of theoreticalSlots) {
            let isBlocked = false;
            
            for (const block of allBlocks) {
              const blockStart = new Date(block.scheduledAt || block.startTime);
              const blockEnd = new Date(blockStart.getTime() + (block.estimatedDuration || 60) * 60000);
              
              const slotStart = new Date(`${testDate}T${slot.start}:00`);
              const slotEnd = new Date(`${testDate}T${slot.end}:00`);
              
              if (slotStart < blockEnd && slotEnd > blockStart) {
                isBlocked = true;
                break;
              }
            }
            
            if (isBlocked) {
              blockedSlots++;
            } else {
              availableSlots++;
            }
          }
          
          console.log(`         📊 Resultado:`);
          console.log(`            Slots teóricos: ${theoreticalSlots.length}`);
          console.log(`            Slots bloqueados: ${blockedSlots}`);
          console.log(`            Slots disponibles: ${availableSlots}`);
          
          if (availableSlots === 0) {
            console.log(`         ❌ PROBLEMA: 0 slots disponibles`);
            console.log(`         💡 POSIBLES CAUSAS:`);
            if (theoreticalSlots.length === 0) {
              console.log(`            - No se generaron slots teóricos`);
            } else if (blockedSlots === theoreticalSlots.length) {
              console.log(`            - Todos los slots están bloqueados por mantenimientos/reservas`);
            } else {
              console.log(`            - Error en el cálculo de disponibilidad`);
            }
          } else {
            console.log(`         ✅ ${availableSlots} slots disponibles`);
          }
        }
      }
    }
    
    // RESUMEN FINAL
    console.log(`\n\n${'='.repeat(80)}`);
    console.log(`📊 RESUMEN DE LA CONSULTA`);
    console.log(`${'='.repeat(80)}`);
    
    console.log(`\n💡 CONCLUSIONES:`);
    console.log(`   1. Si TODAS las canchas dicen "no disponible" en TODOS los días:`);
    console.log(`      - El problema NO está en la configuración de horarios`);
    console.log(`      - El problema NO está en los mantenimientos/reservas`);
    console.log(`      - El problema ESTÁ en el servidor de la API`);
    console.log(`\n   2. Si solo algunas canchas/días dicen "no disponible":`);
    console.log(`      - Revisar la configuración específica de esos días/canchas`);
    console.log(`      - Verificar mantenimientos/reservas programadas`);
    
    console.log(`\n🔧 SOLUCIÓN RECOMENDADA:`);
    console.log(`   Reiniciar el servidor de la API:`);
    console.log(`   cd apps/api && npm run dev`);
    
  } catch (error) {
    console.error('\n❌ ERROR EN LA CONSULTA:', error);
  } finally {
    await prisma.$disconnect();
  }
}

console.log('🚀 Iniciando consulta de disponibilidad del calendario...\n');
testCalendarAvailability();




