import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deleteTestTrainings() {
  try {
    console.log('🗑️ ELIMINANDO ENTRENAMIENTOS DE PRUEBA...\n');
    
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
    
    // Contar entrenamientos antes de eliminar
    const countBefore = await prisma.maintenanceSchedule.count({
      where: {
        courtId: testCourt.id,
        description: {
          startsWith: 'MASSIVE TEST'
        }
      }
    });
    
    console.log(`📋 Entrenamientos de prueba encontrados: ${countBefore}`);
    
    if (countBefore === 0) {
      console.log('✅ No hay entrenamientos de prueba para eliminar');
      return;
    }
    
    // Eliminar todos los entrenamientos de prueba
    const deleteResult = await prisma.maintenanceSchedule.deleteMany({
      where: {
        courtId: testCourt.id,
        description: {
          startsWith: 'MASSIVE TEST'
        }
      }
    });
    
    console.log(`🗑️ Entrenamientos eliminados: ${deleteResult.count}`);
    
    // Verificar que se eliminaron correctamente
    const countAfter = await prisma.maintenanceSchedule.count({
      where: {
        courtId: testCourt.id,
        description: {
          startsWith: 'MASSIVE TEST'
        }
      }
    });
    
    console.log(`📋 Entrenamientos restantes: ${countAfter}`);
    
    if (countAfter === 0) {
      console.log('✅ Todos los entrenamientos de prueba han sido eliminados correctamente');
    } else {
      console.log('⚠️ Algunos entrenamientos no se pudieron eliminar');
    }
    
  } catch (error) {
    console.error('💥 Error al eliminar entrenamientos:', error);
  } finally {
    await prisma.$disconnect();
  }
}

deleteTestTrainings();