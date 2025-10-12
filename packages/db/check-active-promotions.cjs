#!/usr/bin/env node

/**
 * 🔍 SCRIPT: Verificar promociones activas en la base de datos
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkActivePromotions() {
  console.log('🔍 [CHECK-PROMOTIONS] Verificando promociones activas...\n');

  try {
    const promotions = await prisma.promotion.findMany({
      where: {
        status: 'ACTIVE'
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (promotions.length === 0) {
      console.log('❌ [CHECK-PROMOTIONS] No se encontraron promociones activas');
      return;
    }

    console.log(`✅ [CHECK-PROMOTIONS] Se encontraron ${promotions.length} promociones activas:\n`);

    promotions.forEach((promo, index) => {
      console.log(`${index + 1}. 📝 ${promo.name}`);
      console.log(`   Código: ${promo.code || 'Sin código'}`);
      console.log(`   Tipo: ${promo.type}`);
      console.log(`   Recompensa: ${JSON.stringify(promo.rewards)}`);
      console.log(`   Válida desde: ${promo.validFrom.toLocaleDateString()}`);
      console.log(`   Válida hasta: ${promo.validTo ? promo.validTo.toLocaleDateString() : 'Sin límite'}`);
      console.log(`   Usos: ${promo.usageCount}${promo.usageLimit ? ` / ${promo.usageLimit}` : ''}`);
      console.log(`   Condiciones: ${JSON.stringify(promo.conditions)}`);
      console.log('');
    });

    // Buscar específicamente códigos de descuento
    const discountCodes = promotions.filter(p => 
      p.type === 'DISCOUNT_CODE' && p.code
    );

    if (discountCodes.length > 0) {
      console.log('🎁 [CHECK-PROMOTIONS] Códigos de descuento encontrados:');
      discountCodes.forEach(promo => {
        const rewards = promo.rewards;
        let discountInfo = '';
        
        if (rewards.type === 'DISCOUNT_PERCENTAGE') {
          discountInfo = `${rewards.value}% de descuento`;
        } else if (rewards.type === 'DISCOUNT_FIXED') {
          discountInfo = `€${rewards.value} de descuento`;
        }
        
        console.log(`   📋 ${promo.code}: ${discountInfo}`);
      });
      console.log('');
    }

  } catch (error) {
    console.error('❌ [CHECK-PROMOTIONS] Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkActivePromotions().catch(console.error);
