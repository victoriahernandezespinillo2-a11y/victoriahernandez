import { config } from 'dotenv';
import { db } from './index.js';
import bcrypt from 'bcryptjs';

// Cargar variables de entorno
config();

async function main() {
  console.log('🌱 Iniciando seed de la base de datos...');

  // Limpiar datos existentes
  console.log('🧹 Limpiando datos existentes...');
  
  // Eliminar datos en orden correcto para evitar errores de foreign key
  await db.waitingList.deleteMany();
  await db.pricingRule.deleteMany();
  await db.maintenanceSchedule.deleteMany();
  await db.tournamentUser.deleteMany();
  await db.tournament.deleteMany();
  await db.membership.deleteMany();
  await db.reservation.deleteMany();
  await db.court.deleteMany();
  await db.center.deleteMany();
  await db.user.deleteMany();

  console.log('✅ Todas las tablas limpiadas');

  // Crear centro deportivo
  console.log('🏢 Creando centro deportivo...');
  const center = await db.center.create({
    data: {
      name: 'Polideportivo Oroquieta',
      address: 'Calle Principal 123, Oroquieta, Misamis Occidental',
      phone: '+63 88 531 2345',
      email: 'info@polideportivooroquieta.com',
      settings: {
        timezone: 'Asia/Manila',
        currency: 'PHP',
        language: 'es',
        business_hours: {
          monday: { open: '06:00', close: '22:00' },
          tuesday: { open: '06:00', close: '22:00' },
          wednesday: { open: '06:00', close: '22:00' },
          thursday: { open: '06:00', close: '22:00' },
          friday: { open: '06:00', close: '22:00' },
          saturday: { open: '07:00', close: '21:00' },
          sunday: { open: '07:00', close: '20:00' }
        }
      }
    }
  });

  console.log(`✅ Centro creado: ${center.name}`);

  // Crear canchas
  console.log('🏟️ Creando canchas...');
  const courts = [];
  const courtTypes = ['FUTBOL', 'BASQUET', 'TENIS', 'VOLEIBOL'];
  
  for (let i = 0; i < 8; i++) {
    const courtType = courtTypes[i % courtTypes.length];
    const court = await db.court.create({
      data: {
        name: `Cancha ${courtType} ${Math.floor(i / courtTypes.length) + 1}`,
        type: courtType,
        capacity: courtType === 'TENIS' ? 4 : courtType === 'VOLEIBOL' ? 12 : 22,
        hourly_rate: courtType === 'TENIS' ? 800 : courtType === 'FUTBOL' ? 1200 : 1000,
        is_active: true,
        center_id: center.id,
        features: {
          lighting: true,
          sound_system: i % 2 === 0,
          air_conditioning: courtType === 'BASQUET',
          parking: true,
          lockers: true,
          showers: true
        }
      }
    });
    courts.push(court);
  }

  console.log(`✅ ${courts.length} canchas creadas`);

  // Crear usuarios
  console.log('👥 Creando usuarios...');
  const users = [];
  
  // Admin user
  const adminUser = await db.user.create({
    data: {
      email: 'admin@polideportivooroquieta.com',
      password: await bcrypt.hash('admin123', 10),
      name: 'Administrador',
      phone: '+63 88 531 2345',
      role: 'ADMIN',
      is_active: true,
      email_verified: new Date(),
      profile: {
        birth_date: '1980-01-01',
        emergency_contact: '+63 88 531 2346',
        preferences: {
          notifications: true,
          newsletter: true,
          language: 'es'
        }
      }
    }
  });
  users.push(adminUser);

  // Regular users
  const regularUsers = [
    {
      email: 'juan.dela.cruz@email.com',
      name: 'Juan Dela Cruz',
      phone: '+63 917 123 4567'
    },
    {
      email: 'maria.santos@email.com', 
      name: 'Maria Santos',
      phone: '+63 918 234 5678'
    },
    {
      email: 'pedro.garcia@email.com',
      name: 'Pedro Garcia', 
      phone: '+63 919 345 6789'
    }
  ];

  for (const userData of regularUsers) {
    const user = await db.user.create({
      data: {
        email: userData.email,
        password: await bcrypt.hash('password123', 10),
        name: userData.name,
        phone: userData.phone,
        role: 'USER',
        is_active: true,
        email_verified: new Date(),
        profile: {
          preferences: {
            notifications: true,
            newsletter: false,
            language: 'es'
          }
        }
      }
    });
    users.push(user);
  }

  console.log(`✅ ${users.length} usuarios creados`);

  // Crear membresías
  console.log('💳 Creando membresías...');
  for (const user of users.slice(1)) { // Excluir admin
    await db.membership.create({
      data: {
        user_id: user.id,
        type: 'MONTHLY',
        status: 'ACTIVE',
        start_date: new Date(),
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 días
        price: 1500,
        benefits: {
          discount_percentage: 10,
          priority_booking: false,
          free_hours: 2
        }
      }
    });
  }

  console.log(`✅ ${users.length - 1} membresías creadas`);

  // Crear reglas de precios
  console.log('💰 Creando reglas de precios...');
  for (const court of courts) {
    // Precio normal
    await db.pricingRule.create({
      data: {
        court_id: court.id,
        name: `Precio Normal - ${court.name}`,
        base_price: court.hourly_rate,
        day_of_week: null,
        start_time: '06:00',
        end_time: '18:00',
        is_active: true,
        conditions: {
          min_duration: 60,
          max_duration: 180
        }
      }
    });

    // Precio nocturno
    await db.pricingRule.create({
      data: {
        court_id: court.id,
        name: `Precio Nocturno - ${court.name}`,
        base_price: Math.round(court.hourly_rate * 1.2),
        day_of_week: null,
        start_time: '18:00',
        end_time: '22:00',
        is_active: true,
        conditions: {
          min_duration: 60,
          max_duration: 180
        }
      }
    });
  }

  console.log(`✅ ${courts.length * 2} reglas de precios creadas`);

  // Crear una reserva de ejemplo
  console.log('📅 Creando reserva de ejemplo...');
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(10, 0, 0, 0);
  
  const endTime = new Date(tomorrow);
  endTime.setHours(12, 0, 0, 0);

  await db.reservation.create({
    data: {
      user_id: users[1].id,
      court_id: courts[0].id,
      start_time: tomorrow,
      end_time: endTime,
      status: 'CONFIRMED',
      total_price: courts[0].hourly_rate * 2,
      payment_status: 'PAID',
      notes: 'Reserva de ejemplo para demostración'
    }
  });

  console.log('✅ 1 reserva creada');

  // Crear torneo de ejemplo
  console.log('🏆 Creando torneo de ejemplo...');
  const tournamentStart = new Date();
  tournamentStart.setDate(tournamentStart.getDate() + 7);
  
  const tournamentEnd = new Date(tournamentStart);
  tournamentEnd.setDate(tournamentEnd.getDate() + 2);

  const tournament = await db.tournament.create({
    data: {
      name: 'Torneo de Fútbol Oroquieta 2024',
      description: 'Torneo amistoso de fútbol para la comunidad',
      start_date: tournamentStart,
      end_date: tournamentEnd,
      max_participants: 16,
      entry_fee: 500,
      prize_pool: 8000,
      status: 'OPEN',
      rules: {
        age_limit: { min: 16, max: 45 },
        team_size: 11,
        match_duration: 90,
        registration_deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
      }
    }
  });

  // Agregar participantes al torneo
  for (const user of users.slice(1, 3)) {
    await db.tournamentUser.create({
      data: {
        tournament_id: tournament.id,
        user_id: user.id,
        registration_date: new Date(),
        status: 'CONFIRMED',
        payment_status: 'PAID'
      }
    });
  }

  console.log('✅ 1 torneo con 2 participantes creado');

  // Crear programación de mantenimiento
  console.log('🔧 Creando programación de mantenimiento...');
  const maintenanceDate = new Date();
  maintenanceDate.setDate(maintenanceDate.getDate() + 3);
  maintenanceDate.setHours(8, 0, 0, 0);
  
  const maintenanceEnd = new Date(maintenanceDate);
  maintenanceEnd.setHours(12, 0, 0, 0);

  await db.maintenanceSchedule.create({
    data: {
      court_id: courts[0].id,
      title: 'Mantenimiento de césped artificial',
      description: 'Limpieza y revisión del césped artificial de la cancha',
      start_time: maintenanceDate,
      end_time: maintenanceEnd,
      status: 'SCHEDULED',
      priority: 'MEDIUM',
      assigned_to: 'Equipo de Mantenimiento',
      estimated_cost: 2000
    }
  });

  console.log('✅ 1 programación de mantenimiento creada');

  console.log('\n🎉 Seed completado exitosamente!');
  console.log('\n📊 Resumen de datos creados:');
  console.log(`   - 1 Centro deportivo`);
  console.log(`   - ${courts.length} Canchas`);
  console.log(`   - ${users.length} Usuarios (1 admin, ${users.length - 1} regulares)`);
  console.log(`   - ${users.length - 1} Membresías`);
  console.log(`   - ${courts.length * 2} Reglas de precios`);
  console.log(`   - 1 Reserva`);
  console.log(`   - 1 Torneo con 2 participantes`);
  console.log(`   - 1 Programación de mantenimiento`);
}

main()
  .catch((e) => {
    console.error('❌ Error durante el seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });