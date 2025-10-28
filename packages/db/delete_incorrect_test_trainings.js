import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deleteIncorrectTestTrainings() {
  try {
    console.log('🗑️ ELIMINANDO ENTRENAMIENTOS DE PRUEBA INCORRECTOS...\n');
    
    // Buscar la cancha de prueba
    const testCourt = await prisma.court.findFirst({
      where: {
        name: 'TEST 1 NO UTILIZAR',
        sportType: 'FOOTBALL'
      }
    });
    
    if (!testCourt) {
      console.log('❌ No se encontró la cancha de prueba');
      return;
    }
    
    console.log(`🏟️ Cancha encontrada: ${testCourt.name} (ID: ${testCourt.id})`);
    
    // Buscar entrenamientos recurrentes de prueba
    const testTrainings = await prisma.maintenanceSchedule.findMany({
      where: {
        courtId: testCourt.id,
        description: 'test recurrente',
        activityType: 'TRAINING'
      },
      orderBy: {
        scheduledAt: 'asc'
      }
    });
    
    console.log(`📋 Entrenamientos de prueba encontrados: ${testTrainings.length}\n`);
    
    if (testTrainings.length === 0) {
      console.log('ℹ️ No hay entrenamientos de prueba para eliminar');
      return;
    }
    
    // Mostrar detalles antes de eliminar
    console.log('📅 ENTRENAMIENTOS A ELIMINAR:');
    console.log('='.repeat(80));
    
    testTrainings.forEach((training, index) => {
      const scheduledDate = new Date(training.scheduledAt);
      const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
      const dayOfWeek = dayNames[scheduledDate.getDay()];
      
      console.log(`${index + 1}. ID: ${training.id}`);
      console.log(`   📅 Fecha: ${scheduledDate.toLocaleDateString('es-ES')}`);
      console.log(`   🕐 Hora: ${scheduledDate.toLocaleTimeString('es-ES')}`);
      console.log(`   📆 Día: ${dayOfWeek}`);
      console.log(`   📝 Descripción: ${training.description}`);
      console.log(`   🏷️ Serie ID: ${training.seriesId}`);
      console.log('');
    });
    
    // Confirmar eliminación
    console.log('⚠️ ¿Proceder con la eliminación? (Los entrenamientos se eliminarán automáticamente)');
    console.log('🔄 Eliminando entrenamientos...\n');
    
    // Eliminar entrenamientos uno por uno para tener control
    let deletedCount = 0;
    
    for (const training of testTrainings) {
      try {
        await prisma.maintenanceSchedule.delete({
          where: {
            id: training.id
          }
        });
        
        console.log(`✅ Eliminado: ${training.id} - ${new Date(training.scheduledAt).toLocaleDateString('es-ES')}`);
        deletedCount++;
        
      } catch (error) {
        console.error(`❌ Error eliminando ${training.id}:`, error.message);
      }
    }
    
    console.log('\n' + '='.repeat(80));
    console.log(`📊 RESUMEN DE ELIMINACIÓN:`);
    console.log(`   🗑️ Entrenamientos eliminados: ${deletedCount}`);
    console.log(`   ❌ Errores: ${testTrainings.length - deletedCount}`);
    
    // Verificar que se eliminaron correctamente
    const remainingTrainings = await prisma.maintenanceSchedule.findMany({
      where: {
        courtId: testCourt.id,
        description: 'test recurrente',
        activityType: 'TRAINING'
      }
    });
    
    console.log(`   ✅ Entrenamientos restantes: ${remainingTrainings.length}`);
    
    if (remainingTrainings.length === 0) {
      console.log('\n🎉 ¡Todos los entrenamientos de prueba incorrectos han sido eliminados exitosamente!');
    } else {
      console.log('\n⚠️ Aún quedan algunos entrenamientos. Revisar manualmente.');
    }
    
  } catch (error) {
    console.error('💥 Error al eliminar entrenamientos:', error);
  } finally {
    await prisma.$disconnect();
  }
}

deleteIncorrectTestTrainings();