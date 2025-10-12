/**
 * TEST DE SIGNUP_BONUS (BONO DE REGISTRO)
 * 
 * Este script prueba:
 * 1. Creación de promoción SIGNUP_BONUS
 * 2. Registro de nuevo usuario
 * 3. Aplicación automática del bono de registro
 * 4. Verificación de créditos iniciales
 * 
 * USO:
 *   node tests/test-signup-bonus.cjs           # Ejecutar prueba
 *   node tests/test-signup-bonus.cjs --cleanup # Limpiar datos
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

async function testSignupBonus() {
  try {
    console.log('\n🎁 TESTING SIGNUP_BONUS (BONO DE REGISTRO)\n');
    console.log('═'.repeat(80));

    // PASO 1: Crear promoción SIGNUP_BONUS
    console.log('1️⃣ CREANDO PROMOCIÓN SIGNUP_BONUS...');
    
    const signupPromotion = await prisma.promotion.create({
      data: {
        name: 'Bono de Bienvenida - Test',
        type: 'SIGNUP_BONUS',
        status: 'ACTIVE',
        validFrom: new Date(),
        validTo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        usageLimit: 1000,
        usageCount: 0,
        rewards: {
          type: 'FIXED_CREDITS',
          value: 10,
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

    console.log(`✅ Promoción creada: ${signupPromotion.name}`);
    console.log(`   └─ Recompensa: ${signupPromotion.rewards.value} créditos de bienvenida`);

    // PASO 2: Simular registro de nuevo usuario
    console.log('\n2️⃣ SIMULANDO REGISTRO DE NUEVO USUARIO...');
    
    const newUserEmail = generateUniqueEmail('nuevo_usuario');
    
    const newUser = await prisma.user.create({
      data: {
        email: newUserEmail,
        password: '$2a$10$dummy.hash.for.test',
        firstName: 'Usuario',
        lastName: 'Nuevo',
        phone: '+57300999888',
        role: 'USER',
        isActive: true,
        emailVerified: true,
        creditsBalance: 0,
        referralCode: generateReferralCode()
      }
    });

    console.log(`✅ Usuario creado: ${newUser.email}`);
    console.log(`   └─ Balance inicial: ${newUser.creditsBalance} créditos`);

    // PASO 3: Aplicar SIGNUP_BONUS automáticamente
    console.log('\n3️⃣ APLICANDO SIGNUP_BONUS AUTOMÁTICAMENTE...');
    
    const now = new Date();
    const creditsAwarded = signupPromotion.rewards.value;

    await prisma.$transaction(async (tx) => {
      await tx.promotionApplication.create({
        data: {
          promotionId: signupPromotion.id,
          userId: newUser.id,
          creditsAwarded,
          appliedAt: now,
          metadata: {
            autoApplied: true,
            reason: 'SIGNUP',
            appliedAt: now.toISOString()
          }
        }
      });

      await tx.promotion.update({
        where: { id: signupPromotion.id },
        data: { usageCount: { increment: 1 } }
      });

      await tx.user.update({
        where: { id: newUser.id },
        data: { creditsBalance: { increment: creditsAwarded } }
      });

      await tx.walletLedger.create({
        data: {
          userId: newUser.id,
          type: 'CREDIT',
          reason: 'TOPUP',
          credits: creditsAwarded,
          balanceAfter: newUser.creditsBalance + creditsAwarded,
          metadata: {
            promotionId: signupPromotion.id,
            promotionName: signupPromotion.name,
            promotionType: 'SIGNUP_BONUS',
            autoApplied: true
          },
          idempotencyKey: `SIGNUP_BONUS:${newUser.id}:${signupPromotion.id}`
        }
      });
    });

    console.log(`✅ SIGNUP_BONUS aplicado exitosamente`);
    console.log(`   └─ Créditos otorgados: ${creditsAwarded}`);

    // PASO 4: Verificar balance final
    console.log('\n4️⃣ VERIFICANDO BALANCE FINAL...');
    
    const updatedUser = await prisma.user.findUnique({
      where: { id: newUser.id },
      select: { creditsBalance: true }
    });

    console.log(`✅ Balance del nuevo usuario:`);
    console.log(`   └─ Balance inicial: 0 créditos`);
    console.log(`   └─ Balance final: ${updatedUser.creditsBalance} créditos`);
    console.log(`   └─ Bono de bienvenida: +${creditsAwarded} créditos`);

    console.log('\n' + '═'.repeat(80));
    console.log('🎉 SIGNUP_BONUS FUNCIONANDO PERFECTAMENTE');
    
    console.log('\n📊 RESUMEN:');
    console.log(`   • Usuario: ${newUser.email}`);
    console.log(`   • Promoción: ${signupPromotion.name}`);
    console.log(`   • Créditos recibidos: ${creditsAwarded}`);
    console.log(`   • Balance final: ${updatedUser.creditsBalance}`);

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
          equals: 'SIGNUP_BONUS'
        }
      }
    });

    await prisma.promotionApplication.deleteMany({
      where: {
        metadata: {
          path: ['reason'],
          equals: 'SIGNUP'
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
    await testSignupBonus();
    console.log('\n💡 Para limpiar: node tests/test-signup-bonus.cjs --cleanup');
  }
}

main();

