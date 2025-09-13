/**
 * Script para poblar la base de datos con planes de membresía reales
 * Ejecutar con: node seed-memberships.cjs
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const membershipPlans = [
  {
    name: 'Plan Básico',
    type: 'BASIC',
    monthlyPrice: 15.00, // €15.00
    description: 'Perfecto para usuarios ocasionales',
    benefits: {
      discountPercentage: 5,
      maxReservations: 5,
      priorityBooking: false,
      freeHours: 0,
      guestPasses: 0,
      accessToEvents: false,
      personalTrainer: false,
      features: [
        'Reservas hasta 5 por mes',
        'Descuento del 5% en servicios',
        'Acceso a instalaciones básicas',
        'Soporte por email'
      ]
    },
    isActive: true,
    isPopular: false,
    sortOrder: 1
  },
  {
    name: 'Plan Premium',
    type: 'PREMIUM', 
    monthlyPrice: 25.00, // €25.00
    description: 'Ideal para deportistas regulares',
    benefits: {
      discountPercentage: 10,
      maxReservations: 15,
      priorityBooking: true,
      freeHours: 2,
      guestPasses: 2,
      accessToEvents: true,
      personalTrainer: false,
      features: [
        'Reservas hasta 15 por mes',
        'Descuento del 10% en servicios',
        'Reserva prioritaria',
        '2 horas gratis al mes',
        '2 pases para invitados',
        'Acceso a eventos especiales',
        'Soporte prioritario'
      ]
    },
    isActive: true,
    isPopular: true,
    sortOrder: 2
  },
  {
    name: 'Plan VIP',
    type: 'VIP',
    monthlyPrice: 50.00, // €50.00
    description: 'Para los más exigentes',
    benefits: {
      discountPercentage: 20,
      maxReservations: -1, // Ilimitadas
      priorityBooking: true,
      freeHours: 5,
      guestPasses: 5,
      accessToEvents: true,
      personalTrainer: true,
      features: [
        'Reservas ilimitadas',
        'Descuento del 20% en servicios',
        'Reserva prioritaria',
        '5 horas gratis al mes',
        '5 pases para invitados',
        'Acceso a eventos exclusivos',
        'Entrenador personal incluido',
        'Soporte VIP 24/7',
        'Acceso a instalaciones premium'
      ]
    },
    isActive: true,
    isPopular: false,
    sortOrder: 3
  }
];

async function seedMembershipPlans() {
  try {
    console.log('🌱 Iniciando seed de planes de membresía...');

    // Limpiar planes existentes
    console.log('🧹 Limpiando planes existentes...');
    await prisma.membershipPlan.deleteMany({});
    await prisma.membership.deleteMany({});

    // Crear planes de membresía
    console.log('📝 Creando planes de membresía...');
    for (const plan of membershipPlans) {
      const created = await prisma.membershipPlan.create({
        data: {
          name: plan.name,
          type: plan.type,
          monthlyPrice: plan.monthlyPrice,
          description: plan.description,
          benefits: plan.benefits,
          isActive: plan.isActive,
          isPopular: plan.isPopular,
          sortOrder: plan.sortOrder
        }
      });
      console.log(`✅ Plan creado: ${created.name} (${created.type}) - €${created.monthlyPrice}/mes`);
    }

    // Crear algunas membresías de ejemplo
    console.log('👥 Creando membresías de ejemplo...');
    
    // Obtener un usuario de ejemplo (crear si no existe)
    let testUser = await prisma.user.findFirst({
      where: { email: 'test@polideportivo.com' }
    });

    if (!testUser) {
      testUser = await prisma.user.create({
        data: {
          email: 'test@polideportivo.com',
          name: 'Usuario de Prueba',
          firstName: 'Usuario',
          lastName: 'Prueba',
          role: 'USER',
          isActive: true
        }
      });
      console.log('👤 Usuario de prueba creado');
    }

    // Crear membresía VIP para el usuario de prueba
    const vipPlan = await prisma.membershipPlan.findFirst({
      where: { type: 'VIP' }
    });

    if (vipPlan) {
      const membership = await prisma.membership.create({
        data: {
          userId: testUser.id,
          planId: vipPlan.id,
          type: 'ANNUAL',
          status: 'active',
          validFrom: new Date(),
          validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 año
          price: vipPlan.monthlyPrice * 12, // Precio anual
          paymentMethod: 'STRIPE',
          paymentIntentId: 'pi_test_123456789'
        }
      });
      console.log(`✅ Membresía VIP creada para ${testUser.email}`);
    }

    // Estadísticas finales
    const totalPlans = await prisma.membershipPlan.count();
    const totalMemberships = await prisma.membership.count();
    const activeMemberships = await prisma.membership.count({
      where: { status: 'active' }
    });

    console.log('\n📊 Estadísticas finales:');
    console.log(`📋 Planes de membresía: ${totalPlans}`);
    console.log(`👥 Membresías totales: ${totalMemberships}`);
    console.log(`✅ Membresías activas: ${activeMemberships}`);

    console.log('\n🎉 ¡Seed completado exitosamente!');
    console.log('💡 Ahora puedes ver los datos reales en el admin panel');

  } catch (error) {
    console.error('❌ Error durante el seed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar el seed
seedMembershipPlans()
  .then(() => {
    console.log('✅ Script completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
