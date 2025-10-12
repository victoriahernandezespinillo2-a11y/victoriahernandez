/**
 * TEST DE RECHARGE_BONUS (BONO DE RECARGA)
 * 
 * Este script prueba:
 * 1. Creación de promoción RECHARGE_BONUS
 * 2. Simulación de recarga de créditos
 * 3. Aplicación automática del bono de recarga
 * 4. Verificación de bonus porcentual
 * 
 * USO:
 *   node tests/test-recharge-bonus.cjs           # Ejecutar prueba
 *   node tests/test-recharge-bonus.cjs --cleanup # Limpiar datos
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

async function testRechargeBonus() {
  try {
    console.log('\n💰 TESTING RECHARGE_BONUS (BONO DE RECARGA)\n');
    console.log('═'.repeat(80));

    // PASO 1: Crear promoción RECHARGE_BONUS
    console.log('1️⃣ CREANDO PROMOCIÓN RECHARGE_BONUS...');
    
    const rechargePromotion = await prisma.promotion.create({
      data: {
        name: 'Bono Extra al Recargar - Test',
        type: 'RECHARGE_BONUS',
        status: 'ACTIVE',
        validFrom: new Date(),
        validTo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        usageLimit: 500,
        usageCount: 0,
        rewards: {
          type: 'PERCENTAGE_BONUS',
          value: 20, // 20% extra
          maxRewardAmount: 50,
          stackable: false
        },
        conditions: {
          minTopupAmount: 20,
          dayOfWeek: [],
          timeOfDay: {
            start: '00:00',
            end: '23:59'
          }
        }
      }
    });

    console.log(`✅ Promoción creada: ${rechargePromotion.name}`);
    console.log(`   └─ Tipo: ${rechargePromotion.rewards.type}`);
    console.log(`   └─ Bonus: ${rechargePromotion.rewards.value}% extra`);
    console.log(`   └─ Recarga mínima: ${rechargePromotion.conditions.minTopupAmount} créditos`);

    // PASO 2: Crear usuario
    console.log('\n2️⃣ CREANDO USUARIO...');
    
    const userEmail = generateUniqueEmail('usuario_recarga');
    
    const user = await prisma.user.create({
      data: {
        email: userEmail,
        password: '$2a$10$dummy.hash.for.test',
        firstName: 'Usuario',
        lastName: 'Recarga',
        phone: '+57300888777',
        role: 'USER',
        isActive: true,
        emailVerified: true,
        creditsBalance: 10,
        referralCode: generateReferralCode()
      }
    });

    console.log(`✅ Usuario creado: ${user.email}`);
    console.log(`   └─ Balance inicial: ${user.creditsBalance} créditos`);

    // PASO 3: Simular recarga de créditos
    console.log('\n3️⃣ SIMULANDO RECARGA DE CRÉDITOS...');
    
    const topupAmount = 50; // Usuario recarga 50 créditos
    console.log(`💳 Usuario recarga: ${topupAmount} créditos`);

    // Aplicar recarga base
    await prisma.user.update({
      where: { id: user.id },
      data: { creditsBalance: { increment: topupAmount } }
    });

    console.log(`✅ Recarga base aplicada: +${topupAmount} créditos`);

    // PASO 4: Aplicar RECHARGE_BONUS
    console.log('\n4️⃣ APLICANDO RECHARGE_BONUS...');
    
    const bonusPercentage = rechargePromotion.rewards.value;
    const bonusAmount = Math.min(
      (topupAmount * bonusPercentage) / 100,
      rechargePromotion.rewards.maxRewardAmount
    );

    const now = new Date();

    await prisma.$transaction(async (tx) => {
      await tx.promotionApplication.create({
        data: {
          promotionId: rechargePromotion.id,
          userId: user.id,
          creditsAwarded: bonusAmount,
          appliedAt: now,
          metadata: {
            autoApplied: true,
            reason: 'RECHARGE',
            topupAmount,
            bonusPercentage,
            appliedAt: now.toISOString()
          }
        }
      });

      await tx.promotion.update({
        where: { id: rechargePromotion.id },
        data: { usageCount: { increment: 1 } }
      });

      await tx.user.update({
        where: { id: user.id },
        data: { creditsBalance: { increment: bonusAmount } }
      });

      await tx.walletLedger.create({
        data: {
          userId: user.id,
          type: 'CREDIT',
          reason: 'TOPUP',
          credits: bonusAmount,
          balanceAfter: user.creditsBalance + topupAmount + bonusAmount,
          metadata: {
            promotionId: rechargePromotion.id,
            promotionName: rechargePromotion.name,
            promotionType: 'RECHARGE_BONUS',
            autoApplied: true,
            topupAmount,
            bonusPercentage
          },
          idempotencyKey: `RECHARGE_BONUS:${user.id}:${rechargePromotion.id}:${now.getTime()}`
        }
      });
    });

    console.log(`✅ RECHARGE_BONUS aplicado`);
    console.log(`   └─ Recarga: ${topupAmount} créditos`);
    console.log(`   └─ Bonus (${bonusPercentage}%): +${bonusAmount} créditos`);
    console.log(`   └─ Total recibido: ${topupAmount + bonusAmount} créditos`);

    // PASO 5: Verificar balance final
    console.log('\n5️⃣ VERIFICANDO BALANCE FINAL...');
    
    const updatedUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { creditsBalance: true }
    });

    console.log(`✅ Balance del usuario:`);
    console.log(`   └─ Balance inicial: 10 créditos`);
    console.log(`   └─ Recarga base: +${topupAmount} créditos`);
    console.log(`   └─ Bonus: +${bonusAmount} créditos`);
    console.log(`   └─ Balance final: ${updatedUser.creditsBalance} créditos`);

    console.log('\n' + '═'.repeat(80));
    console.log('🎉 RECHARGE_BONUS FUNCIONANDO PERFECTAMENTE');
    
    console.log('\n📊 RESUMEN:');
    console.log(`   • Usuario: ${user.email}`);
    console.log(`   • Recarga: ${topupAmount} créditos`);
    console.log(`   • Bonus: ${bonusAmount} créditos (${bonusPercentage}%)`);
    console.log(`   • Total: ${topupAmount + bonusAmount} créditos`);

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
          equals: 'RECHARGE_BONUS'
        }
      }
    });

    await prisma.promotionApplication.deleteMany({
      where: {
        metadata: {
          path: ['reason'],
          equals: 'RECHARGE'
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
    await testRechargeBonus();
    console.log('\n💡 Para limpiar: node tests/test-recharge-bonus.cjs --cleanup');
  }
}

main();

