#!/usr/bin/env node

/**
 * Script para verificar y crear usuario administrador
 * Ejecutar: node check-admin-user.js
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkAndCreateAdmin() {
  try {
    console.log('🔍 Verificando estado de la base de datos...');
    
    // Verificar conexión
    await prisma.$connect();
    console.log('✅ Conexión a la base de datos exitosa');
    
    // Verificar si existe algún usuario
    const userCount = await prisma.user.count();
    console.log(`📊 Total de usuarios en la base de datos: ${userCount}`);
    
    // Verificar si existe algún usuario admin
    const adminUsers = await prisma.user.findMany({
      where: {
        role: 'ADMIN'
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true
      }
    });
    
    console.log(`👑 Usuarios administradores encontrados: ${adminUsers.length}`);
    
    if (adminUsers.length > 0) {
      console.log('\n📋 Usuarios administradores existentes:');
      adminUsers.forEach((user, index) => {
        console.log(`  ${index + 1}. ${user.name || 'Sin nombre'} (${user.email})`);
        console.log(`     ID: ${user.id}`);
        console.log(`     Rol: ${user.role}`);
        console.log(`     Activo: ${user.isActive ? 'SÍ' : 'NO'}`);
        console.log(`     Creado: ${user.createdAt.toISOString()}`);
        console.log('');
      });
    }
    
    // Verificar si existe algún usuario activo
    const activeUsers = await prisma.user.findMany({
      where: {
        isActive: true
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true
      }
    });
    
    console.log(`🟢 Usuarios activos: ${activeUsers.length}`);
    
    if (activeUsers.length === 0) {
      console.log('\n⚠️  No hay usuarios activos en el sistema');
      console.log('   Esto puede causar problemas de autenticación');
    }
    
    // Verificar configuración de roles
    const roles = await prisma.user.groupBy({
      by: ['role'],
      _count: {
        role: true
      }
    });
    
    console.log('\n🎭 Distribución de roles:');
    roles.forEach(role => {
      console.log(`  ${role.role}: ${role._count.role} usuarios`);
    });
    
    // Crear usuario admin si no existe
    if (adminUsers.length === 0) {
      console.log('\n🔧 Creando usuario administrador por defecto...');
      
      const adminUser = await prisma.user.create({
        data: {
          email: 'admin@polideportivo.com',
          name: 'Administrador',
          password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8Kq8Kq8', // 'admin123'
          role: 'ADMIN',
          isActive: true,
          emailVerified: new Date(),
          centerId: null
        }
      });
      
      console.log('✅ Usuario administrador creado exitosamente:');
      console.log(`   ID: ${adminUser.id}`);
      console.log(`   Email: ${adminUser.email}`);
      console.log(`   Contraseña: admin123`);
      console.log('\n⚠️  IMPORTANTE: Cambia la contraseña después del primer inicio de sesión');
    }
    
    // Verificar configuración de centros
    const centers = await prisma.center.findMany({
      select: {
        id: true,
        name: true,
        isActive: true
      }
    });
    
    console.log(`\n🏢 Centros configurados: ${centers.length}`);
    if (centers.length === 0) {
      console.log('   No hay centros configurados');
    } else {
      centers.forEach(center => {
        console.log(`   - ${center.name} (${center.isActive ? 'Activo' : 'Inactivo'})`);
      });
    }
    
    // Verificar configuración de productos
    const products = await prisma.product.count();
    console.log(`\n📦 Productos en el sistema: ${products}`);
    
    // Verificar configuración de canchas
    const courts = await prisma.court.count();
    console.log(`🏟️  Canchas en el sistema: ${courts}`);
    
    console.log('\n✅ Diagnóstico completado');
    
  } catch (error) {
    console.error('❌ Error durante el diagnóstico:', error);
    
    if (error.code === 'P1001') {
      console.log('\n💡 Solución: Verifica que la base de datos esté ejecutándose');
      console.log('   - PostgreSQL debe estar activo');
      console.log('   - Las credenciales en .env deben ser correctas');
    } else if (error.code === 'P2002') {
      console.log('\n💡 Solución: El email ya existe, no se puede crear duplicado');
    } else if (error.code === 'P2025') {
      console.log('\n💡 Solución: Recurso no encontrado, verifica la estructura de la BD');
    }
    
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar el diagnóstico
checkAndCreateAdmin();
