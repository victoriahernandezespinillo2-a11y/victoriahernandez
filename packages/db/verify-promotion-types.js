/**
 * Script de verificación: Comprobar que los nuevos tipos de promoción existen en la base de datos
 * Este script consulta directamente la base de datos para verificar el enum PromotionType
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verifyPromotionTypes() {
  console.log('🔍 Verificando tipos de promoción en la base de datos...\n');

  try {
    // Consulta directa al enum en PostgreSQL
    const result = await prisma.$queryRaw`
      SELECT unnest(enum_range(NULL::"PromotionType"))::text as type
    `;

    console.log('✅ Tipos de promoción encontrados en la base de datos:');
    console.log('='.repeat(60));
    
    result.forEach((row, index) => {
      const icon = index < 4 ? '✅' : '🆕';
      console.log(`${icon} ${row.type}`);
    });

    console.log('='.repeat(60));
    console.log(`\n📊 Total de tipos: ${result.length}`);

    // Verificar que los nuevos tipos existen
    const types = result.map(r => r.type);
    const expectedNewTypes = ['REFERRAL_BONUS', 'DISCOUNT_CODE'];
    const foundNewTypes = expectedNewTypes.filter(t => types.includes(t));

    console.log('\n🎯 Verificación de nuevos tipos:');
    expectedNewTypes.forEach(type => {
      const found = types.includes(type);
      console.log(`  ${found ? '✅' : '❌'} ${type}: ${found ? 'ENCONTRADO' : 'NO ENCONTRADO'}`);
    });

    if (foundNewTypes.length === expectedNewTypes.length) {
      console.log('\n🎉 ¡ÉXITO! Todos los tipos de promoción están correctamente configurados.');
      console.log('\n📋 Tipos disponibles:');
      console.log('  • SIGNUP_BONUS - Bono de registro');
      console.log('  • RECHARGE_BONUS - Bono de recarga');
      console.log('  • USAGE_BONUS - Bono por uso');
      console.log('  • REFERRAL_BONUS - Bono de referido (NUEVO)');
      console.log('  • DISCOUNT_CODE - Código de descuento (NUEVO)');
      console.log('  • SEASONAL - Promoción temporal');
      return true;
    } else {
      console.error('\n❌ ERROR: Faltan algunos tipos de promoción');
      return false;
    }

  } catch (error) {
    console.error('\n❌ Error al verificar tipos de promoción:', error.message);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar verificación
verifyPromotionTypes()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Error fatal:', error);
    process.exit(1);
  });


