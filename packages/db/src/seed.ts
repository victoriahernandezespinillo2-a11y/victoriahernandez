import { db } from './index.js';
import { MembershipType, ReservationStatus, MaintenanceType, MaintenanceStatus, UserRole } from './index.js';
import bcrypt from 'bcryptjs';

async function main() {
  console.log('🌱 Iniciando seed de la base de datos...');

  // Limpiar datos existentes
  console.log('🧹 Limpiando datos existentes...');
  await db.gdprDeletionRequest.deleteMany();
  await db.webhookEvent.deleteMany();
  await db.outboxEvent.deleteMany();
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

  // Crear centro deportivo
  console.log('🏢 Creando centro deportivo...');
  const center = await db.center.create({
    data: {
      name: 'Polideportivo Oroquieta',
      address: 'Calle Principal 123, Oroquieta, Misamis Occidental',
      phone: '+63 88 123 4567',
      email: 'info@polideportivo.com',
      settings: JSON.stringify({
        timezone: 'Asia/Manila',
        currency: 'PHP',
        language: 'es',
        operatingHours: {
          monday: { open: '06:00', close: '22:00' },
          tuesday: { open: '06:00', close: '22:00' },
          wednesday: { open: '06:00', close: '22:00' },
          thursday: { open: '06:00', close: '22:00' },
          friday: { open: '06:00', close: '22:00' },
          saturday: { open: '07:00', close: '21:00' },
          sunday: { open: '07:00', close: '20:00' }
        }
      })
    }
  });

  // Crear canchas
  console.log('🏀 Creando canchas...');
  const courts = await Promise.all([
    db.court.create({
      data: {
        centerId: center.id,
        name: 'Cancha de Básquetbol 1',
        sportType: 'basketball',
        capacity: 20,
        basePricePerHour: 500.00,
        isActive: true,
        maintenanceStatus: 'operational'
      }
    }),
    db.court.create({
      data: {
        centerId: center.id,
        name: 'Cancha de Básquetbol 2',
        sportType: 'basketball',
        capacity: 20,
        basePricePerHour: 500.00,
        isActive: true,
        maintenanceStatus: 'operational'
      }
    }),
    db.court.create({
      data: {
        centerId: center.id,
        name: 'Cancha de Voleibol',
        sportType: 'volleyball',
        capacity: 12,
        basePricePerHour: 400.00,
        isActive: true,
        maintenanceStatus: 'operational'
      }
    }),
    db.court.create({
      data: {
        centerId: center.id,
        name: 'Cancha de Tenis',
        sportType: 'tennis',
        capacity: 4,
        basePricePerHour: 600.00,
        isActive: true,
        maintenanceStatus: 'operational'
      }
    }),
    db.court.create({
      data: {
        centerId: center.id,
        name: 'Cancha de Fútbol Sala',
        sportType: 'futsal',
        capacity: 14,
        basePricePerHour: 700.00,
        isActive: true,
        maintenanceStatus: 'operational'
      }
    })
  ]);

  // Crear usuarios de ejemplo
  console.log('👥 Creando usuarios...');
  
  // Hashear contraseñas
  const adminPassword = await bcrypt.hash('admin123', 12);
  const userPassword = await bcrypt.hash('user123', 12);
  
  const users = await Promise.all([
    db.user.create({
      data: {
        email: 'admin@polideportivo.com',
        password: adminPassword,
        name: 'Administrador Principal',
        phone: '+63 917 123 4567',
        role: UserRole.admin,
        membershipType: 'annual',
        membershipExpiresAt: new Date('2025-12-31'),
        creditsBalance: 100,
        isActive: true,
        gdprConsent: true,
        gdprConsentDate: new Date()
      }
    }),
    db.user.create({
      data: {
        email: 'juan.dela.cruz@gmail.com',
        password: userPassword,
        name: 'Juan Dela Cruz',
        phone: '+63 917 234 5678',
        role: UserRole.user,
        dateOfBirth: new Date('1990-05-15'),
        membershipType: 'monthly',
        membershipExpiresAt: new Date('2025-02-28'),
        creditsBalance: 20,
        isActive: true,
        gdprConsent: true,
        gdprConsentDate: new Date()
      }
    }),
    db.user.create({
      data: {
        email: 'maria.santos@gmail.com',
        password: userPassword,
        name: 'Maria Santos',
        phone: '+63 917 345 6789',
        role: UserRole.user,
        dateOfBirth: new Date('1985-08-22'),
        membershipType: 'quarterly',
        membershipExpiresAt: new Date('2025-03-31'),
        creditsBalance: 50,
        isActive: true,
        gdprConsent: true,
        gdprConsentDate: new Date()
      }
    }),
    db.user.create({
      data: {
        email: 'pedro.garcia@gmail.com',
        password: userPassword,
        name: 'Pedro Garcia',
        phone: '+63 917 456 7890',
        role: UserRole.user,
        dateOfBirth: new Date('1992-12-10'),
        creditsBalance: 0,
        isActive: true,
        gdprConsent: true,
        gdprConsentDate: new Date()
      }
    })
  ]);

  // Crear membresías
  console.log('💳 Creando membresías...');
  await Promise.all([
    db.membership.create({
      data: {
        userId: users[1].id,
        type: MembershipType.MONTHLY,
        creditsIncluded: 20,
        creditsRemaining: 20,
        price: 2000.00,
        discountPercentage: 10.00,
        validFrom: new Date('2025-01-01'),
        validUntil: new Date('2025-01-31'),
        autoRenewal: true,
        status: 'active'
      }
    }),
    db.membership.create({
      data: {
        userId: users[2].id,
        type: MembershipType.QUARTERLY,
        creditsIncluded: 60,
        creditsRemaining: 50,
        price: 5500.00,
        discountPercentage: 15.00,
        validFrom: new Date('2025-01-01'),
        validUntil: new Date('2025-03-31'),
        autoRenewal: false,
        status: 'active'
      }
    })
  ]);

  // Crear reglas de precios
  console.log('💰 Creando reglas de precios...');
  for (const court of courts) {
    await Promise.all([
      // Horario pico (18:00 - 21:00)
      db.pricingRule.create({
        data: {
          courtId: court.id,
          name: 'Horario Pico',
          timeStart: '18:00',
          timeEnd: '21:00',
          daysOfWeek: "1,2,3,4,5", // Lunes a Viernes
          priceMultiplier: 1.5,
          memberDiscount: 20.00,
          isActive: true
        }
      }),
      // Fin de semana
      db.pricingRule.create({
        data: {
          courtId: court.id,
          name: 'Fin de Semana',
          timeStart: '08:00',
          timeEnd: '20:00',
          daysOfWeek: "6,7", // Sábado y Domingo
          priceMultiplier: 1.3,
          memberDiscount: 15.00,
          isActive: true
        }
      })
    ]);
  }

  // Crear algunas reservas de ejemplo
  console.log('📅 Creando reservas de ejemplo...');
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(10, 0, 0, 0);

  const endTime = new Date(tomorrow);
  endTime.setHours(11, 0, 0, 0);

  await db.reservation.create({
    data: {
      courtId: courts[0].id,
      userId: users[1].id,
      startTime: tomorrow,
      endTime: endTime,
      status: ReservationStatus.PAID,
      totalPrice: 500.00,
      paymentMethod: 'credit_card',
      notes: 'Reserva de ejemplo para básquetbol'
    }
  });

  // Crear torneo de ejemplo
  console.log('🏆 Creando torneo de ejemplo...');
  const tournament = await db.tournament.create({
    data: {
      name: 'Torneo de Básquetbol Enero 2025',
      sport: 'basketball',
      format: 'elimination',
      startDate: new Date('2025-02-01'),
      endDate: new Date('2025-02-15'),
      maxParticipants: 16,
      registrationFee: 1000.00,
      prizePool: 10000.00,
      status: 'open',
      rules: 'Torneo eliminatorio de básquetbol. Equipos de 5 jugadores.'
    }
  });

  // Registrar participantes en el torneo
  await Promise.all([
    db.tournamentUser.create({
      data: {
        tournamentId: tournament.id,
        userId: users[1].id,
        status: 'registered'
      }
    }),
    db.tournamentUser.create({
      data: {
        tournamentId: tournament.id,
        userId: users[2].id,
        status: 'registered'
      }
    })
  ]);

  // Crear programación de mantenimiento
  console.log('🔧 Creando programación de mantenimiento...');
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  nextWeek.setHours(8, 0, 0, 0);

  await db.maintenanceSchedule.create({
    data: {
      courtId: courts[2].id,
      type: MaintenanceType.CLEANING,
      scheduledDate: nextWeek,
      estimatedDuration: 120, // 2 horas
      priority: 'medium',
      assignedTo: 'Equipo de Limpieza',
      status: MaintenanceStatus.SCHEDULED,
      cost: 500.00,
      notes: 'Limpieza profunda de la cancha de voleibol'
    }
  });

  console.log('✅ Seed completado exitosamente!');
  console.log(`📊 Datos creados:`);
  console.log(`   - 1 Centro deportivo`);
  console.log(`   - ${courts.length} Canchas`);
  console.log(`   - ${users.length} Usuarios`);
  console.log(`   - 2 Membresías`);
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