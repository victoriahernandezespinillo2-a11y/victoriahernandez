import { db } from '@repo/db';

async function checkCourtPricing() {
  console.log('🔍 Verificando configuración de precios de la cancha TEST 1 NO UTILIZAR...\n');

  try {
    // Buscar la cancha
    const court = await db.court.findFirst({
      where: {
        name: {
          contains: 'TEST 1',
          mode: 'insensitive',
        },
      },
      include: {
        sportPricing: true,
      },
    });

    if (!court) {
      console.error('❌ No se encontró la cancha TEST 1 NO UTILIZAR');
      return;
    }

    console.log('✅ Cancha encontrada:');
    console.log(`   ID: ${court.id}`);
    console.log(`   Nombre: ${court.name}`);
    console.log(`   Es multiuso: ${court.isMultiuse}`);
    console.log(`   Deporte principal: ${court.primarySport}`);
    console.log(`   Deportes permitidos: ${JSON.stringify(court.allowedSports)}`);
    console.log(`   Precio base por hora: €${court.basePricePerHour}`);

    console.log('\n📊 Precios por deporte configurados:');
    if (court.sportPricing && court.sportPricing.length > 0) {
      court.sportPricing.forEach((sp) => {
        console.log(`   ${sp.sport}: €${sp.pricePerHour}/hora`);
      });
    } else {
      console.log('   ❌ No hay precios por deporte configurados');
      
      if (court.isMultiuse) {
        console.log('\n🔧 Configurando precios por deporte...');
        
        // Configurar precios por deporte
        const sportsToAdd = ['VOLLEYBALL', 'BASKETBALL', 'FUTSAL'];
        const prices = [5.00, 8.00, 12.00]; // Precios diferentes para cada deporte
        
        for (let i = 0; i < sportsToAdd.length; i++) {
          const sport = sportsToAdd[i];
          const price = prices[i];
          
          await db.courtSportPricing.upsert({
            where: {
              courtId_sport: {
                courtId: court.id,
                sport: sport,
              },
            },
            update: {
              pricePerHour: price,
            },
            create: {
              courtId: court.id,
              sport: sport,
              pricePerHour: price,
            },
          });
          
          console.log(`   ✅ ${sport}: €${price}/hora configurado`);
        }
        
        console.log('\n✅ Precios por deporte configurados correctamente');
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await db.$disconnect();
  }
}

checkCourtPricing();
