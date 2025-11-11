import { db } from './src/index.js';
import bcrypt from 'bcryptjs';

async function simpleSeed() {
  try {
    console.log('🌱 Iniciando seed simplificado...');
    
    // Crear centro deportivo
    console.log('🏢 Creando centro deportivo...');
    const center = await db.center.create({
      data: {
        name: 'IDB Victoria Hernández',
        address: 'CALLE CONSENSO, 5, 28041 Madrid, España (Los Rosales, Villaverde)',
        phone: '+34 XXX XXX XXX',
        email: 'admin@polideportivovictoriahernandez.es',
        settings: {
          timezone: 'Europe/Madrid',
          currency: 'EUR',
          language: 'es'
        }
      }
    });
    
    console.log(`✅ Centro creado: ${center.name}`);
    
    // Crear canchas
    console.log('🏀 Creando canchas...');
    const courts = [];
    
    const courtData = [
      { name: 'Cancha de Básquetbol 1', sportType: 'basketball', price: 500 },
      { name: 'Cancha de Básquetbol 2', sportType: 'basketball', price: 500 },
      { name: 'Cancha de Voleibol', sportType: 'volleyball', price: 400 },
      { name: 'Cancha de Tenis', sportType: 'tennis', price: 600 },
      { name: 'Cancha de Fútbol Sala', sportType: 'futsal', price: 700 }
    ];
    
    for (const courtInfo of courtData) {
      const court = await db.court.create({
        data: {
          centerId: center.id,
          name: courtInfo.name,
          sportType: courtInfo.sportType,
          capacity: 20,
          basePricePerHour: courtInfo.price,
          isActive: true,
          maintenanceStatus: 'operational'
        }
      });
      courts.push(court);
    }
    
    console.log(`✅ ${courts.length} canchas creadas`);
    
    // Crear usuarios
    console.log('👥 Creando usuarios...');
    const users = [];
    
    // Usuario administrador
    const adminUser = await db.user.create({
      data: {
        email: 'admin@polideportivovictoriahernandez.es',
        password: await bcrypt.hash('admin123', 10),
        name: 'Administrador Principal',
        phone: '+63 88 531 2345',
        role: 'ADMIN',
        isActive: true,
        gdprConsent: true,
        gdprConsentDate: new Date()
      }
    });
    users.push(adminUser);
    
    // Usuarios regulares
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
          gdprConsent: true,
          gdprConsentDate: new Date()
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
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 días
          price: 1500,
          isActive: true
        }
      });
    }
    
    console.log(`✅ ${users.length - 1} membresías creadas`);
    
    console.log('\n🎉 Seed completado exitosamente!');
    console.log('\n📊 Resumen de datos creados:');
    console.log(`   - 1 Centro deportivo`);
    console.log(`   - ${courts.length} Canchas`);
    console.log(`   - ${users.length} Usuarios (1 admin, ${users.length - 1} regulares)`);
    console.log(`   - ${users.length - 1} Membresías`);
    
  } catch (error) {
    console.error('❌ Error durante el seed:', error);
    throw error;
  } finally {
    await db.$disconnect();
  }
}

simpleSeed();