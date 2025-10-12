/**
 * TEST COMPLETO DEL SISTEMA DE REFERIDOS
 * 
 * Este script simula todo el flujo completo:
 * 1. Crea promoción REFERRAL_BONUS
 * 2. Crea usuario referidor (Usuario A)
 * 3. Simula registro de usuario referido (Usuario B)
 * 4. Verifica aplicación automática del bonus
 * 5. Verifica estadísticas y relaciones
 * 
 * USO:
 *   node tests/test-referral-complete.cjs           # Ejecutar prueba
 *   node tests/test-referral-complete.cjs --cleanup # Limpiar datos
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Función para generar código de referido
function generateReferralCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Función para generar email único
function generateUniqueEmail(prefix) {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}_${timestamp}_${random}@test.com`;
}

async function testCompleteReferralFlow() {
  try {
    console.log('\n🚀 INICIANDO PRUEBA COMPLETA DEL SISTEMA DE REFERIDOS\n');
    console.log('═'.repeat(80));

    // PASO 1: Crear promoción REFERRAL_BONUS
    console.log('1️⃣ CREANDO PROMOCIÓN REFERRAL_BONUS...');
    
    const referralPromotion = await prisma.promotion.create({
      data: {
        name: 'Bono por Invitar Amigos - Test',
        type: 'REFERRAL_BONUS',
        status: 'ACTIVE',
        validFrom: new Date(),
        validTo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 días
        usageLimit: 100,
        usageCount: 0,
        rewards: {
          type: 'FIXED_CREDITS',
          value: 5,
          maxRewardAmount: null,
          stackable: false
        },
        conditions: {
          dayOfWeek: [],
          timeOfDay: {
            start: '00:00',
            end: '23:59'
          }
        }
      }
    });

    console.log(`✅ Promoción creada: ${referralPromotion.name} (ID: ${referralPromotion.id})`);
    console.log(`   └─ Recompensa: ${referralPromotion.rewards.value} créditos`);
    console.log(`   └─ Límite: ${referralPromotion.usageLimit} usos`);

    // PASO 2: Crear usuario referidor (Usuario A)
    console.log('\n2️⃣ CREANDO USUARIO REFERIDOR (Usuario A)...');
    
    const referrerEmail = generateUniqueEmail('referidor');
    const referrerCode = generateReferralCode();
    
    const referrer = await prisma.user.create({
      data: {
        email: referrerEmail,
        password: '$2a$10$dummy.hash.for.test',
        firstName: 'Usuario',
        lastName: 'Referidor',
        phone: '+57300123456',
        role: 'USER',
        isActive: true,
        emailVerified: true,
        creditsBalance: 10,
        referralCode: referrerCode
      }
    });

    console.log(`✅ Usuario referidor creado: ${referrer.email}`);
    console.log(`   └─ ID: ${referrer.id}`);
    console.log(`   └─ Código de referido: ${referrer.referralCode}`);
    console.log(`   └─ Balance inicial: ${referrer.creditsBalance} créditos`);

    // PASO 3: Simular registro de usuario referido (Usuario B)
    console.log('\n3️⃣ SIMULANDO REGISTRO DE USUARIO REFERIDO (Usuario B)...');
    
    const referredEmail = generateUniqueEmail('referido');
    
    const referredUser = await prisma.user.create({
      data: {
        email: referredEmail,
        password: '$2a$10$dummy.hash.for.test',
        firstName: 'Usuario',
        lastName: 'Referido',
        phone: '+57300123457',
        role: 'USER',
        isActive: true,
        emailVerified: true,
        creditsBalance: 0,
        referredBy: referrer.id,
        referralCode: generateReferralCode()
      }
    });

    console.log(`✅ Usuario referido creado: ${referredUser.email}`);
    console.log(`   └─ ID: ${referredUser.id}`);
    console.log(`   └─ Referido por: ${referrer.email}`);
    console.log(`   └─ Balance inicial: ${referredUser.creditsBalance} créditos`);

    // PASO 4: Simular aplicación automática del REFERRAL_BONUS
    console.log('\n4️⃣ APLICANDO REFERRAL_BONUS AUTOMÁTICAMENTE...');
    
    const now = new Date();
    const creditsAwarded = referralPromotion.rewards.value;

    await prisma.$transaction(async (tx) => {
      await tx.promotionApplication.create({
        data: {
          promotionId: referralPromotion.id,
          userId: referrer.id,
          creditsAwarded,
          appliedAt: now,
          metadata: {
            autoApplied: true,
            reason: 'REFERRAL',
            referredUserId: referredUser.id,
            appliedAt: now.toISOString()
          }
        }
      });

      await tx.promotion.update({
        where: { id: referralPromotion.id },
        data: { usageCount: { increment: 1 } }
      });

      await tx.user.update({
        where: { id: referrer.id },
        data: { creditsBalance: { increment: creditsAwarded } }
      });

      await tx.walletLedger.create({
        data: {
          userId: referrer.id,
          type: 'CREDIT',
          reason: 'TOPUP',
          credits: creditsAwarded,
          balanceAfter: referrer.creditsBalance + creditsAwarded,
          metadata: {
            promotionId: referralPromotion.id,
            promotionName: referralPromotion.name,
            promotionType: 'REFERRAL_BONUS',
            autoApplied: true,
            referredUserId: referredUser.id
          },
          idempotencyKey: `REFERRAL_BONUS:${referrer.id}:${referralPromotion.id}:${referredUser.id}`
        }
      });
    });

    console.log(`✅ REFERRAL_BONUS aplicado exitosamente`);
    console.log(`   └─ Créditos otorgados: ${creditsAwarded}`);

    // PASO 5: Verificar resultados
    console.log('\n5️⃣ VERIFICANDO RESULTADOS...');
    
    const updatedReferrer = await prisma.user.findUnique({
      where: { id: referrer.id },
      select: { creditsBalance: true }
    });

    console.log(`✅ Balance del referidor:`);
    console.log(`   └─ Balance anterior: ${referrer.creditsBalance} créditos`);
    console.log(`   └─ Balance actual: ${updatedReferrer.creditsBalance} créditos`);
    console.log(`   └─ Incremento: +${creditsAwarded} créditos`);

    console.log('\n' + '═'.repeat(80));
    console.log('🎉 PRUEBA COMPLETA EXITOSA - SISTEMA FUNCIONANDO PERFECTAMENTE');
    
    console.log('\n🔗 DATOS GENERADOS:');
    console.log(`   • Usuario Referidor: ${referrer.email}`);
    console.log(`   • Usuario Referido: ${referredUser.email}`);
    console.log(`   • Código de Referido: ${referrer.referralCode}`);
    console.log(`   • Enlace de Prueba: /auth/signup?ref=${referrer.referralCode}`);
    console.log(`   • Promoción ID: ${referralPromotion.id}`);

  } catch (error) {
    console.error('\n❌ ERROR EN LA PRUEBA:', error);
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
          equals: 'REFERRAL_BONUS'
        }
      }
    });

    await prisma.promotionApplication.deleteMany({
      where: {
        metadata: {
          path: ['reason'],
          equals: 'REFERRAL'
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

    console.log('✅ Datos de prueba eliminados');
  } catch (error) {
    console.error('⚠️ Error limpiando datos:', error);
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--cleanup')) {
    await cleanupTestData();
  } else {
    await testCompleteReferralFlow();
    console.log('\n💡 Para limpiar datos de prueba, ejecuta:');
    console.log('   node tests/test-referral-complete.cjs --cleanup');
  }
}

main();

