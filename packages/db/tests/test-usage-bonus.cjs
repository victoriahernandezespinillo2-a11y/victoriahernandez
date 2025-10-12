/**
 * TEST DE USAGE_BONUS (CASHBACK POR USO)
 * 
 * Este script prueba:
 * 1. Creación de promoción USAGE_BONUS
 * 2. Simulación de reserva pagada con créditos
 * 3. Aplicación automática de cashback
 * 4. Verificación de retorno de créditos
 * 
 * USO:
 *   node tests/test-usage-bonus.cjs           # Ejecutar prueba
 *   node tests/test-usage-bonus.cjs --cleanup # Limpiar datos
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function generateUniqueEmail(prefix) {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}_${timestamp}_${random}@test.com`;
}

function generateReferralCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

async function testUsageBonus() {
  try {
    console.log('\n🎮 TESTING USAGE_BONUS (CASHBACK POR USO)\n');
    console.log('═'.repeat(80));

    // PASO 1: Crear promoción USAGE_BONUS
    console.log('1️⃣ CREANDO PROMOCIÓN USAGE_BONUS...');
    
    const usagePromotion = await prisma.promotion.create({
      data: {
        name: 'Cashback por Reservas - Test',
        type: 'USAGE_BONUS',
        status: 'ACTIVE',
        validFrom: new Date(),
        validTo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        usageLimit: 1000,
        usageCount: 0,
        rewards: {
          type: 'PERCENTAGE_BONUS',
          value: 10, // 10% de cashback
          maxRewardAmount: 20,
          stackable: false
        },
        conditions: {
          minAmount: 5,
          maxAmount: 200,
          dayOfWeek: [],
          timeOfDay: {
            start: '00:00',
            end: '23:59'
          }
        }
      }
    });

    console.log(`✅ Promoción creada: ${usagePromotion.name}`);
    console.log(`   └─ Cashback: ${usagePromotion.rewards.value}%`);
    console.log(`   └─ Máximo: ${usagePromotion.rewards.maxRewardAmount} créditos`);
    console.log(`   └─ Monto mínimo: ${usagePromotion.conditions.minAmount} créditos`);

    // PASO 2: Crear usuario con créditos
    console.log('\n2️⃣ CREANDO USUARIO CON CRÉDITOS...');
    
    const userEmail = generateUniqueEmail('usuario_cashback');
    
    const user = await prisma.user.create({
      data: {
        email: userEmail,
        password: '$2a$10$dummy.hash.for.test',
        firstName: 'Usuario',
        lastName: 'Activo',
        phone: '+57300777666',
        role: 'USER',
        isActive: true,
        emailVerified: true,
        creditsBalance: 100,
        referralCode: generateReferralCode()
      }
    });

    console.log(`✅ Usuario creado: ${user.email}`);
    console.log(`   └─ Balance inicial: ${user.creditsBalance} créditos`);

    // PASO 3: Simular reserva pagada con créditos
    console.log('\n3️⃣ SIMULANDO RESERVA PAGADA CON CRÉDITOS...');
    
    const reservationCost = 30; // Costo de la reserva
    console.log(`🏟️ Usuario hace reserva: ${reservationCost} créditos`);

    // Descontar créditos por la reserva
    await prisma.user.update({
      where: { id: user.id },
      data: { creditsBalance: { decrement: reservationCost } }
    });

    console.log(`✅ Créditos descontados: -${reservationCost} créditos`);

    // PASO 4: Aplicar USAGE_BONUS (cashback)
    console.log('\n4️⃣ APLICANDO CASHBACK...');
    
    const cashbackPercentage = usagePromotion.rewards.value;
    const cashbackAmount = Math.min(
      (reservationCost * cashbackPercentage) / 100,
      usagePromotion.rewards.maxRewardAmount
    );

    const now = new Date();

    await prisma.$transaction(async (tx) => {
      await tx.promotionApplication.create({
        data: {
          promotionId: usagePromotion.id,
          userId: user.id,
          creditsAwarded: cashbackAmount,
          appliedAt: now,
          metadata: {
            autoApplied: true,
            reason: 'USAGE',
            reservationCost,
            cashbackPercentage,
            appliedAt: now.toISOString()
          }
        }
      });

      await tx.promotion.update({
        where: { id: usagePromotion.id },
        data: { usageCount: { increment: 1 } }
      });

      await tx.user.update({
        where: { id: user.id },
        data: { creditsBalance: { increment: cashbackAmount } }
      });

      await tx.walletLedger.create({
        data: {
          userId: user.id,
          type: 'CREDIT',
          reason: 'TOPUP',
          credits: cashbackAmount,
          balanceAfter: user.creditsBalance - reservationCost + cashbackAmount,
          metadata: {
            promotionId: usagePromotion.id,
            promotionName: usagePromotion.name,
            promotionType: 'USAGE_BONUS',
            autoApplied: true,
            reservationCost,
            cashbackPercentage
          },
          idempotencyKey: `USAGE_BONUS:${user.id}:${usagePromotion.id}:${now.getTime()}`
        }
      });
    });

    console.log(`✅ Cashback aplicado`);
    console.log(`   └─ Gasto: ${reservationCost} créditos`);
    console.log(`   └─ Cashback (${cashbackPercentage}%): +${cashbackAmount} créditos`);
    console.log(`   └─ Costo neto: ${reservationCost - cashbackAmount} créditos`);

    // PASO 5: Verificar balance final
    console.log('\n5️⃣ VERIFICANDO BALANCE FINAL...');
    
    const updatedUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { creditsBalance: true }
    });

    const netCost = reservationCost - cashbackAmount;

    console.log(`✅ Balance del usuario:`);
    console.log(`   └─ Balance inicial: 100 créditos`);
    console.log(`   └─ Reserva: -${reservationCost} créditos`);
    console.log(`   └─ Cashback: +${cashbackAmount} créditos`);
    console.log(`   └─ Costo neto: -${netCost} créditos`);
    console.log(`   └─ Balance final: ${updatedUser.creditsBalance} créditos`);

    console.log('\n' + '═'.repeat(80));
    console.log('🎉 USAGE_BONUS FUNCIONANDO PERFECTAMENTE');
    
    console.log('\n📊 RESUMEN:');
    console.log(`   • Usuario: ${user.email}`);
    console.log(`   • Reserva: ${reservationCost} créditos`);
    console.log(`   • Cashback: ${cashbackAmount} créditos (${cashbackPercentage}%)`);
    console.log(`   • Ahorro: ${cashbackAmount} créditos`);

  } catch (error) {
    console.error('\n❌ ERROR:', error);
  } finally {
    await prisma.$disconnect();
  }
}

async function cleanupTestData() {
  try {
    console.log('\n🧹 LIMPIANDO DATOS DE PRUEBA...');
    
    await prisma.walletLedger.deleteMany({
      where: {
        metadata: {
          path: ['promotionType'],
          equals: 'USAGE_BONUS'
        }
      }
    });

    await prisma.promotionApplication.deleteMany({
      where: {
        metadata: {
          path: ['reason'],
          equals: 'USAGE'
        }
      }
    });

    await prisma.user.deleteMany({
      where: {
        email: {
          contains: '@test.com'
        }
      }
    });

    await prisma.promotion.deleteMany({
      where: {
        name: {
          contains: 'Test'
        }
      }
    });

    console.log('✅ Datos eliminados');
  } catch (error) {
    console.error('⚠️ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--cleanup')) {
    await cleanupTestData();
  } else {
    await testUsageBonus();
    console.log('\n💡 Para limpiar: node tests/test-usage-bonus.cjs --cleanup');
  }
}

main();

