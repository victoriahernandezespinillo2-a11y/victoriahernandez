// 📋 SCRIPT SIMPLE PARA LISTAR RESERVAS USANDO CONEXIÓN DIRECTA
require('dotenv').config();
const { Client } = require('pg');

// Usar la DATABASE_URL directa
const client = new Client({
  connectionString: process.env.DATABASE_URL
});

async function listAllReservations() {
  try {
    console.log('🔍 Conectando a PostgreSQL...');
    await client.connect();
    console.log('✅ Conexión establecida');
    console.log('🔍 Obteniendo todas las reservas del sistema...');
    console.log('=' .repeat(80));

    // Query simple para obtener todas las reservas
    const query = `
      SELECT 
        r.id,
        r.user_id,
        r.court_id,
        r.start_time,
        r.end_time,
        r.status,
        r.total_amount,
        r.notes,
        r.created_at,
        u.name as user_name,
        u.email as user_email,
        u.phone as user_phone,
        c.name as court_name
      FROM reservations r
      LEFT JOIN users u ON r.user_id = u.id
      LEFT JOIN courts c ON r.court_id = c.id
      ORDER BY r.start_time DESC, r.created_at DESC
      LIMIT 50;
    `;

    const result = await client.query(query);
    const reservations = result.rows;

    console.log(`📊 TOTAL DE RESERVAS ENCONTRADAS: ${reservations.length}`);
    console.log('=' .repeat(80));

    if (reservations.length === 0) {
      console.log('❌ No se encontraron reservas en el sistema.');
      return;
    }

    // Agrupar reservas por usuario
    const userStats = {};

    reservations.forEach(reservation => {
      const userId = reservation.user_id;
      const userName = reservation.user_name || 'Usuario sin nombre';
      const userEmail = reservation.user_email || 'Sin email';

      if (!userStats[userId]) {
        userStats[userId] = {
          name: userName,
          email: userEmail,
          phone: reservation.user_phone || 'Sin teléfono',
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
            CANCELLED: '❌'
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
      const startTime = new Date(reservation.start_time).toLocaleString('es-ES', {
        timeZone: 'America/Bogota',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });

      const endTime = new Date(reservation.end_time).toLocaleString('es-ES', {
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
      console.log(`   👤 Usuario: ${reservation.user_name || 'Sin nombre'} (${reservation.user_email || 'Sin email'})`);
      console.log(`   🆔 User ID: ${reservation.user_id}`);
      console.log(`   🏟️  Cancha: ${reservation.court_name || 'Sin nombre'}`);
      console.log(`   🕐 Horario: ${startTime} - ${endTime}`);
      console.log(`   ${statusEmoji[reservation.status] || '❓'} Estado: ${reservation.status}`);
      console.log(`   💰 Precio: $${reservation.total_amount || 0}`);
      console.log(`   📝 Creada: ${new Date(reservation.created_at).toLocaleString('es-ES')}`);
      
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

  } catch (error) {
    console.error('❌ Error obteniendo reservas:', error.message);
    console.error('Código de error:', error.code);
    
    // Intentar mostrar las tablas disponibles
    try {
      console.log('\n🔍 Intentando listar las tablas disponibles...');
      const tablesQuery = `
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        ORDER BY table_name;
      `;
      const tablesResult = await client.query(tablesQuery);
      console.log('📋 Tablas encontradas:');
      tablesResult.rows.forEach(row => {
        console.log(`   - ${row.table_name}`);
      });
    } catch (tablesError) {
      console.error('❌ Error listando tablas:', tablesError.message);
    }
  } finally {
    await client.end();
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