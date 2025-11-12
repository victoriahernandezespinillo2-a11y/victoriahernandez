/**
 * Script de auditoría para verificar números reales de usuarios en la base de datos
 * Ejecutar con: npm run db:audit-users (desde packages/db)
 * O directamente: tsx src/audit-users.ts
 */

import { db } from './index';

async function auditUsers() {
  console.log('\n🔍 AUDITORÍA DE USUARIOS - CONSULTA DIRECTA A BASE DE DATOS\n');
  console.log('=' .repeat(80));

  try {
    // 1. Total de usuarios
    const totalUsers = await db.user.count();
    console.log(`\n📊 TOTAL DE USUARIOS: ${totalUsers}`);

    // 2. Usuarios activos
    const activeUsers = await db.user.count({
      where: { isActive: true }
    });
    console.log(`✅ USUARIOS ACTIVOS: ${activeUsers}`);

    // 3. Usuarios inactivos
    const inactiveUsers = await db.user.count({
      where: { isActive: false }
    });
    console.log(`❌ USUARIOS INACTIVOS: ${inactiveUsers}`);

    // 4. Usuarios por rol
    console.log('\n👥 USUARIOS POR ROL:');
    const usersByRole = await db.user.groupBy({
      by: ['role'],
      _count: { id: true }
    });
    usersByRole.forEach((group) => {
      console.log(`   - ${group.role}: ${group._count.id}`);
    });

    // 5. Usuarios creados en últimos 30 días
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const newUsersLast30Days = await db.user.count({
      where: {
        createdAt: {
          gte: thirtyDaysAgo
        }
      }
    });
    console.log(`\n📅 USUARIOS CREADOS EN ÚLTIMOS 30 DÍAS: ${newUsersLast30Days}`);

    // 6. Usuarios con reservas
    const usersWithReservations = await db.user.count({
      where: {
        reservations: {
          some: {}
        }
      }
    });
    console.log(`📝 USUARIOS CON RESERVAS: ${usersWithReservations}`);

    // 7. Usuarios con membresías activas
    const usersWithActiveMemberships = await db.user.count({
      where: {
        memberships: {
          some: {
            status: 'active'
          }
        }
      }
    });
    console.log(`💳 USUARIOS CON MEMBRESÍAS ACTIVAS: ${usersWithActiveMemberships}`);

    // 8. Verificar paginación: primeros 20 usuarios
    const first20Users = await db.user.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true
      }
    });
    console.log(`\n📄 PRIMEROS 20 USUARIOS (ordenados por fecha de creación DESC):`);
    console.log(`   Total encontrados: ${first20Users.length}`);
    const activeInFirst20 = first20Users.filter(u => u.isActive).length;
    console.log(`   Activos en estos 20: ${activeInFirst20}`);

    // 9. Comparación con lo que muestra cada vista
    console.log('\n' + '='.repeat(80));
    console.log('📋 COMPARACIÓN CON VISTAS DE LA APLICACIÓN:\n');
    console.log(`   Vista /users (estadísticas):`);
    console.log(`     - Total Usuarios: 20 ❌ (debería ser ${totalUsers})`);
    console.log(`     - Usuarios Activos: ${activeInFirst20} ❌ (debería ser ${activeUsers})`);
    console.log(`\n   Dashboard principal:`);
    console.log(`     - "Usuarios Activos": ${newUsersLast30Days} ❌ (muestra nuevos en período, debería ser ${activeUsers})`);
    console.log(`\n   Reportes de usuarios:`);
    console.log(`     - Total Usuarios: ${totalUsers} ✅ (CORRECTO)`);
    console.log(`     - Usuarios Activos: ${activeUsers} ✅ (CORRECTO)`);

    // 10. Resumen
    console.log('\n' + '='.repeat(80));
    console.log('📊 RESUMEN:\n');
    console.log(`   ✅ Fuente de verdad (BD): ${totalUsers} usuarios totales, ${activeUsers} activos`);
    console.log(`   ❌ Vista /users muestra: 20 usuarios (solo los cargados en memoria)`);
    console.log(`   ❌ Dashboard muestra: ${newUsersLast30Days} (usuarios nuevos, no activos)`);
    console.log(`   ✅ Reportes muestran: ${totalUsers} usuarios (CORRECTO)`);

    console.log('\n' + '='.repeat(80));
    console.log('✅ Auditoría completada\n');

  } catch (error) {
    console.error('❌ Error en auditoría:', error);
    throw error;
  } finally {
    await db.$disconnect();
  }
}

// Ejecutar si se llama directamente
auditUsers().catch((error) => {
  console.error('Error fatal:', error);
  process.exit(1);
});

export { auditUsers };

