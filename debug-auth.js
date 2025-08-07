// Script para depurar problemas de autenticación
// Cambiar al directorio del workspace web
process.chdir('./apps/web');

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function debugAuth() {
  try {
    console.log('🔍 Iniciando depuración de autenticación...');
    
    // 1. Verificar conexión con Prisma
    console.log('\n1. Probando conexión con Prisma...');
    const userCount = await prisma.user.count();
    console.log(`✅ Conexión exitosa. Total de usuarios: ${userCount}`);
    
    // 2. Buscar el usuario específico
    console.log('\n2. Buscando usuario test@gmail.com...');
    const user = await prisma.user.findUnique({
      where: { email: 'test@gmail.com' },
      select: {
        id: true,
        email: true,
        name: true,
        password: true,
        role: true,
        isActive: true,
        createdAt: true
      }
    });
    
    if (!user) {
      console.log('❌ Usuario no encontrado en Prisma');
      return;
    }
    
    console.log('✅ Usuario encontrado:', {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
      hasPassword: !!user.password,
      passwordLength: user.password ? user.password.length : 0,
      passwordPrefix: user.password ? user.password.substring(0, 10) + '...' : 'N/A',
      createdAt: user.createdAt
    });
    
    // 3. Probar validación de contraseña
    console.log('\n3. Probando validación de contraseñas...');
    const testPasswords = ['admin123', '123456', 'password', 'test123', 'admin'];
    
    for (const testPassword of testPasswords) {
      try {
        const isValid = await bcrypt.compare(testPassword, user.password);
        console.log(`🔐 Contraseña '${testPassword}': ${isValid ? '✅ VÁLIDA' : '❌ inválida'}`);
        
        if (isValid) {
          console.log(`🎉 ¡Contraseña correcta encontrada: ${testPassword}!`);
          break;
        }
      } catch (error) {
        console.log(`❌ Error probando '${testPassword}':`, error.message);
      }
    }
    
    // 4. Verificar el tipo de hash
    console.log('\n4. Analizando tipo de hash...');
    if (user.password) {
      if (user.password.startsWith('$2a$')) {
        console.log('✅ Hash tipo bcrypt detectado ($2a$)');
      } else if (user.password.startsWith('$2b$')) {
        console.log('✅ Hash tipo bcrypt detectado ($2b$)');
      } else {
        console.log('⚠️ Tipo de hash desconocido:', user.password.substring(0, 10));
      }
    }
    
    // 5. Probar crear un nuevo hash para comparar
    console.log('\n5. Creando hash de prueba...');
    const testHash = await bcrypt.hash('admin123', 12);
    console.log('Hash de prueba creado:', testHash.substring(0, 20) + '...');
    
    const testValidation = await bcrypt.compare('admin123', testHash);
    console.log('Validación del hash de prueba:', testValidation ? '✅ OK' : '❌ FALLO');
    
  } catch (error) {
    console.error('❌ Error en depuración:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugAuth();