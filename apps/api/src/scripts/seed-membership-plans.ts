/**
 * Script para insertar planes de membresía por defecto
 * Ejecutar después de crear la tabla membership_plans
 */

import { db } from '@repo/db';

const defaultPlans = [
  {
    name: 'Básica',
    type: 'BASIC',
    monthlyPrice: 29.99,
    description: 'Plan básico con descuentos mínimos',
    benefits: {
      discountPercentage: 5,
      priorityBooking: false,
      freeHours: 0,
      guestPasses: 0,
      accessToEvents: false,
      personalTrainer: false,
    },
    isActive: true,
    isPopular: false,
    sortOrder: 1,
  },
  {
    name: 'Premium',
    type: 'PREMIUM',
    monthlyPrice: 49.99,
    description: 'Plan premium con beneficios intermedios',
    benefits: {
      discountPercentage: 15,
      priorityBooking: true,
      freeHours: 2,
      guestPasses: 2,
      accessToEvents: true,
      personalTrainer: false,
    },
    isActive: true,
    isPopular: true,
    sortOrder: 2,
  },
  {
    name: 'VIP',
    type: 'VIP',
    monthlyPrice: 79.99,
    description: 'Plan VIP con todos los beneficios',
    benefits: {
      discountPercentage: 25,
      priorityBooking: true,
      freeHours: 5,
      guestPasses: 5,
      accessToEvents: true,
      personalTrainer: true,
    },
    isActive: true,
    isPopular: false,
    sortOrder: 3,
  },
];

async function seedMembershipPlans() {
  try {
    console.log('🌱 [SEED] Iniciando inserción de planes de membresía...');

    // Verificar si ya existen planes
    const existingPlans = await db.membershipPlan.count();
    if (existingPlans > 0) {
      console.log(`⚠️ [SEED] Ya existen ${existingPlans} planes de membresía. Saltando inserción.`);
      return;
    }

    // Insertar planes por defecto
    const createdPlans = await db.membershipPlan.createMany({
      data: defaultPlans,
    });

    console.log(`✅ [SEED] Insertados ${createdPlans.count} planes de membresía por defecto`);

    // Mostrar los planes creados
    const plans = await db.membershipPlan.findMany({
      orderBy: { sortOrder: 'asc' },
    });

    console.log('📋 [SEED] Planes creados:');
    plans.forEach(plan => {
      console.log(`  - ${plan.name} (${plan.type}): ${plan.monthlyPrice}€/mes`);
    });

  } catch (error) {
    console.error('❌ [SEED] Error insertando planes de membresía:', error);
    throw error;
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  seedMembershipPlans()
    .then(() => {
      console.log('✅ [SEED] Script completado exitosamente');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ [SEED] Script falló:', error);
      process.exit(1);
    });
}

export { seedMembershipPlans };
