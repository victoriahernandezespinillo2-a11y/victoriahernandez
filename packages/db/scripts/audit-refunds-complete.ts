/**
 * Auditoría completa de reembolsos
 * Incluye: automáticos, manuales, con tarifas especiales, créditos, tarjetas
 */

import { db } from '../src';

async function auditRefundsComplete() {
  try {
    console.log('🔍 AUDITORÍA COMPLETA DE REEMBOLSOS\n');
    console.log('='.repeat(80));

    // 1. RESERVAS REEMBOLSADAS
    console.log('\n📊 1. RESERVAS CON paymentStatus = REFUNDED\n');
    const refundedReservations = await db.reservation.findMany({
      where: {
        paymentStatus: 'REFUNDED' as any,
      },
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
      orderBy: {
        updatedAt: 'desc',
      },
    });

    console.log(`Total de reservas reembolsadas: ${refundedReservations.length}\n`);

    // 2. PAGOS REEMBOLSADOS
    console.log('\n📊 2. PAGOS CON status = REFUNDED (referencia RESERVATION)\n');
    const refundedPayments = await db.payment.findMany({
      where: {
        status: 'REFUNDED' as any,
        referenceType: 'RESERVATION',
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: {
        processedAt: 'desc',
      },
    });

    console.log(`Total de pagos reembolsados: ${refundedPayments.length}\n`);

    // 3. EVENTOS DE REEMBOLSO
    console.log('\n📊 3. EVENTOS DE REEMBOLSO EN OUTBOX\n');
    const refundEvents = await db.outboxEvent.findMany({
      where: {
        eventType: {
          in: ['RESERVATION_REFUNDED', 'CREDITS_REFUNDED'],
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    console.log(`Total de eventos de reembolso: ${refundEvents.length}\n`);

    // 4. ANÁLISIS DETALLADO
    console.log('\n' + '='.repeat(80));
    console.log('📋 ANÁLISIS DETALLADO POR RESERVA\n');
    console.log('='.repeat(80));

    let totalRefunded = 0;
    let totalCreditsRefunded = 0;
    let autoRefunds = 0;
    let manualRefunds = 0;
    let withSpecialTariff = 0;
    let creditsRefunds = 0;
    let cardRefunds = 0;
    let cashRefunds = 0;

    for (const reservation of refundedReservations) {
      const payment = refundedPayments.find(p => p.referenceId === reservation.id);
      const events = refundEvents.filter(e => {
        const data = e.eventData as any;
        return data?.reservationId === reservation.id;
      });

      const centerSettings: any = (reservation.court?.center as any)?.settings || {};
      const promoDiscount = Number((reservation as any).promoDiscount || 0);
      const creditDiscount = Number((reservation as any).creditDiscount || 0);
      const hasSpecialTariff = (!!(reservation as any).promoCode && promoDiscount > 0) || 
                               promoDiscount > 0 || 
                               creditDiscount > 0;

      const amount = Number(reservation.totalPrice || 0);
      totalRefunded += amount;

      const paymentMethod = (reservation as any).paymentMethod || 'N/A';
      const isAutoRefund = payment?.metadata && 
                          typeof payment.metadata === 'object' &&
                          (payment.metadata as any).type === 'AUTO_REFUND_CREDITS';

      if (isAutoRefund) {
        autoRefunds++;
      } else {
        manualRefunds++;
      }

      if (hasSpecialTariff) {
        withSpecialTariff++;
      }

      if (paymentMethod === 'CREDITS' || payment?.method === 'CREDITS') {
        creditsRefunds++;
        // ✅ CORREGIDO: Los créditos reembolsados están en el pago, no en la reserva original
        const credits = Number(payment?.creditAmount || (reservation as any).creditsUsed || 0);
        totalCreditsRefunded += credits;
      } else if (paymentMethod === 'CARD' || payment?.method === 'CARD' || paymentMethod === 'redsys') {
        cardRefunds++;
      } else if (paymentMethod === 'CASH') {
        cashRefunds++;
      }

      console.log(`\n🔹 Reserva ID: ${reservation.id}`);
      console.log(`   Usuario: ${reservation.user?.name || 'N/A'} (${reservation.user?.email || 'N/A'})`);
      console.log(`   Cancha: ${reservation.court?.name || 'N/A'} - ${reservation.court?.center?.name || 'N/A'}`);
      console.log(`   Fecha reserva: ${reservation.startTime.toISOString()}`);
      console.log(`   Monto: €${amount.toFixed(2)}`);
      console.log(`   Método de pago original: ${paymentMethod}`);
      console.log(`   Status: ${reservation.status}`);
      console.log(`   PaymentStatus: ${(reservation as any).paymentStatus}`);
      console.log(`   Creada: ${reservation.createdAt.toISOString()}`);
      console.log(`   Actualizada: ${reservation.updatedAt.toISOString()}`);

      // Información de tarifa especial
      if (hasSpecialTariff) {
        console.log(`   ⭐ TARIFA ESPECIAL:`);
        if ((reservation as any).promoCode) {
          console.log(`      - Código promocional: ${(reservation as any).promoCode}`);
        }
        if (promoDiscount > 0) {
          console.log(`      - Descuento promoción: -€${promoDiscount.toFixed(2)}`);
        }
        if (creditDiscount > 0) {
          console.log(`      - Descuento créditos: -€${creditDiscount.toFixed(2)}`);
        }
        const totalDiscount = promoDiscount + creditDiscount;
        const originalAmount = amount + totalDiscount;
        console.log(`      - Monto original (sin descuentos): €${originalAmount.toFixed(2)}`);
        console.log(`      - Monto final reembolsado: €${amount.toFixed(2)}`);
      }

      // Información de créditos
      if (paymentMethod === 'CREDITS' || payment?.method === 'CREDITS') {
        // ✅ CORREGIDO: Los créditos reembolsados están en el pago
        const creditsRefunded = Number(payment?.creditAmount || 0);
        const creditsOriginal = Number((reservation as any).creditsUsed || 0);
        const creditsCfg: any = (centerSettings?.credits as any) || {};
        const euroPerCredit = typeof creditsCfg.euroPerCredit === 'number' && creditsCfg.euroPerCredit > 0
          ? creditsCfg.euroPerCredit
          : 1;
        console.log(`   💰 CRÉDITOS:`);
        if (creditsOriginal > 0) {
          console.log(`      - Créditos utilizados originalmente: ${creditsOriginal.toFixed(2)}`);
        }
        if (creditsRefunded > 0) {
          console.log(`      - Créditos reembolsados: ${creditsRefunded.toFixed(2)}`);
        }
        console.log(`      - Tasa de conversión: €${euroPerCredit.toFixed(2)}/crédito`);
        if (creditsRefunded > 0) {
          console.log(`      - Valor reembolsado en créditos: €${(creditsRefunded * euroPerCredit).toFixed(2)}`);
        }
      }

      // Información del pago de reembolso
      if (payment) {
        const paymentMetadata = payment.metadata as any;
        console.log(`   💳 PAGO DE REEMBOLSO:`);
        console.log(`      - ID Pago: ${payment.id}`);
        console.log(`      - Método: ${payment.method || 'N/A'}`);
        console.log(`      - Monto: €${Math.abs(Number(payment.amount || 0)).toFixed(2)}`);
        if (payment.creditAmount) {
          console.log(`      - Créditos reembolsados: ${Number(payment.creditAmount).toFixed(2)}`);
        }
        if (paymentMetadata?.type) {
          console.log(`      - Tipo: ${paymentMetadata.type}`);
        }
        if (paymentMetadata?.policy) {
          console.log(`      - Política aplicada: ${paymentMetadata.policy}`);
        }
        if (paymentMetadata?.deadlineHours) {
          console.log(`      - Horas límite: ${paymentMetadata.deadlineHours}`);
        }
        if (paymentMetadata?.reason) {
          console.log(`      - Razón: ${paymentMetadata.reason}`);
        }
        console.log(`      - Procesado: ${payment.processedAt?.toISOString() || 'N/A'}`);
      }

      // Eventos relacionados
      if (events.length > 0) {
        console.log(`   📝 EVENTOS (${events.length}):`);
        events.forEach((ev, idx) => {
          const data = ev.eventData as any;
          console.log(`      ${idx + 1}. ${ev.eventType} - ${ev.createdAt.toISOString()}`);
          if (data?.creditsRefunded) {
            console.log(`         Créditos: ${Number(data.creditsRefunded).toFixed(2)}`);
          }
          if (data?.amount) {
            console.log(`         Monto: €${Number(data.amount).toFixed(2)}`);
          }
          if (data?.reason) {
            console.log(`         Razón: ${data.reason}`);
          }
        });
      }
    }

    // 5. ESTADÍSTICAS GENERALES
    console.log('\n' + '='.repeat(80));
    console.log('📈 ESTADÍSTICAS GENERALES\n');
    console.log('='.repeat(80));

    console.log(`\n💰 MONETARIAS:`);
    console.log(`   Total reembolsado: €${totalRefunded.toFixed(2)}`);
    console.log(`   Total créditos reembolsados: ${totalCreditsRefunded.toFixed(2)} créditos`);
    
    const creditsCfg: any = refundedReservations.length > 0 
      ? ((refundedReservations[0].court?.center as any)?.settings?.credits as any) || {}
      : {};
    const euroPerCredit = typeof creditsCfg.euroPerCredit === 'number' && creditsCfg.euroPerCredit > 0
      ? creditsCfg.euroPerCredit
      : 1;
    console.log(`   Valor créditos en euros: €${(totalCreditsRefunded * euroPerCredit).toFixed(2)}`);

    console.log(`\n📊 POR TIPO:`);
    console.log(`   Reembolsos automáticos: ${autoRefunds}`);
    console.log(`   Reembolsos manuales: ${manualRefunds}`);
    console.log(`   Con tarifa especial: ${withSpecialTariff}`);
    console.log(`   Sin tarifa especial: ${refundedReservations.length - withSpecialTariff}`);

    console.log(`\n💳 POR MÉTODO DE PAGO ORIGINAL:`);
    console.log(`   Créditos: ${creditsRefunds}`);
    console.log(`   Tarjeta: ${cardRefunds}`);
    console.log(`   Efectivo: ${cashRefunds}`);
    console.log(`   Otros: ${refundedReservations.length - creditsRefunds - cardRefunds - cashRefunds}`);

    // 6. ANÁLISIS DE TARIFAS ESPECIALES
    console.log('\n' + '='.repeat(80));
    console.log('⭐ ANÁLISIS DE REEMBOLSOS CON TARIFAS ESPECIALES\n');
    console.log('='.repeat(80));

    const specialTariffRefunds = refundedReservations.filter(r => {
      const promoDiscount = Number((r as any).promoDiscount || 0);
      const creditDiscount = Number((r as any).creditDiscount || 0);
      return ((!!(r as any).promoCode && promoDiscount > 0) || 
              promoDiscount > 0 || 
              creditDiscount > 0);
    });

    if (specialTariffRefunds.length > 0) {
      console.log(`\nTotal con tarifa especial: ${specialTariffRefunds.length}\n`);
      
      let totalSpecialDiscount = 0;
      let totalSpecialAmount = 0;

      specialTariffRefunds.forEach((r, idx) => {
        const amount = Number(r.totalPrice || 0);
        const promoDiscount = Number((r as any).promoDiscount || 0);
        const creditDiscount = Number((r as any).creditDiscount || 0);
        const totalDiscount = promoDiscount + creditDiscount;
        const originalAmount = amount + totalDiscount;

        totalSpecialAmount += amount;
        totalSpecialDiscount += totalDiscount;

        console.log(`${idx + 1}. Reserva ${r.id}`);
        console.log(`   Monto reembolsado: €${amount.toFixed(2)}`);
        if (promoDiscount > 0) {
          console.log(`   Descuento promoción: -€${promoDiscount.toFixed(2)}`);
        }
        if (creditDiscount > 0) {
          console.log(`   Descuento créditos: -€${creditDiscount.toFixed(2)}`);
        }
        console.log(`   Monto original (sin descuentos): €${originalAmount.toFixed(2)}`);
        if ((r as any).promoCode) {
          console.log(`   Código: ${(r as any).promoCode}`);
        }
        console.log('');
      });

      console.log(`\nResumen tarifas especiales:`);
      console.log(`   Total reembolsado: €${totalSpecialAmount.toFixed(2)}`);
      console.log(`   Total descuentos aplicados: €${totalSpecialDiscount.toFixed(2)}`);
      console.log(`   Valor original (sin descuentos): €${(totalSpecialAmount + totalSpecialDiscount).toFixed(2)}`);
    } else {
      console.log('\nNo hay reembolsos con tarifas especiales.');
    }

    // 7. COMPARACIÓN Y VALIDACIÓN
    console.log('\n' + '='.repeat(80));
    console.log('✅ VALIDACIÓN DE CONSISTENCIA\n');
    console.log('='.repeat(80));

    const reservationIds = new Set(refundedReservations.map(r => r.id));
    const paymentReservationIds = new Set(refundedPayments.map(p => p.referenceId));
    const eventReservationIds = new Set(
      refundEvents
        .map(e => (e.eventData as any)?.reservationId)
        .filter(Boolean)
    );

    const missingPayments = Array.from(reservationIds).filter(id => !paymentReservationIds.has(id));
    const missingEvents = Array.from(reservationIds).filter(id => !eventReservationIds.has(id));
    const orphanPayments = Array.from(paymentReservationIds).filter(id => !reservationIds.has(id));
    const orphanEvents = Array.from(eventReservationIds).filter(id => !reservationIds.has(id));

    console.log(`\nReservas reembolsadas: ${refundedReservations.length}`);
    console.log(`Pagos de reembolso: ${refundedPayments.length}`);
    console.log(`Eventos de reembolso: ${refundEvents.length}`);

    if (missingPayments.length > 0) {
      console.log(`\n⚠️  Reservas sin pago de reembolso: ${missingPayments.length}`);
      console.log(`   IDs: ${missingPayments.join(', ')}`);
    } else {
      console.log(`\n✅ Todas las reservas tienen pago de reembolso`);
    }

    if (missingEvents.length > 0) {
      console.log(`\n⚠️  Reservas sin evento de reembolso: ${missingEvents.length}`);
      console.log(`   IDs: ${missingEvents.join(', ')}`);
    } else {
      console.log(`\n✅ Todas las reservas tienen evento de reembolso`);
    }

    if (orphanPayments.length > 0) {
      console.log(`\n⚠️  Pagos sin reserva correspondiente: ${orphanPayments.length}`);
      console.log(`   IDs: ${orphanPayments.join(', ')}`);
    }

    if (orphanEvents.length > 0) {
      console.log(`\n⚠️  Eventos sin reserva correspondiente: ${orphanEvents.length}`);
      console.log(`   IDs: ${orphanEvents.join(', ')}`);
    }

    // 8. RESUMEN FINAL
    console.log('\n' + '='.repeat(80));
    console.log('📋 RESUMEN FINAL\n');
    console.log('='.repeat(80));
    console.log(`Total de reservas reembolsadas: ${refundedReservations.length}`);
    console.log(`Total de pagos reembolsados: ${refundedPayments.length}`);
    console.log(`Total de eventos de reembolso: ${refundEvents.length}`);
    console.log(`Total monto reembolsado: €${totalRefunded.toFixed(2)}`);
    console.log(`Total créditos reembolsados: ${totalCreditsRefunded.toFixed(2)} créditos`);
    console.log(`Reembolsos automáticos: ${autoRefunds}`);
    console.log(`Reembolsos manuales: ${manualRefunds}`);
    console.log(`Con tarifa especial: ${withSpecialTariff}`);
    console.log(`Por créditos: ${creditsRefunds}`);
    console.log(`Por tarjeta: ${cardRefunds}`);
    console.log(`Por efectivo: ${cashRefunds}`);

  } catch (error) {
    console.error('❌ Error en auditoría:', error);
    throw error;
  } finally {
    await db.$disconnect();
  }
}

auditRefundsComplete()
  .then(() => {
    console.log('\n✅ Auditoría completada');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error en auditoría:', error);
    process.exit(1);
  });

