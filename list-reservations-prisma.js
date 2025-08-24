// 📋 SCRIPT PARA LISTAR RESERVAS USANDO LA INSTANCIA DE PRISMA DEL PROYECTO
const { db } = require('@repo/db');

async function listAllReservations() {
  try {
    console.log('🔍 Conectando a la base de datos con Prisma...');
    console.log('✅ Conexión establecida');
    console.log('🔍 Obteniendo todas las reservas del sistema...');
    console.log('=' .repeat(80));

    // Obtener todas las reservas con información del usuario y cancha
    const reservations = await db.reservation.findMany({
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
                id: true,
                name: true
              }
            }
          }
        }
      },
      orderBy: [
        { startTime: 'desc' },
        { createdAt: 'desc' }
      ],
      take: 50
    });

    console.log(`📊 TOTAL DE RESERVAS ENCONTRADAS: ${reservations.length}`);
    console.log('=' .repeat(80));

    if (reservations.length === 0) {
      console.log('❌ No se encontraron reservas en el sistema.');
      return;
    }

    // Agrupar reservas por usuario
    const userStats = {};

    reservations.forEach(reservation => {
      const userId = reservation.userId;
      const userName = reservation.user?.name || 'Usuario sin nombre';
      const userEmail = reservation.user?.email || 'Sin email';

      if (!userStats[userId]) {
        userStats[userId] = {
          name: userName,
          email: userEmail,
          phone: reservation.user?.phone || 'Sin teléfono',
          totalReservations: 0,
          statusCount: {}
        };
      }

      userStats[userId].totalReservations++;
      userStats[userId].statusCount[reservation.status] = (userStats[userId].statusCount[reservation.status] || 0) + 1;
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
            CANCELLED: '❌',
            NO_SHOW: '👻'
          };
          console.log(`      ${statusEmoji[status] || '❓'} ${status}: ${count}`);
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
        CANCELLED: '❌',
        NO_SHOW: '👻'
      };

      console.log(`\n${index + 1}. 📅 RESERVA ID: ${reservation.id}`);
      console.log(`   👤 Usuario: ${reservation.user?.name || 'Sin nombre'} (${reservation.user?.email || 'Sin email'})`);
      console.log(`   🆔 User ID: ${reservation.userId}`);
      console.log(`   🏟️  Cancha: ${reservation.court?.name || 'Sin nombre'} - ${reservation.court?.center?.name || 'Sin centro'}`);
      console.log(`   🕐 Horario: ${startTime} - ${endTime}`);
      console.log(`   ${statusEmoji[reservation.status] || '❓'} Estado: ${reservation.status}`);
      console.log(`   💰 Precio: $${reservation.totalPrice || 0}`);
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
        CANCELLED: '❌',
        NO_SHOW: '👻'
      };
      console.log(`   ${statusEmoji[status] || '❓'} ${status}: ${count}`);
    });

    // Verificar si hay un usuario dominante
    const sortedUsers = Object.entries(userStats).sort((a, b) => b[1].totalReservations - a[1].totalReservations);
    if (sortedUsers.length > 0) {
      const topUser = sortedUsers[0];
      const percentage = ((topUser[1].totalReservations / reservations.length) * 100).toFixed(1);
      
      console.log('\n🏆 USUARIO CON MÁS RESERVAS:');
      console.log('-'.repeat(50));
      console.log(`👤 ${topUser[1].name} (${topUser[1].email})`);
      console.log(`📊 ${topUser[1].totalReservations} reservas (${percentage}% del total)`);
      console.log(`🆔 User ID: ${topUser[0]}`);
      
      if (percentage > 80) {
        console.log('\n⚠️  ALERTA: Este usuario tiene más del 80% de todas las reservas!');
        console.log('   Esto podría explicar por qué todas las reservas aparecen como "ocupado por otros"');
        console.log('   si el sistema no está identificando correctamente al usuario actual.');
      }
    }

    // Información adicional para debugging
    console.log('\n' + '='.repeat(80));
    console.log('🔍 INFORMACIÓN DE DEBUGGING:');
    console.log('='.repeat(80));
    
    // Mostrar algunos IDs de usuario únicos
    const uniqueUserIds = [...new Set(reservations.map(r => r.userId))];
    console.log(`🆔 IDs de usuario únicos encontrados: ${uniqueUserIds.length}`);
    uniqueUserIds.slice(0, 10).forEach((userId, index) => {
      const user = reservations.find(r => r.userId === userId)?.user;
      console.log(`   ${index + 1}. ${userId} - ${user?.name || 'Sin nombre'} (${user?.email || 'Sin email'})`);
    });
    
    if (uniqueUserIds.length > 10) {
      console.log(`   ... y ${uniqueUserIds.length - 10} más`);
    }

    // Mostrar reservas para el 23 de agosto específicamente
    console.log('\n' + '='.repeat(80));
    console.log('📅 RESERVAS PARA EL 23 DE AGOSTO DE 2024:');
    console.log('='.repeat(80));
    
    const august23Reservations = reservations.filter(r => {
      const reservationDate = new Date(r.startTime);
      return reservationDate.getFullYear() === 2024 && 
             reservationDate.getMonth() === 7 && // Agosto es mes 7 (0-indexado)
             reservationDate.getDate() === 23;
    });
    
    console.log(`📊 Reservas encontradas para el 23/08/2024: ${august23Reservations.length}`);
    
    august23Reservations.forEach((reservation, index) => {
      const startTime = new Date(reservation.startTime).toLocaleString('es-ES', {
        timeZone: 'America/Bogota',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      const endTime = new Date(reservation.endTime).toLocaleString('es-ES', {
        timeZone: 'America/Bogota',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      console.log(`\n${index + 1}. 🏟️  ${reservation.court?.name || 'Sin nombre'}`);
      console.log(`   👤 ${reservation.user?.name || 'Sin nombre'} (ID: ${reservation.userId})`);
      console.log(`   🕐 ${startTime} - ${endTime}`);
      console.log(`   📊 Estado: ${reservation.status}`);
    });

  } catch (error) {
    console.error('❌ Error obteniendo reservas:', error.message);
    console.error('Stack trace:', error.stack);
    
    // Información adicional sobre el error
    if (error.code) {
      console.error('Código de error:', error.code);
    }
    
    if (error.meta) {
      console.error('Meta información:', error.meta);
    }
  } finally {
    await db.$disconnect();
  }
}

// Ejecutar el script
if (require.main === module) {
  listAllReservations()
    .then(() => {
      console.log('\n✅ Script completado.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error ejecutando script:', error.message);
      process.exit(1);
    });
}

module.exports = { listAllReservations };