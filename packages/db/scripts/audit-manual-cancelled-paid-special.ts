/**
 * Auditoría de reservas canceladas manualmente (antes de 24h)
 * que fueron pagadas y tenían tarifa especial
 */

import { db } from '../src';

async function auditManualCancelledPaidSpecial() {
  try {
    console.log('🔍 AUDITORÍA: RESERVAS CANCELADAS MANUALMENTE (antes de 24h), PAGADAS Y CON TARIFA ESPECIAL\n');
    console.log('='.repeat(80));

    // 1. Obtener todas las reservas canceladas
    console.log('\n📊 1. BUSCANDO RESERVAS CANCELADAS\n');
    
    const allCancelledReservations = await db.reservation.findMany({
      where: {
        status: 'CANCELLED' as any,
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

    console.log(`Total de reservas canceladas: ${allCancelledReservations.length}\n`);

    // 2. Filtrar las que NO son autocanceladas
    console.log('\n📊 2. FILTRANDO RESERVAS CANCELADAS MANUALMENTE (no autocanceladas)\n');
    
    // Obtener IDs de autocanceladas
    const autoCancelledEvents = await db.outboxEvent.findMany({
      where: {
        eventType: 'RESERVATION_AUTO_CANCELLED',
      },
      select: {
        eventData: true,
      },
    });

    const autoCancelledIds = new Set<string>();
    autoCancelledEvents.forEach(ev => {
      const data = ev.eventData as any;
      if (data?.reservationId) {
        autoCancelledIds.add(data.reservationId);
      }
    });

    // También buscar por notes
    const autoCancelledByNotes = await db.reservation.findMany({
      where: {
        status: 'CANCELLED' as any,
        notes: {
          contains: 'Auto-cancelada',
          mode: 'insensitive',
        },
      },
      select: {
        id: true,
      },
    });

    autoCancelledByNotes.forEach(r => autoCancelledIds.add(r.id));

    // Filtrar las que NO son autocanceladas
    const manualCancelled = allCancelledReservations.filter(r => {
      return !autoCancelledIds.has(r.id) && 
             !r.notes?.toLowerCase().includes('auto-cancelada');
    });

    console.log(`Reservas autocanceladas: ${autoCancelledIds.size}`);
    console.log(`Reservas canceladas manualmente: ${manualCancelled.length}\n`);

    // 3. Filtrar las que fueron pagadas
    console.log('\n📊 3. FILTRANDO RESERVAS QUE FUERON PAGADAS\n');
    
    const paidManualCancelled = manualCancelled.filter(r => {
      return (r as any).paymentStatus === 'PAID' || 
             r.status === 'PAID' ||
             (r as any).paidAt !== null;
    });

    console.log(`Reservas canceladas manualmente y pagadas: ${paidManualCancelled.length}\n`);

    // 4. Filtrar las que tenían tarifa especial
    console.log('\n📊 4. FILTRANDO RESERVAS CON TARIFA ESPECIAL\n');
    
    const specialTariffReservations = paidManualCancelled.filter(r => {
      const promoDiscount = Number((r as any).promoDiscount || 0);
      const creditDiscount = Number((r as any).creditDiscount || 0);
      return ((!!(r as any).promoCode && promoDiscount > 0) || 
              promoDiscount > 0 || 
              creditDiscount > 0);
    });

    console.log(`Reservas canceladas manualmente, pagadas y con tarifa especial: ${specialTariffReservations.length}\n`);

    // 5. Filtrar las canceladas antes de 24 horas
    console.log('\n📊 5. FILTRANDO RESERVAS CANCELADAS ANTES DE 24 HORAS\n');
    
    const cancelledBefore24h = specialTariffReservations.filter(r => {
      const startTime = new Date(r.startTime);
      const cancelledTime = r.updatedAt; // Usar updatedAt como aproximación de cuándo se canceló
      const hoursBeforeStart = (startTime.getTime() - cancelledTime.getTime()) / (1000 * 60 * 60);
      return hoursBeforeStart >= 24; // Canceladas al menos 24 horas antes
    });

    console.log(`Reservas canceladas manualmente, pagadas, con tarifa especial y antes de 24h: ${cancelledBefore24h.length}\n`);

    // 6. Obtener pagos reembolsados
    const refundedPayments = await db.payment.findMany({
      where: {
        status: 'REFUNDED' as any,
        referenceType: 'RESERVATION',
      },
      select: {
        id: true,
        referenceId: true,
        amount: true,
        method: true,
        creditAmount: true,
        metadata: true,
        processedAt: true,
      },
    });

    // 7. Obtener eventos de cancelación manual
    const manualCancellationEvents = await db.outboxEvent.findMany({
      where: {
        eventType: 'RESERVATION_CANCELLED',
      },
      select: {
        eventData: true,
        createdAt: true,
      },
    });

    // 8. ANÁLISIS DETALLADO
    console.log('\n' + '='.repeat(80));
    console.log('📋 ANÁLISIS DETALLADO\n');
    console.log('='.repeat(80));

    if (cancelledBefore24h.length === 0) {
      console.log('\n❌ No se encontraron reservas que cumplan todos los criterios:');
      console.log('   - Canceladas manualmente (no autocanceladas)');
      console.log('   - Pagadas');
      console.log('   - Con tarifa especial');
      console.log('   - Canceladas antes de 24 horas de la fecha de inicio\n');

      // Mostrar las que cumplen algunos criterios
      if (specialTariffReservations.length > 0) {
        console.log('\n📊 Reservas canceladas manualmente, pagadas y con tarifa especial (sin filtro de 24h):');
        specialTariffReservations.forEach((r, idx) => {
          const startTime = new Date(r.startTime);
          const cancelledTime = r.updatedAt;
          const hoursBeforeStart = (startTime.getTime() - cancelledTime.getTime()) / (1000 * 60 * 60);
          const amount = Number(r.totalPrice || 0);
          const promoDiscount = Number((r as any).promoDiscount || 0);
          const creditDiscount = Number((r as any).creditDiscount || 0);
          const totalDiscount = promoDiscount + creditDiscount;
          const originalAmount = amount + totalDiscount;

          console.log(`\n${idx + 1}. Reserva ${r.id}`);
          console.log(`   Usuario: ${r.user?.name || 'N/A'} (${r.user?.email || 'N/A'})`);
          console.log(`   Cancha: ${r.court?.name || 'N/A'}`);
          console.log(`   Fecha inicio: ${startTime.toISOString()}`);
          console.log(`   Cancelada: ${cancelledTime.toISOString()}`);
          console.log(`   Horas antes del inicio: ${hoursBeforeStart.toFixed(2)}`);
          console.log(`   ⚠️  ${hoursBeforeStart < 24 ? 'CANCELADA DESPUÉS DE 24H' : 'CANCELADA ANTES DE 24H'}`);
          console.log(`   Monto: €${amount.toFixed(2)}`);
          console.log(`   Monto original: €${originalAmount.toFixed(2)}`);
          console.log(`   Descuentos: -€${totalDiscount.toFixed(2)}`);
        });
      }

      if (paidManualCancelled.length > 0 && specialTariffReservations.length === 0) {
        console.log('\n📊 Reservas canceladas manualmente y pagadas (sin tarifa especial):');
        
        // Separar por canceladas antes/después de 24h
        const before24h = paidManualCancelled.filter(r => {
          const startTime = new Date(r.startTime);
          const cancelledTime = r.updatedAt;
          const hoursBeforeStart = (startTime.getTime() - cancelledTime.getTime()) / (1000 * 60 * 60);
          return hoursBeforeStart >= 24;
        });

        const after24h = paidManualCancelled.filter(r => {
          const startTime = new Date(r.startTime);
          const cancelledTime = r.updatedAt;
          const hoursBeforeStart = (startTime.getTime() - cancelledTime.getTime()) / (1000 * 60 * 60);
          return hoursBeforeStart < 24;
        });

        console.log(`\n✅ Canceladas ANTES de 24 horas: ${before24h.length}`);
        before24h.forEach((r, idx) => {
          const startTime = new Date(r.startTime);
          const cancelledTime = r.updatedAt;
          const hoursBeforeStart = (startTime.getTime() - cancelledTime.getTime()) / (1000 * 60 * 60);
          const amount = Number(r.totalPrice || 0);
          const promoDiscount = Number((r as any).promoDiscount || 0);
          const creditDiscount = Number((r as any).creditDiscount || 0);
          const refundPayment = refundedPayments.find(p => p.referenceId === r.id);

          console.log(`\n${idx + 1}. Reserva ${r.id}`);
          console.log(`   Usuario: ${r.user?.name || 'N/A'} (${r.user?.email || 'N/A'})`);
          console.log(`   Cancha: ${r.court?.name || 'N/A'}`);
          console.log(`   Fecha inicio: ${startTime.toISOString()}`);
          console.log(`   Cancelada: ${cancelledTime.toISOString()}`);
          console.log(`   ⏱️  Horas antes del inicio: ${hoursBeforeStart.toFixed(2)} horas`);
          console.log(`   💰 Monto: €${amount.toFixed(2)}`);
          console.log(`   PromoCode: ${(r as any).promoCode || 'N/A'}`);
          console.log(`   PromoDiscount: €${promoDiscount.toFixed(2)}`);
          console.log(`   CreditDiscount: €${creditDiscount.toFixed(2)}`);
          console.log(`   PaymentMethod: ${(r as any).paymentMethod || 'N/A'}`);
          console.log(`   PaymentStatus: ${(r as any).paymentStatus || 'N/A'}`);
          if (refundPayment) {
            console.log(`   🔄 REEMBOLSADA: Sí (${refundPayment.method || 'N/A'})`);
          } else {
            console.log(`   ⚠️  REEMBOLSADA: No`);
          }
        });

        console.log(`\n⚠️  Canceladas DESPUÉS de 24 horas (o menos de 24h): ${after24h.length}`);
        after24h.forEach((r, idx) => {
          const startTime = new Date(r.startTime);
          const cancelledTime = r.updatedAt;
          const hoursBeforeStart = (startTime.getTime() - cancelledTime.getTime()) / (1000 * 60 * 60);
          console.log(`\n${idx + 1}. Reserva ${r.id} - ${hoursBeforeStart.toFixed(2)} horas antes`);
        });
      }
    } else {
      let totalOriginal = 0;
      let totalDiscounts = 0;
      let totalRefunded = 0;
      let totalCreditsRefunded = 0;

      cancelledBefore24h.forEach((reservation, idx) => {
        const amount = Number(reservation.totalPrice || 0);
        const promoDiscount = Number((reservation as any).promoDiscount || 0);
        const creditDiscount = Number((reservation as any).creditDiscount || 0);
        const totalDiscount = promoDiscount + creditDiscount;
        const originalAmount = amount + totalDiscount;

        totalOriginal += originalAmount;
        totalDiscounts += totalDiscount;

        const startTime = new Date(reservation.startTime);
        const cancelledTime = reservation.updatedAt;
        const hoursBeforeStart = (startTime.getTime() - cancelledTime.getTime()) / (1000 * 60 * 60);

        // Buscar si fue reembolsada
        const refundPayment = refundedPayments.find(p => p.referenceId === reservation.id);
        if (refundPayment) {
          totalRefunded += amount;
          if (refundPayment.creditAmount) {
            totalCreditsRefunded += Number(refundPayment.creditAmount);
          }
        }

        // Buscar eventos de cancelación
        const cancellationEvent = manualCancellationEvents.find(ev => {
          const data = ev.eventData as any;
          return data?.reservationId === reservation.id;
        });

        const centerSettings: any = (reservation.court?.center as any)?.settings || {};

        console.log(`\n${idx + 1}. 🔹 Reserva ID: ${reservation.id}`);
        console.log(`   👤 Usuario: ${reservation.user?.name || 'N/A'} (${reservation.user?.email || 'N/A'})`);
        console.log(`   🏟️  Cancha: ${reservation.court?.name || 'N/A'} - ${reservation.court?.center?.name || 'N/A'}`);
        console.log(`   📅 Fecha inicio reserva: ${startTime.toISOString()}`);
        console.log(`   ⏰ Cancelada: ${cancelledTime.toISOString()}`);
        console.log(`   ⏱️  Horas antes del inicio: ${hoursBeforeStart.toFixed(2)} horas`);
        console.log(`   💰 Monto final: €${amount.toFixed(2)}`);
        console.log(`   💰 Monto original (sin descuentos): €${originalAmount.toFixed(2)}`);
        
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
        console.log(`      - Total descuentos: -€${totalDiscount.toFixed(2)}`);

        console.log(`   💳 PAGO:`);
        console.log(`      - PaymentStatus: ${(reservation as any).paymentStatus || 'N/A'}`);
        console.log(`      - Status: ${reservation.status}`);
        console.log(`      - Método: ${(reservation as any).paymentMethod || 'N/A'}`);
        console.log(`      - Pagado en: ${(reservation as any).paidAt?.toISOString() || 'N/A'}`);

        // Información de créditos si aplica
        if ((reservation as any).creditsUsed) {
          const credits = Number((reservation as any).creditsUsed || 0);
          const creditsCfg: any = (centerSettings?.credits as any) || {};
          const euroPerCredit = typeof creditsCfg.euroPerCredit === 'number' && creditsCfg.euroPerCredit > 0
            ? creditsCfg.euroPerCredit
            : 1;
          console.log(`   💰 CRÉDITOS UTILIZADOS:`);
          console.log(`      - Créditos: ${credits.toFixed(2)}`);
          console.log(`      - Tasa: €${euroPerCredit.toFixed(2)}/crédito`);
          console.log(`      - Valor: €${(credits * euroPerCredit).toFixed(2)}`);
        }

        // Información de cancelación
        if (cancellationEvent) {
          const data = cancellationEvent.eventData as any;
          console.log(`   🚫 CANCELACIÓN MANUAL:`);
          console.log(`      - Fecha evento: ${cancellationEvent.createdAt.toISOString()}`);
          if (data?.reason) {
            console.log(`      - Razón: ${data.reason}`);
          }
        }

        // Información de reembolso si aplica
        if (refundPayment) {
          const paymentMetadata = refundPayment.metadata as any;
          console.log(`   🔄 REEMBOLSO:`);
          console.log(`      - ID Pago: ${refundPayment.id}`);
          console.log(`      - Método: ${refundPayment.method || 'N/A'}`);
          console.log(`      - Monto: €${Math.abs(Number(refundPayment.amount || 0)).toFixed(2)}`);
          if (refundPayment.creditAmount) {
            console.log(`      - Créditos: ${Number(refundPayment.creditAmount).toFixed(2)}`);
          }
          if (paymentMetadata?.type) {
            console.log(`      - Tipo: ${paymentMetadata.type}`);
          }
          if (paymentMetadata?.reason) {
            console.log(`      - Razón: ${paymentMetadata.reason}`);
          }
          console.log(`      - Procesado: ${refundPayment.processedAt?.toISOString() || 'N/A'}`);
        } else {
          console.log(`   ⚠️  NO REEMBOLSADA (aunque fue pagada y cancelada antes de 24h)`);
        }

        console.log(`   📝 Notas: ${reservation.notes || 'Sin notas'}`);
      });

      // 9. ESTADÍSTICAS
      console.log('\n' + '='.repeat(80));
      console.log('📈 ESTADÍSTICAS\n');
      console.log('='.repeat(80));

      const refundedCount = cancelledBefore24h.filter(r => 
        refundedPayments.some(p => p.referenceId === r.id)
      ).length;

      console.log(`\nTotal de reservas: ${cancelledBefore24h.length}`);
      console.log(`Total monto original (sin descuentos): €${totalOriginal.toFixed(2)}`);
      console.log(`Total descuentos aplicados: €${totalDiscounts.toFixed(2)}`);
      console.log(`Total monto final pagado: €${(totalOriginal - totalDiscounts).toFixed(2)}`);
      console.log(`\nReembolsadas: ${refundedCount}`);
      console.log(`No reembolsadas: ${cancelledBefore24h.length - refundedCount}`);
      if (refundedCount > 0) {
        console.log(`Total reembolsado: €${totalRefunded.toFixed(2)}`);
        console.log(`Total créditos reembolsados: ${totalCreditsRefunded.toFixed(2)} créditos`);
      }
    }

    // 10. RESUMEN COMPARATIVO
    console.log('\n' + '='.repeat(80));
    console.log('📊 RESUMEN COMPARATIVO\n');
    console.log('='.repeat(80));

    console.log(`\nReservas canceladas (total): ${allCancelledReservations.length}`);
    console.log(`  - Autocanceladas: ${autoCancelledIds.size}`);
    console.log(`  - Canceladas manualmente: ${manualCancelled.length}`);
    console.log(`\nReservas canceladas manualmente: ${manualCancelled.length}`);
    console.log(`  - Pagadas: ${paidManualCancelled.length}`);
    console.log(`  - No pagadas: ${manualCancelled.length - paidManualCancelled.length}`);
    console.log(`\nReservas canceladas manualmente y pagadas: ${paidManualCancelled.length}`);
    console.log(`  - Con tarifa especial: ${specialTariffReservations.length}`);
    console.log(`  - Sin tarifa especial: ${paidManualCancelled.length - specialTariffReservations.length}`);
    if (specialTariffReservations.length > 0) {
      const before24hCount = specialTariffReservations.filter(r => {
        const startTime = new Date(r.startTime);
        const cancelledTime = r.updatedAt;
        const hoursBeforeStart = (startTime.getTime() - cancelledTime.getTime()) / (1000 * 60 * 60);
        return hoursBeforeStart >= 24;
      }).length;
      console.log(`\nReservas con tarifa especial canceladas antes de 24h: ${before24hCount}`);
      console.log(`Reservas con tarifa especial canceladas después de 24h: ${specialTariffReservations.length - before24hCount}`);
    }

  } catch (error) {
    console.error('❌ Error en auditoría:', error);
    throw error;
  } finally {
    await db.$disconnect();
  }
}

auditManualCancelledPaidSpecial()
  .then(() => {
    console.log('\n✅ Auditoría completada');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error en auditoría:', error);
    process.exit(1);
  });

