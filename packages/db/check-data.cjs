const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkData() {
  console.log('🔍 Verificando datos en las tablas de landing page...\n');

  try {
    // Verificar cada tabla
    const tables = [
      { name: 'LandingHero', query: prisma.landingHero.count() },
      { name: 'LandingTestimonial', query: prisma.landingTestimonial.count() },
      { name: 'LandingSponsor', query: prisma.landingSponsor.count() },
      { name: 'LandingStat', query: prisma.landingStat.count() },
      { name: 'LandingFAQ', query: prisma.landingFAQ.count() },
      { name: 'LandingSportCategory', query: prisma.landingSportCategory.count() },
      { name: 'LandingActivity', query: prisma.landingActivity.count() },
      { name: 'LandingInfoCard', query: prisma.landingInfoCard.count() },
    ];

    for (const table of tables) {
      try {
        const count = await table.query;
        console.log(`✅ ${table.name}: ${count} registros`);
      } catch (error) {
        console.log(`❌ ${table.name}: Error - ${error.message}`);
      }
    }

    console.log('\n📊 Resumen:');
    const totalHero = await prisma.landingHero.count();
    const totalTestimonials = await prisma.landingTestimonial.count();
    const totalSponsors = await prisma.landingSponsor.count();
    const totalStats = await prisma.landingStat.count();
    const totalFaqs = await prisma.landingFAQ.count();
    const totalSports = await prisma.landingSportCategory.count();
    const totalActivities = await prisma.landingActivity.count();
    const totalInfoCards = await prisma.landingInfoCard.count();

    console.log(`Hero Slides: ${totalHero}`);
    console.log(`Testimonios: ${totalTestimonials}`);
    console.log(`Patrocinadores: ${totalSponsors}`);
    console.log(`Estadísticas: ${totalStats}`);
    console.log(`FAQs: ${totalFaqs}`);
    console.log(`Categorías Deportivas: ${totalSports}`);
    console.log(`Actividades: ${totalActivities}`);
    console.log(`Info Cards: ${totalInfoCards}`);

    const total = totalHero + totalTestimonials + totalSponsors + totalStats + totalFaqs + totalSports + totalActivities + totalInfoCards;
    console.log(`\n🎯 Total de registros: ${total}`);

    if (total === 0) {
      console.log('\n⚠️  No hay datos en las tablas. Ejecuta los scripts de seed:');
      console.log('node seed-landing.cjs');
      console.log('node seed-blog.cjs');
      console.log('node seed-sports.cjs');
      console.log('node seed-activities.cjs');
      console.log('node seed-info-cards.cjs');
    }

  } catch (error) {
    console.error('❌ Error verificando datos:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkData();
