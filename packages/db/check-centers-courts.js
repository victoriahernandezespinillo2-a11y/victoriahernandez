/**
 * Script para verificar centros y canchas en la base de datos
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkData() {
  try {
    console.log('🔍 Verificando base de datos...\n');
    
    // Verificar centros
    const centers = await prisma.center.findMany({
      select: {
        id: true,
        name: true,
        timezone: true,
        dayStart: true,
        nightStart: true,
        settings: true,
        _count: {
          select: {
            courts: true
          }
        }
      }
    });
    
    console.log(`📍 Centros encontrados: ${centers.length}`);
    centers.forEach(center => {
      console.log(`\n  - ID: ${center.id}`);
      console.log(`    Nombre: ${center.name}`);
      console.log(`    Canchas: ${center._count.courts}`);
      console.log(`    Timezone: ${center.timezone || 'No configurado'}`);
      console.log(`    Day Start: ${center.dayStart || 'No configurado'}`);
      console.log(`    Night Start: ${center.nightStart || 'No configurado'}`);
      console.log(`    Settings: ${JSON.stringify(center.settings, null, 2)}`);
    });
    
    // Verificar canchas
    const courts = await prisma.court.findMany({
      where: {
        isActive: true
      },
      select: {
        id: true,
        name: true,
        sportType: true,
        isActive: true,
        centerId: true,
        center: {
          select: {
            name: true
          }
        }
      }
    });
    
    console.log(`\n🏟️ Canchas activas encontradas: ${courts.length}`);
    courts.forEach(court => {
      console.log(`\n  - ID: ${court.id}`);
      console.log(`    Nombre: ${court.name}`);
      console.log(`    Deporte: ${court.sportType}`);
      console.log(`    Centro: ${court.center.name} (${court.centerId})`);
      console.log(`    Activa: ${court.isActive ? 'Sí' : 'No'}`);
    });
    
    // Verificar usuarios
    const users = await prisma.user.count();
    console.log(`\n👥 Usuarios registrados: ${users}`);
    
  } catch (error) {
    console.error('❌ Error verificando base de datos:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkData();




