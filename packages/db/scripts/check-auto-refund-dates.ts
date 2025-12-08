/**
 * Verificar fechas de cancelación y si se intentó reembolso automático
 */

import { db } from '../src';

async function checkAutoRefundDates() {
  try {
    console.log('🔍 VERIFICANDO FECHAS DE CANCELACIÓN Y REEMBOLSOS AUTOMÁTICOS\n');
    console.log('='.repeat(80));

    // Las 2 reservas que no fueron reembolsadas
    const reservationIds = [
      'cmiimn5lk0002u9kyib61ewi1',
      'cmi5pwii40004i304ws58sv11'
    ];

    for (const reservationId of reservationIds) {
      console.log(`\n📋 Reserva: ${reservationId}\n`);

      const reservation = await db.reservation.findUnique({
        where: { id: reservationId },
        include: {
          user: { select: { id: true, name: true, email: true } },
          court: { 
            select: { 
              id: true, 
              name: true, 
              center: { 
                select: { 
                  id: true, 
                  name: true,
                  settings: true 
                } 
              } 
            } 
          },
        },
      });

      if (!reservation) {
        console.log('❌ Reserva no encontrada');
        continue;
      }

      const startTime = new Date(reservation.startTime);
      const cancelledTime = reservation.updatedAt;
      const hoursBeforeStart = (startTime.getTime() - cancelledTime.getTime()) / (1000 * 60 * 60);

      console.log(`Usuario: ${reservation.user?.name || 'N/A'} (${reservation.user?.email || 'N/A'})`);
      console.log(`Cancha: ${reservation.court?.name || 'N/A'}`);
      console.log(`Fecha inicio: ${startTime.toISOString()}`);
      console.log(`Cancelada: ${cancelledTime.toISOString()}`);
      console.log(`Horas antes del inicio: ${hoursBeforeStart.toFixed(2)}`);
      console.log(`Monto: €${Number(reservation.totalPrice || 0).toFixed(2)}`);
      console.log(`PaymentStatus: ${(reservation as any).paymentStatus || 'N/A'}`);
      console.log(`Status: ${reservation.status}`);
      console.log(`PaymentMethod: ${(reservation as any).paymentMethod || 'N/A'}`);

      // Buscar eventos de cancelación
      const cancellationEvents = await db.outboxEvent.findMany({
        where: {
          OR: [
            { eventType: 'RESERVATION_CANCELLED', eventData: { path: ['reservationId'], equals: reservationId } },
            { eventType: 'RESERVATION_AUTO_CANCELLED', eventData: { path: ['reservationId'], equals: reservationId } },
          ],
        },
        orderBy: { createdAt: 'asc' },
      });

      console.log(`\n📝 Eventos de cancelación: ${cancellationEvents.length}`);
      cancellationEvents.forEach((ev, idx) => {
        const data = ev.eventData as any;
        console.log(`   ${idx + 1}. ${ev.eventType} - ${ev.createdAt.toISOString()}`);
        if (data?.reason) {
          console.log(`      Razón: ${data.reason}`);
        }
      });

      // Buscar eventos de reembolso
      const refundEvents = await db.outboxEvent.findMany({
        where: {
          OR: [
            { eventType: 'RESERVATION_REFUNDED', eventData: { path: ['reservationId'], equals: reservationId } },
            { eventType: 'CREDITS_REFUNDED', eventData: { path: ['reservationId'], equals: reservationId } },
          ],
        },
        orderBy: { createdAt: 'asc' },
      });

      console.log(`\n💰 Eventos de reembolso: ${refundEvents.length}`);
      if (refundEvents.length === 0) {
        console.log('   ⚠️  NO HAY EVENTOS DE REEMBOLSO');
      } else {
        refundEvents.forEach((ev, idx) => {
          const data = ev.eventData as any;
          console.log(`   ${idx + 1}. ${ev.eventType} - ${ev.createdAt.toISOString()}`);
          if (data?.reason) {
            console.log(`      Razón: ${data.reason}`);
          }
          if (data?.creditsRefunded) {
            console.log(`      Créditos: ${Number(data.creditsRefunded).toFixed(2)}`);
          }
        });
      }

      // Buscar pagos de reembolso
      const refundPayments = await db.payment.findMany({
        where: {
          referenceType: 'RESERVATION',
          referenceId: reservationId,
          status: 'REFUNDED' as any,
        },
        orderBy: { processedAt: 'asc' },
      });

      console.log(`\n💳 Pagos de reembolso: ${refundPayments.length}`);
      if (refundPayments.length === 0) {
        console.log('   ⚠️  NO HAY PAGOS DE REEMBOLSO');
      } else {
        refundPayments.forEach((p, idx) => {
          const metadata = p.metadata as any;
          console.log(`   ${idx + 1}. ID: ${p.id}`);
          console.log(`      Método: ${p.method || 'N/A'}`);
          console.log(`      Monto: €${Math.abs(Number(p.amount || 0)).toFixed(2)}`);
          console.log(`      Tipo: ${metadata?.type || 'N/A'}`);
          console.log(`      Procesado: ${p.processedAt?.toISOString() || 'N/A'}`);
        });
      }

      // Verificar si cumple criterios para reembolso automático
      const centerSettings: any = (reservation.court?.center as any)?.settings || {};
      const paymentsCfg: any = (centerSettings?.payments as any) || {};
      const businessCfg: any = (centerSettings?.business as any) || {};
      const policy = (paymentsCfg.refundPolicy as any) || 'moderate';
      
      let deadlineHours = 48; // default moderate
      if (policy === 'flexible') {
        deadlineHours = paymentsCfg.refundDeadlineHours || businessCfg.cancellationHours || 24;
      } else if (policy === 'moderate') {
        deadlineHours = paymentsCfg.refundDeadlineHours || 48;
      } else if (policy === 'strict') {
        deadlineHours = 0;
      }

      console.log(`\n✅ Evaluación de elegibilidad para reembolso automático:`);
      console.log(`   Política: ${policy}`);
      console.log(`   Horas límite: ${deadlineHours}`);
      console.log(`   Horas antes del inicio: ${hoursBeforeStart.toFixed(2)}`);
      console.log(`   PaymentStatus: ${(reservation as any).paymentStatus || 'N/A'}`);
      
      const isEligible = (reservation as any).paymentStatus === 'PAID' && 
                         hoursBeforeStart >= deadlineHours && 
                         policy !== 'strict';
      
      console.log(`   ¿Elegible?: ${isEligible ? '✅ SÍ' : '❌ NO'}`);
      
      if (!isEligible) {
        if ((reservation as any).paymentStatus !== 'PAID') {
          console.log(`   Razón: PaymentStatus no es 'PAID'`);
        } else if (hoursBeforeStart < deadlineHours) {
          console.log(`   Razón: Cancelada ${hoursBeforeStart.toFixed(2)}h antes, necesita ${deadlineHours}h`);
        } else if (policy === 'strict') {
          console.log(`   Razón: Política estricta (sin reembolsos automáticos)`);
        }
      } else {
        console.log(`   ⚠️  ELEGIBLE PERO NO REEMBOLSADA - Probablemente cancelada antes de implementar reembolso automático`);
      }
    }

    // Verificar cuándo se implementó el reembolso automático
    console.log('\n' + '='.repeat(80));
    console.log('📅 HISTORIAL DE REEMBOLSOS AUTOMÁTICOS\n');
    console.log('='.repeat(80));

    const allAutoRefunds = await db.payment.findMany({
      where: {
        metadata: {
          path: ['type'],
          equals: 'AUTO_REFUND_CREDITS',
        },
      },
      orderBy: { processedAt: 'asc' },
      take: 5,
    });

    if (allAutoRefunds.length > 0) {
      console.log(`\nPrimeros reembolsos automáticos encontrados:`);
      allAutoRefunds.forEach((p, idx) => {
        console.log(`\n${idx + 1}. ID: ${p.id}`);
        console.log(`   Reserva: ${p.referenceId}`);
        console.log(`   Fecha: ${p.processedAt?.toISOString() || 'N/A'}`);
        console.log(`   Monto: €${Math.abs(Number(p.amount || 0)).toFixed(2)}`);
      });
      console.log(`\n✅ El reembolso automático existe desde: ${allAutoRefunds[0].processedAt?.toISOString() || 'N/A'}`);
    } else {
      console.log('\n❌ No se encontraron reembolsos automáticos en la base de datos');
    }

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await db.$disconnect();
  }
}

checkAutoRefundDates()
  .then(() => {
    console.log('\n✅ Verificación completada');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });






