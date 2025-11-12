/**
 * Script de auditoría para verificar reservas en el período
 * Similar a audit-users.ts pero para reservas
 */

import { db } from './index';

async function auditReservations() {
  try {
    console.log('🔍 Iniciando auditoría de reservas...\n');

    // Calcular rango de fechas (último año)
    const today = new Date();
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(today.getFullYear() - 1);
    
    const startDate = new Date(oneYearAgo);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(today);
    endDate.setHours(23, 59, 59, 999);

    console.log(`📅 Período de análisis: ${startDate.toISOString()} a ${endDate.toISOString()}\n`);

    // 1. Total de reservas por startTime
    const totalByStartTime = await db.reservation.count({
      where: {
        startTime: {
          gte: startDate,
          lte: endDate
        }
      }
    });

    // 2. Total de reservas por paidAt
    const totalByPaidAt = await db.reservation.count({
      where: {
        paidAt: {
          gte: startDate,
          lte: endDate
        }
      }
    });

    // 3. Total de reservas por createdAt
    const totalByCreatedAt = await db.reservation.count({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      }
    });

    // 4. Reservas por estado (en el período por startTime)
    const byStatus = await db.reservation.groupBy({
      by: ['status'],
      where: {
        startTime: {
          gte: startDate,
          lte: endDate
        }
      },
      _count: { id: true }
    });

    // 5. Reservas por estado (en el período por paidAt)
    const byStatusPaidAt = await db.reservation.groupBy({
      by: ['status'],
      where: {
        paidAt: {
          gte: startDate,
          lte: endDate
        }
      },
      _count: { id: true }
    });

    // 6. Reservas con paidAt null en el período
    const withPaidAtNull = await db.reservation.count({
      where: {
        startTime: {
          gte: startDate,
          lte: endDate
        },
        paidAt: null
      }
    });

    // 7. Reservas con paidAt en el período
    const withPaidAt = await db.reservation.count({
      where: {
        startTime: {
          gte: startDate,
          lte: endDate
        },
        paidAt: {
          not: null
        }
      }
    });

    // 8. Total de transacciones en ledger (para comparar)
    const ledgerTransactions = await db.ledgerTransaction.count({
      where: {
        direction: 'CREDIT',
        paymentStatus: 'PAID',
        paidAt: {
          gte: startDate,
          lte: endDate
        }
      }
    });

    // 9. Transacciones de reservas en ledger
    const ledgerReservations = await db.ledgerTransaction.count({
      where: {
        direction: 'CREDIT',
        paymentStatus: 'PAID',
        sourceType: 'RESERVATION',
        paidAt: {
          gte: startDate,
          lte: endDate
        }
      }
    });

    console.log('📊 RESULTADOS DE LA AUDITORÍA:\n');
    console.log('='.repeat(60));
    console.log(`Total de reservas por startTime: ${totalByStartTime}`);
    console.log(`Total de reservas por paidAt: ${totalByPaidAt}`);
    console.log(`Total de reservas por createdAt: ${totalByCreatedAt}`);
    console.log('='.repeat(60));
    console.log(`\nReservas con paidAt NULL (en período startTime): ${withPaidAtNull}`);
    console.log(`Reservas con paidAt (en período startTime): ${withPaidAt}`);
    console.log('='.repeat(60));
    console.log(`\nTotal transacciones en ledger: ${ledgerTransactions}`);
    console.log(`Transacciones de RESERVATION en ledger: ${ledgerReservations}`);
    console.log('='.repeat(60));

    console.log('\n📋 Reservas por estado (filtro por startTime):');
    byStatus.forEach(item => {
      console.log(`  ${item.status}: ${item._count.id}`);
    });

    console.log('\n📋 Reservas por estado (filtro por paidAt):');
    byStatusPaidAt.forEach(item => {
      console.log(`  ${item.status}: ${item._count.id}`);
    });

    // 10. Muestra algunas reservas de ejemplo
    console.log('\n\n🔍 Ejemplos de reservas (primeras 5 por startTime):');
    const sampleReservations = await db.reservation.findMany({
      where: {
        startTime: {
          gte: startDate,
          lte: endDate
        }
      },
      select: {
        id: true,
        status: true,
        startTime: true,
        paidAt: true,
        createdAt: true,
        totalPrice: true
      },
      take: 5,
      orderBy: { startTime: 'desc' }
    });

    sampleReservations.forEach((r, i) => {
      console.log(`\n  ${i + 1}. ID: ${r.id}`);
      console.log(`     Status: ${r.status}`);
      console.log(`     startTime: ${r.startTime}`);
      console.log(`     paidAt: ${r.paidAt || 'NULL'}`);
      console.log(`     createdAt: ${r.createdAt}`);
      console.log(`     totalPrice: ${r.totalPrice}`);
    });

    console.log('\n✅ Auditoría completada\n');
  } catch (error) {
    console.error('❌ Error en auditoría:', error);
    throw error;
  } finally {
    await db.$disconnect();
  }
}

auditReservations();
