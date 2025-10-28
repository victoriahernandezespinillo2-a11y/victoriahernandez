import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugDates() {
  try {
    console.log('🔍 DEBUGGEANDO FECHAS...\n');
    
    // Fecha actual del sistema
    const now = new Date();
    console.log(`📅 Fecha actual del sistema: ${now.toLocaleString()}`);
    console.log(`📅 Año actual: ${now.getFullYear()}`);
    console.log(`📅 Mes actual: ${now.getMonth() + 1}`);
    console.log(`📅 Día actual: ${now.getDate()}\n`);
    
    // Buscar algunos entrenamientos para ver sus fechas
    const trainings = await prisma.maintenanceSchedule.findMany({
      where: {
        description: {
          startsWith: 'MASSIVE TEST'
        }
      },
      take: 5,
      orderBy: {
        scheduledAt: 'asc'
      }
    });
    
    console.log('📋 FECHAS DE ENTRENAMIENTOS:');
    trainings.forEach((training, index) => {
      const date = new Date(training.scheduledAt);
      console.log(`${index + 1}. ${training.description.substring(0, 30)}...`);
      console.log(`   📅 Fecha: ${date.toLocaleString()}`);
      console.log(`   📅 Año: ${date.getFullYear()}`);
      console.log(`   📅 ISO: ${date.toISOString()}`);
      console.log('');
    });
    
    // Crear una fecha de prueba para hoy a las 18:00
    const testDate = new Date();
    testDate.setHours(18, 0, 0, 0);
    console.log(`🧪 Fecha de prueba (hoy 18:00): ${testDate.toLocaleString()}`);
    console.log(`🧪 ISO: ${testDate.toISOString()}`);
    
  } catch (error) {
    console.error('💥 Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugDates();