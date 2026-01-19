/**
 * Script para verificar qué devuelve el API de reservas
 */

import { db } from '../src';

async function testApiReservations() {
  try {
    console.log('🔍 Verificando qué devuelve el API de reservas...\n');

    // Simular la query del API sin filtros
    const items = await db.reservation.findMany({
      skip: 0,
      take: 200,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true } },
        court: { select: { id: true, name: true, center: { select: { id: true, name: true } } } },
      },
    });

    console.log(`📊 Total de reservas en BD: ${items.length}\n`);

    // Verificar paymentStatus
    const withPaymentStatus = items.filter((r: any) => (r as any).paymentStatus);
    const refunded = items.filter((r: any) => (r as any).paymentStatus === 'REFUNDED');
    const paid = items.filter((r: any) => (r as any).paymentStatus === 'PAID');
    const pending = items.filter((r: any) => (r as any).paymentStatus === 'PENDING' || !(r as any).paymentStatus);

    console.log(`Reservas con paymentStatus definido: ${withPaymentStatus.length}`);
    console.log(`  - REFUNDED: ${refunded.length}`);
    console.log(`  - PAID: ${paid.length}`);
    console.log(`  - PENDING/sin paymentStatus: ${pending.length}\n`);

    // Mostrar las reembolsadas
    if (refunded.length > 0) {
      console.log('📋 Reservas reembolsadas:');
      refunded.forEach((r: any, i) => {
        console.log(`\n${i + 1}. ID: ${r.id}`);
        console.log(`   Status: ${r.status}`);
        console.log(`   PaymentStatus: ${(r as any).paymentStatus}`);
        console.log(`   PaymentMethod: ${(r as any).paymentMethod || 'N/A'}`);
        console.log(`   TotalPrice: €${Number(r.totalPrice || 0).toFixed(2)}`);
        console.log(`   StartTime: ${r.startTime.toISOString()}`);
        console.log(`   CreatedAt: ${r.createdAt.toISOString()}`);
        console.log(`   UpdatedAt: ${r.updatedAt.toISOString()}`);
      });
    }

    // Simular el mapeo del API
    console.log('\n\n🔄 Simulando mapeo del API...\n');
    const mapped = items.map((r: any) => {
      let paymentStatus: 'PENDING' | 'PAID' | 'REFUNDED' = 'PENDING';
      
      if ((r as any).paymentStatus) {
        paymentStatus = (r as any).paymentStatus as 'PENDING' | 'PAID' | 'REFUNDED';
      } else if (r.status === 'PAID') {
        paymentStatus = 'PAID';
      }
      
      return {
        id: r.id,
        status: r.status,
        paymentStatus: paymentStatus,
        totalAmount: Number(r.totalPrice || 0),
        date: r.startTime.toISOString().split('T')[0],
      };
    });

    const mappedRefunded = mapped.filter(r => r.paymentStatus === 'REFUNDED');
    console.log(`📊 Reservas mapeadas con paymentStatus = REFUNDED: ${mappedRefunded.length}`);
    
    if (mappedRefunded.length > 0) {
      console.log('\nDetalles:');
      mappedRefunded.forEach((r, i) => {
        console.log(`  ${i + 1}. ID: ${r.id}, Status: ${r.status}, Monto: €${r.totalAmount.toFixed(2)}`);
      });
    }

    // Verificar si hay diferencias
    if (refunded.length !== mappedRefunded.length) {
      console.log(`\n⚠️  DISCREPANCIA: ${refunded.length} en BD vs ${mappedRefunded.length} mapeadas`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await db.$disconnect();
  }
}

testApiReservations()
  .then(() => {
    console.log('\n✅ Verificación completada');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error en verificación:', error);
    process.exit(1);
  });







