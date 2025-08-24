// 📋 SCRIPT PARA LISTAR TODAS LAS RESERVAS DEL SISTEMA
// Este script muestra todas las reservas con información detallada del usuario propietario

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function listAllReservations() {
  try {
    console.log('🔍 Obteniendo todas las reservas del sistema...');
    console.log('=' .repeat(80));

    // Obtener todas las reservas con información completa
    const reservations = await prisma.reservation.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        },
        court: {
          select: {
            id: true,
            name: true,
            center: {
              select: {
                name: true
              }
            }
          }
        }
      },
      orderBy: [
        { startTime: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    console.log(`📊 TOTAL DE RESERVAS ENCONTRADAS: ${reservations.length}`);
    console.log('=' .repeat(80));

    if (reservations.length === 0) {
      console.log('❌ No se encontraron reservas en el sistema.');
      return;
    }

    // Agrupar reservas por usuario
    const reservationsByUser = {};
    const userStats = {};

    reservations.forEach(reservation => {
      const userId = reservation.userId;
      const userName = reservation.user?.name || 'Usuario sin nombre';
      const userEmail = reservation.user?.email || 'Sin email';

      if (!reservationsByUser[userId]) {
        reservationsByUser[userId] = [];
        userStats[userId] = {
          name: userName,
          email: userEmail,
          phone: reservation.user?.phone || 'Sin teléfono',
          totalReservations: 0,
          statusCount: {
            PENDING: 0,
            PAID: 0,
            IN_PROGRESS: 0,
            COMPLETED: 0,
            CANCELLED: 0
          }
        };
      }

      reservationsByUser[userId].push(reservation);
      userStats[userId].totalReservations++;
      userStats[userId].statusCount[reservation.status]++;
    });

    // Mostrar estadísticas por usuario
    console.log('👥 ESTADÍSTICAS POR USUARIO:');
    console.log('-'.repeat(80));

    Object.entries(userStats).forEach(([userId, stats]) => {
      console.log(`\n🧑‍💼 USUARIO: ${stats.name}`);
      console.log(`   📧 Email: ${stats.email}`);
      console.log(`   📱 Teléfono: ${stats.phone}`);
      console.log(`   🆔 ID: ${userId}`);
      console.log(`   📊 Total Reservas: ${stats.totalReservations}`);
      console.log(`   📈 Estados:`);
      Object.entries(stats.statusCount).forEach(([status, count]) => {
        if (count > 0) {
          const statusEmoji = {
            PENDING: '⏳',
            PAID: '✅',
            IN_PROGRESS: '🏃‍♂️',
            COMPLETED: '🏁',
            CANCELLED: '❌'
          };
          console.log(`      ${statusEmoji[status]} ${status}: ${count}`);
        }
      });
    });

    console.log('\n' + '='.repeat(80));
    console.log('📋 DETALLE DE TODAS LAS RESERVAS:');
    console.log('='.repeat(80));

    // Mostrar todas las reservas con detalles
    reservations.forEach((reservation, index) => {
      const startTime = new Date(reservation.startTime).toLocaleString('es-ES', {
        timeZone: 'America/Bogota',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });

      const endTime = new Date(reservation.endTime).toLocaleString('es-ES', {
        timeZone: 'America/Bogota',
        hour: '2-digit',
        minute: '2-digit'
      });

      const statusEmoji = {
        PENDING: '⏳',
        PAID: '✅',
        IN_PROGRESS: '🏃‍♂️',
        COMPLETED: '🏁',
        CANCELLED: '❌'
      };

      console.log(`\n${index + 1}. 📅 RESERVA ID: ${reservation.id}`);
      console.log(`   👤 Usuario: ${reservation.user?.name || 'Sin nombre'} (${reservation.user?.email || 'Sin email'})`);
      console.log(`   🆔 User ID: ${reservation.userId}`);
      console.log(`   🏟️  Cancha: ${reservation.court?.name || 'Sin nombre'} - ${reservation.court?.center?.name || 'Sin centro'}`);
      console.log(`   🕐 Horario: ${startTime} - ${endTime}`);
      console.log(`   ${statusEmoji[reservation.status]} Estado: ${reservation.status}`);
      console.log(`   💰 Precio: $${reservation.totalAmount || 0}`);
      console.log(`   📝 Creada: ${new Date(reservation.createdAt).toLocaleString('es-ES')}`);
      
      if (reservation.notes) {
        console.log(`   📋 Notas: ${reservation.notes}`);
      }
    });

    // Mostrar resumen final
    console.log('\n' + '='.repeat(80));
    console.log('📊 RESUMEN FINAL:');
    console.log('='.repeat(80));
    console.log(`👥 Total de usuarios con reservas: ${Object.keys(userStats).length}`);
    console.log(`📅 Total de reservas: ${reservations.length}`);
    
    // Contar por estado
    const statusTotals = reservations.reduce((acc, res) => {
      acc[res.status] = (acc[res.status] || 0) + 1;
      return acc;
    }, {});

    console.log('\n📈 Reservas por estado:');
    Object.entries(statusTotals).forEach(([status, count]) => {
      const statusEmoji = {
        PENDING: '⏳',
        PAID: '✅',
        IN_PROGRESS: '🏃‍♂️',
        COMPLETED: '🏁',
        CANCELLED: '❌'
      };
      console.log(`   ${statusEmoji[status]} ${status}: ${count}`);
    });

    // Mostrar reservas recientes (últimas 10)
    console.log('\n🕐 RESERVAS MÁS RECIENTES (últimas 10):');
    console.log('-'.repeat(50));
    reservations.slice(0, 10).forEach((res, index) => {
      const date = new Date(res.startTime).toLocaleDateString('es-ES');
      const time = new Date(res.startTime).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
      console.log(`${index + 1}. ${res.user?.name || 'Sin nombre'} - ${res.court?.name} - ${date} ${time} (${res.status})`);
    });

  } catch (error) {
    console.error('❌ Error obteniendo reservas:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar el script
if (require.main === module) {
  listAllReservations()
    .then(() => {
      console.log('\n✅ Script completado exitosamente.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error ejecutando script:', error);
      process.exit(1);
    });
}

module.exports = { listAllReservations };