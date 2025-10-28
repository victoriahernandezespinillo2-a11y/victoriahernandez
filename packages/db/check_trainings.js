import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkTrainings() {
  try {
    console.log('🔍 VERIFICANDO ENTRENAMIENTOS EN LA BASE DE DATOS...\n');
    
    // Contar total de entrenamientos
    const totalCount = await prisma.maintenanceSchedule.count();
    console.log(`📊 Total de entrenamientos en DB: ${totalCount}`);
    
    // Buscar entrenamientos de prueba específicamente
    const testTrainings = await prisma.maintenanceSchedule.count({
      where: {
        description: {
          startsWith: 'MASSIVE TEST'
        }
      }
    });
    console.log(`🧪 Entrenamientos de prueba (MASSIVE TEST): ${testTrainings}`);
    
    // Buscar por cancha de prueba
    const testCourt = await prisma.court.findFirst({
      where: {
        name: 'TEST 1 NO UTILIZAR',
        sportType: 'FOOTBALL'
      }
    });
    
    if (testCourt) {
      console.log(`🏟️ Cancha de prueba encontrada: ${testCourt.name} (ID: ${testCourt.id})`);
      
      const courtTrainings = await prisma.maintenanceSchedule.count({
        where: {
          courtId: testCourt.id
        }
      });
      console.log(`📋 Entrenamientos en cancha de prueba: ${courtTrainings}`);
      
      // Mostrar algunos ejemplos
      const examples = await prisma.maintenanceSchedule.findMany({
        where: {
          courtId: testCourt.id
        },
        take: 5,
        select: {
          id: true,
          description: true,
          scheduledAt: true,
          type: true,
          activityType: true,
          status: true
        },
        orderBy: {
          scheduledAt: 'asc'
        }
      });
      
      console.log('\n📝 EJEMPLOS DE ENTRENAMIENTOS:');
      examples.forEach((training, index) => {
        console.log(`${index + 1}. ${training.description}`);
        console.log(`   📅 Fecha: ${training.scheduledAt}`);
        console.log(`   🏷️ Tipo: ${training.type} | Actividad: ${training.activityType}`);
        console.log(`   📊 Estado: ${training.status}`);
        console.log('');
      });
    } else {
      console.log('❌ No se encontró la cancha de prueba');
    }
    
    // Verificar entrenamientos por tipo de actividad
    const trainingsByActivity = await prisma.maintenanceSchedule.groupBy({
      by: ['activityType'],
      _count: {
        id: true
      }
    });
    
    console.log('📈 ENTRENAMIENTOS POR TIPO DE ACTIVIDAD:');
    trainingsByActivity.forEach(group => {
      console.log(`   ${group.activityType}: ${group._count.id}`);
    });
    
  } catch (error) {
    console.error('💥 Error al verificar entrenamientos:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTrainings();