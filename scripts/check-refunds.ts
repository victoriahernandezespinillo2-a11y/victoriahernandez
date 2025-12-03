/**
 * Script para verificar reembolsos en la base de datos
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Cargar variables de entorno desde la raíz del proyecto
config({ path: resolve(__dirname, '../.env') });
config({ path: resolve(__dirname, '../.env.local') });

import { db } from '../packages/db/src';

const prisma = db;

async function checkRefunds() {
  try {
    console.log('🔍 Verificando reembolsos en la base de datos...\n');

    // 1. Reservas con paymentStatus = REFUNDED
    const refundedReservations = await prisma.reservation.findMany({
      where: {
        paymentStatus: 'REFUNDED' as any,
      },
      select: {
        id: true,
        userId: true,
        totalPrice: true,
        paymentMethod: true,
        paymentStatus: true,
        status: true,
        startTime: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    console.log(`📊 Reservas con paymentStatus = REFUNDED: ${refundedReservations.length}`);
    if (refundedReservations.length > 0) {
      console.log('\nDetalles:');
      refundedReservations.forEach((r, i) => {
        console.log(`  ${i + 1}. ID: ${r.id}`);
        console.log(`     Monto: €${Number(r.totalPrice || 0).toFixed(2)}`);
        console.log(`     Método: ${r.paymentMethod || 'N/A'}`);
        console.log(`     Status: ${r.status}`);
        console.log(`     Fecha reserva: ${r.startTime.toISOString()}`);
        console.log(`     Actualizado: ${r.updatedAt.toISOString()}`);
        console.log('');
      });
    }

    // 2. Eventos de reembolso en outboxEvent
    const refundEvents = await prisma.outboxEvent.findMany({
      where: {
        eventType: {
          in: ['RESERVATION_REFUNDED', 'CREDITS_REFUNDED'],
        },
      },
      select: {
        id: true,
        eventType: true,
        eventData: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    console.log(`\n📊 Eventos de reembolso en outboxEvent: ${refundEvents.length}`);
    if (refundEvents.length > 0) {
      console.log('\nDesglose por tipo:');
      const byType = refundEvents.reduce((acc, ev) => {
        acc[ev.eventType] = (acc[ev.eventType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      Object.entries(byType).forEach(([type, count]) => {
        console.log(`  ${type}: ${count}`);
      });

      console.log('\nÚltimos 10 eventos:');
      refundEvents.slice(0, 10).forEach((ev, i) => {
        const data = ev.eventData as any;
        console.log(`  ${i + 1}. ${ev.eventType}`);
        console.log(`     Reserva ID: ${data?.reservationId || 'N/A'}`);
        console.log(`     Monto: €${Number(data?.amount || 0).toFixed(2)}`);
        if (data?.creditsRefunded) {
          console.log(`     Créditos: ${Number(data.creditsRefunded).toFixed(2)}`);
        }
        console.log(`     Fecha: ${ev.createdAt.toISOString()}`);
        console.log('');
      });
    }

    // 3. Pagos con status = REFUNDED
    const refundedPayments = await prisma.payment.findMany({
      where: {
        status: 'REFUNDED' as any,
        referenceType: 'RESERVATION',
      },
      select: {
        id: true,
        userId: true,
        amount: true,
        method: true,
        creditAmount: true,
        cardAmount: true,
        referenceId: true,
        metadata: true,
        processedAt: true,
        createdAt: true,
      },
      orderBy: {
        processedAt: 'desc',
      },
    });

    console.log(`\n📊 Pagos con status = REFUNDED (referencia RESERVATION): ${refundedPayments.length}`);
    if (refundedPayments.length > 0) {
      console.log('\nDesglose por método:');
      const byMethod = refundedPayments.reduce((acc, p) => {
        acc[p.method || 'N/A'] = (acc[p.method || 'N/A'] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      Object.entries(byMethod).forEach(([method, count]) => {
        console.log(`  ${method}: ${count}`);
      });

      console.log('\nÚltimos 10 pagos reembolsados:');
      refundedPayments.slice(0, 10).forEach((p, i) => {
        console.log(`  ${i + 1}. ID: ${p.id}`);
        console.log(`     Reserva ID: ${p.referenceId}`);
        console.log(`     Monto: €${Number(Math.abs(p.amount || 0)).toFixed(2)}`);
        console.log(`     Método: ${p.method || 'N/A'}`);
        if (p.creditAmount) {
          console.log(`     Créditos: ${Number(p.creditAmount).toFixed(2)}`);
        }
        const metadata = p.metadata as any;
        if (metadata?.type) {
          console.log(`     Tipo: ${metadata.type}`);
        }
        console.log(`     Procesado: ${p.processedAt?.toISOString() || 'N/A'}`);
        console.log('');
      });
    }

    // 4. Comparación: ¿Hay reservas reembolsadas sin eventos?
    const refundedReservationIds = new Set(refundedReservations.map(r => r.id));
    const refundEventReservationIds = new Set(
      refundEvents
        .map(ev => (ev.eventData as any)?.reservationId)
        .filter(Boolean)
    );

    const missingEvents = Array.from(refundedReservationIds).filter(
      id => !refundEventReservationIds.has(id)
    );

    if (missingEvents.length > 0) {
      console.log(`\n⚠️  Reservas reembolsadas sin eventos de reembolso: ${missingEvents.length}`);
      console.log('IDs:', missingEvents);
    } else {
      console.log('\n✅ Todas las reservas reembolsadas tienen eventos correspondientes');
    }

    // 5. Comparación: ¿Hay eventos sin reservas marcadas como reembolsadas?
    const missingReservations = Array.from(refundEventReservationIds).filter(
      id => !refundedReservationIds.has(id)
    );

    if (missingReservations.length > 0) {
      console.log(`\n⚠️  Eventos de reembolso sin reservas marcadas como reembolsadas: ${missingReservations.length}`);
      console.log('IDs:', missingReservations);
    } else {
      console.log('\n✅ Todos los eventos de reembolso tienen reservas marcadas correctamente');
    }

    // Resumen final
    console.log('\n' + '='.repeat(60));
    console.log('📈 RESUMEN FINAL:');
    console.log('='.repeat(60));
    console.log(`Reservas con paymentStatus = REFUNDED: ${refundedReservations.length}`);
    console.log(`Eventos RESERVATION_REFUNDED/CREDITS_REFUNDED: ${refundEvents.length}`);
    console.log(`Pagos con status = REFUNDED: ${refundedPayments.length}`);
    console.log(`Total monto reembolsado (reservas): €${refundedReservations.reduce((sum, r) => sum + Number(r.totalPrice || 0), 0).toFixed(2)}`);
    console.log(`Total monto reembolsado (pagos): €${refundedPayments.reduce((sum, p) => sum + Math.abs(Number(p.amount || 0)), 0).toFixed(2)}`);

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

checkRefunds()
  .then(() => {
    console.log('\n✅ Verificación completada');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error en verificación:', error);
    process.exit(1);
  });

