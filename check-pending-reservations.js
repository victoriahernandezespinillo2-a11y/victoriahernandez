const { PrismaClient } = require('@prisma/client');

async function checkPendingReservations() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Verificando reservas PENDING...');
    
    // Obtener todas las reservas PENDING
    const pendingReservations = await prisma.reservation.findMany({
      where: {
        status: 'PENDING'
      },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        },
        court: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    console.log(`📊 Total de reservas PENDING: ${pendingReservations.length}`);
    
    if (pendingReservations.length > 0) {
      console.log('\n📋 Detalles de reservas PENDING:');
      
      pendingReservations.forEach((reservation, index) => {
        const now = new Date();
        const createdAt = new Date(reservation.createdAt);
        const minutesAgo = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60));
        
        console.log(`\n${index + 1}. ID: ${reservation.id}`);
        console.log(`   Usuario: ${reservation.user?.name || 'N/A'} (${reservation.user?.email || 'N/A'})`);
        console.log(`   Cancha: ${reservation.court?.name || 'N/A'}`);
        console.log(`   Inicio: ${reservation.startTime}`);
        console.log(`   Fin: ${reservation.endTime}`);
        console.log(`   Creada hace: ${minutesAgo} minutos`);
        console.log(`   Precio: €${reservation.totalPrice}`);
        
        // Marcar reservas antiguas
        if (minutesAgo > 15) {
          console.log(`   ⚠️  RESERVA ANTIGUA (>${minutesAgo} min) - Candidata para limpieza`);
        }
      });
      
      // Contar reservas por antigüedad
      const oldReservations = pendingReservations.filter(r => {
        const minutesAgo = Math.floor((new Date().getTime() - new Date(r.createdAt).getTime()) / (1000 * 60));
        return minutesAgo > 15;
      });
      
      console.log(`\n🚨 Reservas PENDING antiguas (>15 min): ${oldReservations.length}`);
      
      // Verificar conflictos potenciales
      const now = new Date();
      const futureReservations = pendingReservations.filter(r => new Date(r.startTime) > now);
      console.log(`📅 Reservas PENDING futuras: ${futureReservations.length}`);
      
      if (futureReservations.length > 0) {
        console.log('\n🔒 Horarios bloqueados por reservas PENDING futuras:');
        futureReservations.forEach(r => {
          console.log(`   - ${r.court?.name}: ${r.startTime} - ${r.endTime}`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPendingReservations();