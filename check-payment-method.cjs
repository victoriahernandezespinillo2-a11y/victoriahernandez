const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkPaymentMethod() {
  try {
    console.log('🔍 Verificando método de pago de las reservas...');
    
    const reservations = await prisma.reservation.findMany({
      select: {
        id: true,
        status: true,
        paymentMethod: true,
        totalPrice: true,
        createdAt: true,
        startTime: true,
        court: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 5
    });

    console.log('📊 Reservas encontradas:');
    reservations.forEach((reservation, index) => {
      console.log(`\n${index + 1}. Reserva ID: ${reservation.id}`);
      console.log(`   Status: ${reservation.status}`);
      console.log(`   Payment Method: ${reservation.paymentMethod || 'NULL/UNDEFINED'}`);
      console.log(`   Total Price: €${reservation.totalPrice}`);
      console.log(`   Created At: ${reservation.createdAt}`);
      console.log(`   Start Time: ${reservation.startTime}`);
      console.log(`   Court: ${reservation.court?.name || 'N/A'}`);
    });

    // Verificar si hay reservas con paymentMethod nulo
    const nullPaymentMethod = reservations.filter(r => !r.paymentMethod);
    console.log(`\n⚠️  Reservas con paymentMethod nulo: ${nullPaymentMethod.length}`);
    
    if (nullPaymentMethod.length > 0) {
      console.log('🔧 Recomendación: Actualizar paymentMethod para reservas existentes');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPaymentMethod();

