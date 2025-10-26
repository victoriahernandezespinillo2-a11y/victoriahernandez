/**
 * Script de auditoría completa de reservas de usuarios específicos
 * Muestra toda la información relevante para diagnosticar por qué una reserva quedó en PENDING
 */

import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';

config();

const prisma = new PrismaClient();

const TARGET_EMAILS = ['alheco78@gmail.com', 'piratasoft@gmail.com', 'cieloyverdad@gmail.com'];

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🔍 AUDITORÍA COMPLETA DE RESERVAS');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`📧 Usuarios: ${TARGET_EMAILS.join(', ')}\n`);

  // 1. Obtener usuarios
  const users = await prisma.user.findMany({
    where: { email: { in: TARGET_EMAILS } },
    select: { id: true, email: true, name: true, createdAt: true },
  });

  if (users.length === 0) {
    console.log('❌ No se encontraron usuarios con esos correos.');
    return;
  }

  console.log('👥 USUARIOS ENCONTRADOS:');
  users.forEach(u => {
    console.log(`   • ${u.email} (${u.name}) - ID: ${u.id}`);
    console.log(`     Registrado: ${u.createdAt.toISOString()}\n`);
  });

  const userIds = users.map(u => u.id);

  // 2. Obtener TODAS las reservas (no solo PENDING)
  const reservations = await prisma.reservation.findMany({
    where: { userId: { in: userIds } },
    select: {
      id: true,
      userId: true,
      courtId: true,
      status: true,
      paymentStatus: true,
      paymentMethod: true,
      totalPrice: true,
      startTime: true,
      endTime: true,
      expiresAt: true,
      createdAt: true,
      updatedAt: true,
      notes: true,
      user: { select: { email: true } },
      court: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`📋 RESERVAS ENCONTRADAS: ${reservations.length}`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  reservations.forEach((r, idx) => {
    const now = new Date();
    const expired = r.expiresAt && r.expiresAt < now;
    const started = r.startTime < now;
    
    console.log(`\n┌─ RESERVA ${idx + 1} ─────────────────────────────────────────────────`);
    console.log(`│ ID: ${r.id}`);
    console.log(`│ Usuario: ${r.user.email}`);
    console.log(`│ Cancha: ${r.court?.name || 'N/A'}`);
    console.log(`│`);
    console.log(`│ 📊 ESTADO:`);
    console.log(`│    Status: ${r.status} ${r.status === 'PENDING' ? '⚠️' : r.status === 'PAID' ? '✅' : '❌'}`);
    console.log(`│    Payment Status: ${r.paymentStatus}`);
    console.log(`│    Payment Method: ${r.paymentMethod || 'NULL ⚠️'}`);
    console.log(`│`);
    console.log(`│ 💰 PRECIO: €${r.totalPrice}`);
    console.log(`│`);
    console.log(`│ 📅 FECHAS:`);
    console.log(`│    Creada: ${r.createdAt.toISOString()}`);
    console.log(`│    Inicio: ${r.startTime.toISOString()} ${started ? '(YA PASÓ ⚠️)' : ''}`);
    console.log(`│    Fin: ${r.endTime.toISOString()}`);
    console.log(`│    Expira: ${r.expiresAt ? r.expiresAt.toISOString() : 'NULL ⚠️'} ${expired ? '(EXPIRADA ⚠️)' : ''}`);
    console.log(`│`);
    console.log(`│ 🔍 DIAGNÓSTICO:`);
    
    // Diagnóstico automático
    if (r.status === 'PENDING') {
      if (!r.paymentMethod) {
        console.log(`│    ⚠️ PROBLEMA: paymentMethod es NULL`);
        console.log(`│       → Reserva creada antes del fix`);
        console.log(`│       → El limpiador no la detecta`);
      } else if (r.paymentMethod === 'LINK') {
        console.log(`│    ⚠️ PROBLEMA: paymentMethod es LINK`);
        console.log(`│       → Usuario no completó el pago en Redsys`);
        if (expired) {
          console.log(`│       → Ya expiró pero el limpiador no incluye 'LINK'`);
        }
      }
      
      if (!r.expiresAt) {
        console.log(`│    ⚠️ PROBLEMA: expiresAt es NULL`);
        console.log(`│       → No tiene tiempo de expiración definido`);
      } else if (expired) {
        console.log(`│    ⚠️ PROBLEMA: Ya expiró hace ${Math.floor((now.getTime() - r.expiresAt.getTime()) / 60000)} minutos`);
      }
      
      if (started) {
        console.log(`│    ⚠️ PROBLEMA: La reserva ya comenzó (hace ${Math.floor((now.getTime() - r.startTime.getTime()) / 60000)} minutos)`);
      }
    }
    
    if (r.notes) {
      console.log(`│`);
      console.log(`│ 📝 Notas: ${r.notes}`);
    }
    console.log(`└────────────────────────────────────────────────────────────────`);
  });

  // 3. Obtener eventos de auditoría
  console.log('\n\n═══════════════════════════════════════════════════════════════');
  console.log('📜 EVENTOS DE AUDITORÍA (OUTBOX)');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const reservationIds = reservations.map(r => r.id);
  
  const events = await prisma.outboxEvent.findMany({
    where: {
      OR: [
        { eventData: { path: ['reservationId'], in: reservationIds } as any },
        { eventData: { path: ['userId'], in: userIds } as any },
      ],
    },
    select: {
      id: true,
      eventType: true,
      eventData: true,
      createdAt: true,
      processedAt: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  console.log(`Total de eventos: ${events.length}\n`);

  // Agrupar por reserva
  const eventsByReservation = new Map<string, any[]>();
  
  events.forEach(e => {
    const resId = (e.eventData as any)?.reservationId;
    if (resId) {
      if (!eventsByReservation.has(resId)) {
        eventsByReservation.set(resId, []);
      }
      eventsByReservation.get(resId)!.push(e);
    }
  });

  reservations.forEach(r => {
    const resEvents = eventsByReservation.get(r.id) || [];
    if (resEvents.length > 0) {
      console.log(`\n🔖 Reserva ${r.id} (${r.user.email}):`);
      resEvents.forEach(e => {
        const processed = e.processedAt ? '✅' : '⏳';
        console.log(`   ${processed} ${e.createdAt.toISOString()} | ${e.eventType}`);
        if (e.eventType === 'PAYMENT_LINK_CREATED') {
          console.log(`      → URL: ${(e.eventData as any)?.url || 'N/A'}`);
        }
      });
      
      // Análisis de eventos
      const hasPaymentLink = resEvents.some(e => e.eventType === 'PAYMENT_LINK_CREATED');
      const hasPaid = resEvents.some(e => e.eventType === 'RESERVATION_PAID' || e.eventType === 'PAYMENT_RECORDED');
      const hasExpired = resEvents.some(e => e.eventType === 'RESERVATION_EXPIRED');
      
      console.log(`\n   📊 Análisis:`);
      console.log(`      • Enlace de pago generado: ${hasPaymentLink ? 'SÍ' : 'NO'}`);
      console.log(`      • Pago completado: ${hasPaid ? 'SÍ' : 'NO ⚠️'}`);
      console.log(`      • Evento de expiración: ${hasExpired ? 'SÍ' : 'NO ⚠️'}`);
    }
  });

  console.log('\n\n═══════════════════════════════════════════════════════════════');
  console.log('📊 RESUMEN EJECUTIVO');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const pendingReservations = reservations.filter(r => r.status === 'PENDING');
  const pendingWithNullMethod = pendingReservations.filter(r => !r.paymentMethod);
  const pendingWithLink = pendingReservations.filter(r => r.paymentMethod === 'LINK');
  const pendingExpired = pendingReservations.filter(r => r.expiresAt && r.expiresAt < new Date());

  console.log(`Total reservas: ${reservations.length}`);
  console.log(`Reservas PENDING: ${pendingReservations.length}`);
  console.log(`  → Con paymentMethod NULL: ${pendingWithNullMethod.length} ⚠️`);
  console.log(`  → Con paymentMethod LINK: ${pendingWithLink.length} ⚠️`);
  console.log(`  → Expiradas: ${pendingExpired.length} ⚠️`);
  
  console.log('\n🔧 RECOMENDACIONES:\n');
  
  if (pendingWithNullMethod.length > 0) {
    console.log('1. Actualizar limpiador para incluir paymentMethod NULL');
    console.log('   Archivo: apps/api/src/lib/middleware/index.ts');
    console.log('   Añadir: { paymentMethod: null } al OR del where\n');
  }
  
  if (pendingWithLink.length > 0) {
    console.log('2. Actualizar limpiador para incluir paymentMethod LINK');
    console.log('   Archivo: apps/api/src/lib/middleware/index.ts');
    console.log('   Cambiar: paymentMethod: { in: [\'CARD\',\'BIZUM\',\'CREDITS\'] }');
    console.log('   Por: paymentMethod: { in: [\'CARD\',\'BIZUM\',\'CREDITS\',\'LINK\'] }\n');
  }
  
  if (pendingExpired.length > 0) {
    console.log('3. Ejecutar script de limpieza para regularizar reservas históricas');
    console.log('   Script: scripts/cancel_pending_null_method.ts\n');
  }

  console.log('═══════════════════════════════════════════════════════════════\n');
}

main()
  .catch((e) => {
    console.error('\n❌ ERROR:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

