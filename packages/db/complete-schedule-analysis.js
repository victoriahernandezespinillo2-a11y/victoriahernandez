/**
 * ANÁLISIS COMPLETO DE HORARIOS Y TAREAS
 * Lista horarios configurados por día para un mes completo
 * Consulta TODAS las tareas programadas
 * Compara por cancha, deporte y horarios
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Mes a analizar (octubre 2025)
const MONTH = 10;
const YEAR = 2025;

function getDayName(dayOfWeek) {
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return dayNames[dayOfWeek];
}

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

function formatTime(date) {
  return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
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

async function completeScheduleAnalysis() {
  console.log('🔍 ANÁLISIS COMPLETO DE HORARIOS Y TAREAS');
  console.log('='.repeat(80));
  console.log(`📅 Mes: ${MONTH}/${YEAR}`);
  console.log('='.repeat(80));

  try {
    // 1. OBTENER CENTROS Y CANCHAS
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
      
      // 2. LISTAR HORARIOS CONFIGURADOS POR DÍA DE LA SEMANA
      console.log(`\n📋 HORARIOS CONFIGURADOS POR DÍA:`);
      console.log('-'.repeat(60));
      
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const spanishDays = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
      
      let hasScheduleSlots = false;
      let hasOperatingHours = false;
      
      for (let i = 0; i < dayNames.length; i++) {
        const dayName = dayNames[i];
        const spanishDay = spanishDays[i];
        
        console.log(`\n   ${spanishDay} (${dayName}):`);
        
        // Verificar schedule_slots
        if (settings?.schedule_slots?.[dayName]) {
          hasScheduleSlots = true;
          const daySchedule = settings.schedule_slots[dayName];
          console.log(`     📅 schedule_slots: ${daySchedule.closed ? 'CERRADO' : 'ABIERTO'}`);
          
          if (!daySchedule.closed && Array.isArray(daySchedule.slots)) {
            daySchedule.slots.forEach((slot, j) => {
              console.log(`        Franja ${j + 1}: ${slot.start} - ${slot.end}`);
            });
          }
        }
        
        // Verificar operatingHours
        if (settings?.operatingHours?.[dayName]) {
          hasOperatingHours = true;
          const legacySchedule = settings.operatingHours[dayName];
          console.log(`     🕐 operatingHours: ${legacySchedule.closed ? 'CERRADO' : 'ABIERTO'}`);
          
          if (!legacySchedule.closed && legacySchedule.open && legacySchedule.close) {
            console.log(`        Horario: ${legacySchedule.open} - ${legacySchedule.close}`);
          }
        }
        
        if (!settings?.schedule_slots?.[dayName] && !settings?.operatingHours?.[dayName]) {
          console.log(`     ❌ Sin configuración`);
        }
      }
      
      console.log(`\n   📊 Resumen de configuración:`);
      console.log(`     Tiene schedule_slots: ${hasScheduleSlots ? '✅ SÍ' : '❌ NO'}`);
      console.log(`     Tiene operatingHours: ${hasOperatingHours ? '✅ SÍ' : '❌ NO'}`);
      
      // 3. LISTAR EXCEPCIONES DEL MES
      console.log(`\n📆 EXCEPCIONES DEL MES ${MONTH}/${YEAR}:`);
      console.log('-'.repeat(60));
      
      if (Array.isArray(settings?.exceptions)) {
        const monthExceptions = settings.exceptions.filter(ex => {
          const exDate = new Date(ex.date);
          return exDate.getMonth() === MONTH - 1 && exDate.getFullYear() === YEAR;
        });
        
        if (monthExceptions.length > 0) {
          monthExceptions.forEach((ex, i) => {
            const date = new Date(ex.date);
            const dayName = getDayName(date.getDay());
            console.log(`   ${i + 1}. ${ex.date} (${dayName}):`);
            
            if (ex.closed) {
              console.log(`      ❌ CENTRO CERRADO`);
            } else if (ex.ranges && ex.ranges.length > 0) {
              console.log(`      ✅ Horarios especiales:`);
              ex.ranges.forEach((range, j) => {
                console.log(`         ${j + 1}. ${range.start} - ${range.end}`);
              });
            }
          });
        } else {
          console.log(`   ✅ No hay excepciones programadas para este mes`);
        }
      } else {
        console.log(`   ✅ No hay excepciones configuradas`);
      }
      
      // 4. CONSULTAR TODAS LAS TAREAS DEL MES
      console.log(`\n\n🔧 TODAS LAS TAREAS PROGRAMADAS DEL MES:`);
      console.log('-'.repeat(80));
      
      const startOfMonth = new Date(YEAR, MONTH - 1, 1);
      const endOfMonth = new Date(YEAR, MONTH, 0, 23, 59, 59);
      
      const allTasks = await prisma.maintenanceSchedule.findMany({
        where: {
          scheduledAt: {
            gte: startOfMonth,
            lte: endOfMonth
          }
        },
        include: {
          court: {
            select: {
              name: true,
              sportType: true,
              center: {
                select: {
                  name: true
                }
              }
            }
          }
        },
        orderBy: {
          scheduledAt: 'asc'
        }
      });
      
      console.log(`   📊 Total tareas encontradas: ${allTasks.length}`);
      
      if (allTasks.length > 0) {
        // Agrupar por tipo
        const tasksByType = {};
        const tasksByStatus = {};
        const tasksByCourt = {};
        
        allTasks.forEach(task => {
          // Por tipo
          if (!tasksByType[task.type]) tasksByType[task.type] = 0;
          tasksByType[task.type]++;
          
          // Por estado
          if (!tasksByStatus[task.status]) tasksByStatus[task.status] = 0;
          tasksByStatus[task.status]++;
          
          // Por cancha
          const courtName = task.court?.name || 'Sin cancha';
          if (!tasksByCourt[courtName]) tasksByCourt[courtName] = 0;
          tasksByCourt[courtName]++;
        });
        
        console.log(`\n   📈 Distribución por tipo:`);
        Object.entries(tasksByType).forEach(([type, count]) => {
          console.log(`      ${type}: ${count} tareas`);
        });
        
        console.log(`\n   📊 Distribución por estado:`);
        Object.entries(tasksByStatus).forEach(([status, count]) => {
          console.log(`      ${status}: ${count} tareas`);
        });
        
        console.log(`\n   🏟️ Distribución por cancha:`);
        Object.entries(tasksByCourt).forEach(([court, count]) => {
          console.log(`      ${court}: ${count} tareas`);
        });
        
        // 5. ANÁLISIS DETALLADO POR CANCHA
        console.log(`\n\n🏟️ ANÁLISIS DETALLADO POR CANCHA:`);
        console.log('='.repeat(80));
        
        for (const court of center.courts) {
          console.log(`\n   📍 ${court.name} (${court.sportType})`);
          console.log(`   ID: ${court.id}`);
          console.log(`   Activa: ${court.isActive ? '✅ SÍ' : '❌ NO'}`);
          
          if (!court.isActive) {
            console.log(`   ⚠️ Cancha desactivada - no disponible para reservas`);
            continue;
          }
          
          // Obtener tareas de esta cancha
          const courtTasks = allTasks.filter(task => task.courtId === court.id);
          console.log(`   🔧 Tareas programadas: ${courtTasks.length}`);
          
          if (courtTasks.length > 0) {
            console.log(`\n   📅 Cronograma de tareas:`);
            
            // Agrupar por fecha
            const tasksByDate = {};
            courtTasks.forEach(task => {
              const date = formatDate(task.scheduledAt);
              if (!tasksByDate[date]) tasksByDate[date] = [];
              tasksByDate[date].push(task);
            });
            
            Object.entries(tasksByDate).forEach(([date, tasks]) => {
              const dayOfWeek = new Date(date).getDay();
              const dayName = getDayName(dayOfWeek);
              console.log(`\n      📅 ${date} (${dayName}):`);
              
              tasks.forEach((task, i) => {
                const time = formatTime(task.scheduledAt);
                const duration = task.estimatedDuration ? `${task.estimatedDuration} min` : 'Sin duración';
                console.log(`         ${i + 1}. ${time} - ${duration} (${task.type}) - ${task.status}`);
                console.log(`            Descripción: ${task.description}`);
                
                // Verificar si hay horarios configurados para este día
                const hasSchedule = settings?.schedule_slots?.[dayName] || settings?.operatingHours?.[dayName];
                if (hasSchedule) {
                  console.log(`            ✅ Hay horarios configurados para ${dayName}`);
                } else {
                  console.log(`            ❌ NO hay horarios configurados para ${dayName}`);
                }
              });
            });
          } else {
            console.log(`   ✅ Sin tareas programadas - disponible todo el mes`);
          }
          
          // Verificar reservas del mes
          const monthReservations = await prisma.reservation.findMany({
            where: {
              courtId: court.id,
              startTime: {
                gte: startOfMonth,
                lte: endOfMonth
              },
              status: { in: ['PENDING', 'PAID', 'IN_PROGRESS'] }
            }
          });
          
          console.log(`   📅 Reservas del mes: ${monthReservations.length}`);
          
          if (monthReservations.length > 0) {
            console.log(`   📊 Distribución de reservas por estado:`);
            const reservationsByStatus = {};
            monthReservations.forEach(res => {
              if (!reservationsByStatus[res.status]) reservationsByStatus[res.status] = 0;
              reservationsByStatus[res.status]++;
            });
            
            Object.entries(reservationsByStatus).forEach(([status, count]) => {
              console.log(`      ${status}: ${count} reservas`);
            });
          }
        }
      } else {
        console.log(`   ✅ No hay tareas programadas para este mes`);
      }
    }
    
    // 6. RESUMEN GENERAL
    console.log(`\n\n${'='.repeat(80)}`);
    console.log(`📊 RESUMEN GENERAL`);
    console.log(`${'='.repeat(80)}`);
    
    const totalCenters = centers.length;
    const totalCourts = centers.reduce((acc, c) => acc + c.courts.length, 0);
    
    // Obtener total de tareas para el resumen
    const startOfMonth = new Date(YEAR, MONTH - 1, 1);
    const endOfMonth = new Date(YEAR, MONTH, 0, 23, 59, 59);
    
    const allTasks = await prisma.maintenanceSchedule.findMany({
      where: {
        scheduledAt: {
          gte: startOfMonth,
          lte: endOfMonth
        }
      }
    });
    
    const totalTasks = allTasks.length;
    
    console.log(`\n✅ Centros analizados: ${totalCenters}`);
    console.log(`✅ Canchas activas: ${totalCourts}`);
    console.log(`✅ Tareas programadas: ${totalTasks}`);
    
    if (totalTasks > 0) {
      const pendingTasks = allTasks.filter(t => t.status === 'SCHEDULED').length;
      const inProgressTasks = allTasks.filter(t => t.status === 'IN_PROGRESS').length;
      const completedTasks = allTasks.filter(t => t.status === 'COMPLETED').length;
      
      console.log(`\n📊 Estado de las tareas:`);
      console.log(`   Pendientes: ${pendingTasks}`);
      console.log(`   En progreso: ${inProgressTasks}`);
      console.log(`   Completadas: ${completedTasks}`);
    }
    
  } catch (error) {
    console.error('\n❌ ERROR EN EL ANÁLISIS:', error);
  } finally {
    await prisma.$disconnect();
  }
}

console.log('🚀 Iniciando análisis completo de horarios y tareas...\n');
completeScheduleAnalysis();
