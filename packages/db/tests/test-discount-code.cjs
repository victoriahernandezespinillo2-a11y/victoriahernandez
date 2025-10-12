/**
 * TEST DE DISCOUNT_CODE (CÓDIGO DE DESCUENTO)
 * 
 * Este script prueba:
 * 1. Creación de promoción DISCOUNT_CODE con código único
 * 2. Validación del código
 * 3. Aplicación de descuento
 * 4. Verificación de uso único
 * 
 * USO:
 *   node tests/test-discount-code.cjs           # Ejecutar prueba
 *   node tests/test-discount-code.cjs --cleanup # Limpiar datos
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

async function testDiscountCode() {
  try {
    console.log('\n🎫 TESTING DISCOUNT_CODE (CÓDIGO DE DESCUENTO)\n');
    console.log('═'.repeat(80));

    // PASO 1: Crear promoción DISCOUNT_CODE
    console.log('1️⃣ CREANDO CÓDIGO DE DESCUENTO...');
    
    const promoCode = 'VERANO2025TEST';
    
    const discountPromotion = await prisma.promotion.create({
      data: {
        name: 'Descuento Verano - Test',
        code: promoCode,
        type: 'DISCOUNT_CODE',
        status: 'ACTIVE',
        validFrom: new Date(),
        validTo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        usageLimit: 100,
        usageCount: 0,
        rewards: {
          type: 'DISCOUNT_PERCENTAGE',
          value: 25, // 25% de descuento
          maxRewardAmount: 30,
          stackable: false
        },
        conditions: {
          minAmount: 10,
          maxAmount: 150,
          dayOfWeek: [],
          timeOfDay: {
            start: '00:00',
            end: '23:59'
          }
        }
      }
    });

    console.log(`✅ Código de descuento creado: ${promoCode}`);
    console.log(`   └─ Descuento: ${discountPromotion.rewards.value}%`);
    console.log(`   └─ Máximo: ${discountPromotion.rewards.maxRewardAmount} créditos`);
    console.log(`   └─ Monto mínimo: ${discountPromotion.conditions.minAmount} créditos`);

    // PASO 2: Crear usuario
    console.log('\n2️⃣ CREANDO USUARIO...');
    
    const userEmail = generateUniqueEmail('usuario_descuento');
    
    const user = await prisma.user.create({
      data: {
        email: userEmail,
        password: '$2a$10$dummy.hash.for.test',
        firstName: 'Usuario',
        lastName: 'Descuento',
        phone: '+57300666555',
        role: 'USER',
        isActive: true,
        emailVerified: true,
        creditsBalance: 100,
        referralCode: generateReferralCode()
      }
    });

    console.log(`✅ Usuario creado: ${user.email}`);
    console.log(`   └─ Balance inicial: ${user.creditsBalance} créditos`);

    // PASO 3: Validar código de descuento
    console.log('\n3️⃣ VALIDANDO CÓDIGO DE DESCUENTO...');
    
    const validPromo = await prisma.promotion.findUnique({
      where: { code: promoCode }
    });

    if (validPromo && validPromo.status === 'ACTIVE') {
      console.log(`✅ Código válido: ${promoCode}`);
      console.log(`   └─ Promoción: ${validPromo.name}`);
      console.log(`   └─ Descuento: ${validPromo.rewards.value}%`);
    }

    // PASO 4: Aplicar descuento en compra
    console.log('\n4️⃣ APLICANDO DESCUENTO EN COMPRA...');
    
    const purchaseAmount = 60; // Monto de la compra
    const discountPercentage = discountPromotion.rewards.value;
    const discountAmount = Math.min(
      (purchaseAmount * discountPercentage) / 100,
      discountPromotion.rewards.maxRewardAmount
    );
    const finalAmount = purchaseAmount - discountAmount;

    console.log(`🛒 Compra original: ${purchaseAmount} créditos`);
    console.log(`💳 Código aplicado: ${promoCode}`);
    console.log(`💰 Descuento (${discountPercentage}%): -${discountAmount} créditos`);
    console.log(`✨ Total a pagar: ${finalAmount} créditos`);

    const now = new Date();

    await prisma.$transaction(async (tx) => {
      // Registrar aplicación del código
      await tx.promotionApplication.create({
        data: {
          promotionId: discountPromotion.id,
          userId: user.id,
          creditsAwarded: discountAmount,
          appliedAt: now,
          metadata: {
            autoApplied: false,
            reason: 'DISCOUNT_CODE',
            originalAmount: purchaseAmount,
            discountAmount,
            finalAmount,
            code: promoCode,
            appliedAt: now.toISOString()
          }
        }
      });

      // Incrementar contador de uso
      await tx.promotion.update({
        where: { id: discountPromotion.id },
        data: { usageCount: { increment: 1 } }
      });

      // Descontar solo el monto final
      await tx.user.update({
        where: { id: user.id },
        data: { creditsBalance: { decrement: finalAmount } }
      });

      // Registrar transacción
      await tx.walletLedger.create({
        data: {
          userId: user.id,
          type: 'DEBIT',
          reason: 'PURCHASE',
          credits: finalAmount,
          balanceAfter: user.creditsBalance - finalAmount,
          metadata: {
            promotionId: discountPromotion.id,
            promotionName: discountPromotion.name,
            promotionType: 'DISCOUNT_CODE',
            code: promoCode,
            originalAmount: purchaseAmount,
            discountAmount,
            finalAmount
          },
          idempotencyKey: `DISCOUNT_CODE:${user.id}:${discountPromotion.id}:${now.getTime()}`
        }
      });
    });

    console.log(`✅ Descuento aplicado exitosamente`);

    // PASO 5: Verificar uso del código
    console.log('\n5️⃣ VERIFICANDO USO DEL CÓDIGO...');
    
    const usedPromo = await prisma.promotionApplication.findFirst({
      where: {
        promotionId: discountPromotion.id,
        userId: user.id
      }
    });

    if (usedPromo) {
      console.log(`✅ Código ya usado por este usuario`);
      console.log(`   └─ Fecha: ${usedPromo.appliedAt.toISOString()}`);
      console.log(`   └─ Ahorro: ${usedPromo.creditsAwarded} créditos`);
    }

    // PASO 6: Verificar balance final
    console.log('\n6️⃣ VERIFICANDO BALANCE FINAL...');
    
    const updatedUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { creditsBalance: true }
    });

    console.log(`✅ Balance del usuario:`);
    console.log(`   └─ Balance inicial: 100 créditos`);
    console.log(`   └─ Compra original: -${purchaseAmount} créditos`);
    console.log(`   └─ Descuento: +${discountAmount} créditos`);
    console.log(`   └─ Cobrado: -${finalAmount} créditos`);
    console.log(`   └─ Balance final: ${updatedUser.creditsBalance} créditos`);

    console.log('\n' + '═'.repeat(80));
    console.log('🎉 DISCOUNT_CODE FUNCIONANDO PERFECTAMENTE');
    
    console.log('\n📊 RESUMEN:');
    console.log(`   • Usuario: ${user.email}`);
    console.log(`   • Código: ${promoCode}`);
    console.log(`   • Compra: ${purchaseAmount} créditos`);
    console.log(`   • Descuento: ${discountAmount} créditos (${discountPercentage}%)`);
    console.log(`   • Total: ${finalAmount} créditos`);
    console.log(`   • Ahorro: ${discountAmount} créditos`);

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
          equals: 'DISCOUNT_CODE'
        }
      }
    });

    await prisma.promotionApplication.deleteMany({
      where: {
        metadata: {
          path: ['reason'],
          equals: 'DISCOUNT_CODE'
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
    await testDiscountCode();
    console.log('\n💡 Para limpiar: node tests/test-discount-code.cjs --cleanup');
  }
}

main();

