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
        sportType: courtType,
        capacity: courtType === 'TENIS' ? 4 : courtType === 'VOLEIBOL' ? 12 : 22,
        basePricePerHour: courtType === 'TENIS' ? 800 : courtType === 'FUTBOL' ? 1200 : 1000,
        isActive: true,
        centerId: center.id
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
      isActive: true,
      emailVerifiedAt: new Date()
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
        isActive: true,
        emailVerifiedAt: new Date()
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
        userId: user.id,
        type: 'MONTHLY',
        status: 'active',
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 días
        price: 1500
      }
    });
  }

  console.log(`✅ ${users.length - 1} membresías creadas`);

  // Crear reglas de precios
  console.log('💰 Creando reglas de precios...');
  for (const court of courts) {
    // Precio diurno
    await db.pricingRule.create({
      data: {
        courtId: court.id,
        name: `Precio Diurno - ${court.name}`,
        type: 'time_based',
        timeStart: '06:00',
        timeEnd: '18:00',
        isActive: true,
        priceMultiplier: 1.0,
        daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        conditions: {
          min_duration: 60,
          max_duration: 180
        },
        adjustment: {
          type: 'multiplier',
          value: 1.0
        }
      }
    });

    // Precio nocturno
    await db.pricingRule.create({
      data: {
        courtId: court.id,
        name: `Precio Nocturno - ${court.name}`,
        type: 'time_based',
        timeStart: '18:00',
        timeEnd: '22:00',
        isActive: true,
        priceMultiplier: 1.2,
        daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        conditions: {
          min_duration: 60,
          max_duration: 180
        },
        adjustment: {
          type: 'multiplier',
          value: 1.2
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
      userId: users[1].id,
      courtId: courts[0].id,
      startTime: tomorrow,
      endTime: endTime,
      status: 'IN_PROGRESS',
      totalPrice: courts[0].basePricePerHour * 2,
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
      sport: 'FUTBOL',
      centerId: center.id,
      startDate: tournamentStart,
      endDate: tournamentEnd,
      maxParticipants: 16,
      registrationFee: 500,
      prizePool: 8000,
      registrationStartDate: new Date(),
      registrationEndDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      status: 'OPEN',
      organizer: 'Polideportivo Oroquieta',
      contactEmail: 'admin@polideportivooroquieta.com'
    }
  });

  // Agregar participantes al torneo
  for (const user of users.slice(1, 3)) {
    await db.tournamentUser.create({
      data: {
        tournamentId: tournament.id,
        userId: user.id,
        registrationDate: new Date(),
        status: 'CONFIRMED'
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
      courtId: courts[0].id,
      title: 'Mantenimiento de césped artificial',
      description: 'Limpieza y revisión del césped artificial de la cancha',
      startTime: maintenanceDate,
      endTime: maintenanceEnd,
      status: 'SCHEDULED',
      priority: 'MEDIUM',
      assignedTo: 'Equipo de Mantenimiento',
      estimatedCost: 2000
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