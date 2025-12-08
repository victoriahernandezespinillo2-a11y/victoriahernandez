/**
 * Auditoría de reservas autocanceladas que fueron pagadas y tenían tarifa especial
 */

import { db } from '../src';

async function auditAutoCancelledPaidSpecial() {
  try {
    console.log('🔍 AUDITORÍA: RESERVAS AUTOCANCELADAS, PAGADAS Y CON TARIFA ESPECIAL\n');
    console.log('='.repeat(80));

    // 1. Buscar reservas autocanceladas
    console.log('\n📊 1. BUSCANDO RESERVAS AUTOCANCELADAS\n');
    
    // Buscar por evento RESERVATION_AUTO_CANCELLED
    const autoCancelledEvents = await db.outboxEvent.findMany({
      where: {
        eventType: 'RESERVATION_AUTO_CANCELLED',
      },
      select: {
        eventData: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const autoCancelledIds = new Set<string>();
    autoCancelledEvents.forEach(ev => {
      const data = ev.eventData as any;
      if (data?.reservationId) {
        autoCancelledIds.add(data.reservationId);
      }
    });

    console.log(`Eventos de autocancelación encontrados: ${autoCancelledEvents.length}`);
    console.log(`IDs únicos de reservas autocanceladas: ${autoCancelledIds.size}\n`);

    // También buscar por notes que contengan "Auto-cancelada" o "auto-cancelada"
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
    console.log(`Reservas autocanceladas por notes: ${autoCancelledByNotes.length}`);
    console.log(`Total IDs únicos (eventos + notes): ${autoCancelledIds.size}\n`);

    if (autoCancelledIds.size === 0) {
      console.log('❌ No se encontraron reservas autocanceladas.');
      await db.$disconnect();
      return;
    }

    // 2. Obtener las reservas autocanceladas con detalles
    console.log('\n📊 2. OBTENIENDO DETALLES DE RESERVAS AUTOCANCELADAS\n');
    
    const autoCancelledReservations = await db.reservation.findMany({
      where: {
        id: {
          in: Array.from(autoCancelledIds),
        },
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

    console.log(`Total de reservas autocanceladas encontradas: ${autoCancelledReservations.length}\n`);

    // 3. Filtrar las que fueron pagadas
    console.log('\n📊 3. FILTRANDO RESERVAS QUE FUERON PAGADAS\n');
    
    const paidAutoCancelled = autoCancelledReservations.filter(r => {
      return (r as any).paymentStatus === 'PAID' || 
             r.status === 'PAID' ||
             (r as any).paidAt !== null;
    });

    console.log(`Reservas autocanceladas que fueron pagadas: ${paidAutoCancelled.length}\n`);

    // 4. Filtrar las que tenían tarifa especial
    console.log('\n📊 4. FILTRANDO RESERVAS CON TARIFA ESPECIAL\n');
    
    const specialTariffReservations = paidAutoCancelled.filter(r => {
      const promoDiscount = Number((r as any).promoDiscount || 0);
      const creditDiscount = Number((r as any).creditDiscount || 0);
      return ((!!(r as any).promoCode && promoDiscount > 0) || 
              promoDiscount > 0 || 
              creditDiscount > 0);
    });

    console.log(`Reservas autocanceladas, pagadas y con tarifa especial: ${specialTariffReservations.length}\n`);

    // 5. ANÁLISIS DETALLADO
    console.log('\n' + '='.repeat(80));
    console.log('📋 ANÁLISIS DETALLADO\n');
    console.log('='.repeat(80));

    if (specialTariffReservations.length === 0) {
      console.log('\n❌ No se encontraron reservas que cumplan todos los criterios:');
      console.log('   - Autocanceladas');
      console.log('   - Pagadas');
      console.log('   - Con tarifa especial\n');

      // Mostrar las que fueron pagadas pero sin tarifa especial
      if (paidAutoCancelled.length > 0) {
        console.log('\n📊 Reservas autocanceladas y pagadas (sin tarifa especial):');
        paidAutoCancelled.forEach((r, idx) => {
          const amount = Number(r.totalPrice || 0);
          console.log(`\n${idx + 1}. Reserva ${r.id}`);
          console.log(`   Usuario: ${r.user?.name || 'N/A'} (${r.user?.email || 'N/A'})`);
          console.log(`   Cancha: ${r.court?.name || 'N/A'}`);
          console.log(`   Monto: €${amount.toFixed(2)}`);
          console.log(`   PaymentStatus: ${(r as any).paymentStatus || 'N/A'}`);
          console.log(`   Status: ${r.status}`);
          console.log(`   PromoCode: ${(r as any).promoCode || 'N/A'}`);
          console.log(`   PromoDiscount: €${Number((r as any).promoDiscount || 0).toFixed(2)}`);
          console.log(`   CreditDiscount: €${Number((r as any).creditDiscount || 0).toFixed(2)}`);
        });
      }
    } else {
      let totalOriginal = 0;
      let totalDiscounts = 0;
      let totalRefunded = 0;
      let totalCreditsRefunded = 0;

      specialTariffReservations.forEach((reservation, idx) => {
        const amount = Number(reservation.totalPrice || 0);
        const promoDiscount = Number((reservation as any).promoDiscount || 0);
        const creditDiscount = Number((reservation as any).creditDiscount || 0);
        const totalDiscount = promoDiscount + creditDiscount;
        const originalAmount = amount + totalDiscount;

        totalOriginal += originalAmount;
        totalDiscounts += totalDiscount;

        // Buscar si fue reembolsada
        const refundPayment = refundedPayments.find(p => p.referenceId === reservation.id);
        if (refundPayment) {
          totalRefunded += amount;
          if (refundPayment.creditAmount) {
            totalCreditsRefunded += Number(refundPayment.creditAmount);
          }
        }

        // Buscar eventos relacionados
        const relatedEvents = autoCancelledEvents.filter(ev => {
          const data = ev.eventData as any;
          return data?.reservationId === reservation.id;
        });

        const centerSettings: any = (reservation.court?.center as any)?.settings || {};

        console.log(`\n${idx + 1}. 🔹 Reserva ID: ${reservation.id}`);
        console.log(`   👤 Usuario: ${reservation.user?.name || 'N/A'} (${reservation.user?.email || 'N/A'})`);
        console.log(`   🏟️  Cancha: ${reservation.court?.name || 'N/A'} - ${reservation.court?.center?.name || 'N/A'}`);
        console.log(`   📅 Fecha reserva: ${reservation.startTime.toISOString()}`);
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

        // Información de autocancelación
        if (relatedEvents.length > 0) {
          console.log(`   ⏰ AUTOCANCELACIÓN:`);
          relatedEvents.forEach((ev, evIdx) => {
            const data = ev.eventData as any;
            console.log(`      ${evIdx + 1}. Fecha: ${ev.createdAt.toISOString()}`);
            if (data?.reason) {
              console.log(`         Razón: ${data.reason}`);
            }
            if (data?.minutesAgo) {
              console.log(`         Minutos sin pago: ${data.minutesAgo}`);
            }
            if (data?.originalStatus) {
              console.log(`         Estado original: ${data.originalStatus}`);
            }
          });
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
          console.log(`   ⚠️  NO REEMBOLSADA (aunque fue pagada y autocancelada)`);
        }

        console.log(`   📝 Notas: ${reservation.notes || 'Sin notas'}`);
      });

      // 6. ESTADÍSTICAS
      console.log('\n' + '='.repeat(80));
      console.log('📈 ESTADÍSTICAS\n');
      console.log('='.repeat(80));

      const refundedCount = specialTariffReservations.filter(r => 
        refundedPayments.some(p => p.referenceId === r.id)
      ).length;

      console.log(`\nTotal de reservas: ${specialTariffReservations.length}`);
      console.log(`Total monto original (sin descuentos): €${totalOriginal.toFixed(2)}`);
      console.log(`Total descuentos aplicados: €${totalDiscounts.toFixed(2)}`);
      console.log(`Total monto final pagado: €${(totalOriginal - totalDiscounts).toFixed(2)}`);
      console.log(`\nReembolsadas: ${refundedCount}`);
      console.log(`No reembolsadas: ${specialTariffReservations.length - refundedCount}`);
      if (refundedCount > 0) {
        console.log(`Total reembolsado: €${totalRefunded.toFixed(2)}`);
        console.log(`Total créditos reembolsados: ${totalCreditsRefunded.toFixed(2)} créditos`);
      }
    }

    // 7. RESUMEN COMPARATIVO
    console.log('\n' + '='.repeat(80));
    console.log('📊 RESUMEN COMPARATIVO\n');
    console.log('='.repeat(80));

    console.log(`\nReservas autocanceladas (total): ${autoCancelledReservations.length}`);
    console.log(`  - Pagadas: ${paidAutoCancelled.length}`);
    console.log(`  - No pagadas: ${autoCancelledReservations.length - paidAutoCancelled.length}`);
    console.log(`\nReservas autocanceladas y pagadas: ${paidAutoCancelled.length}`);
    console.log(`  - Con tarifa especial: ${specialTariffReservations.length}`);
    console.log(`  - Sin tarifa especial: ${paidAutoCancelled.length - specialTariffReservations.length}`);

  } catch (error) {
    console.error('❌ Error en auditoría:', error);
    throw error;
  } finally {
    await db.$disconnect();
  }
}

// Necesitamos obtener los pagos reembolsados también
let refundedPayments: any[] = [];

async function runAudit() {
  try {
    // Primero obtener los pagos reembolsados
    refundedPayments = await db.payment.findMany({
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

    // Ejecutar la auditoría
    await auditAutoCancelledPaidSpecial();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

runAudit()
  .then(() => {
    console.log('\n✅ Auditoría completada');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error en auditoría:', error);
    process.exit(1);
  });






