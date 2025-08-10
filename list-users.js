const { PrismaClient } = require('@prisma/client');
const path = require('path');
const fs = require('fs');

// Cargar .env del raíz si existe
const envPath = path.resolve(__dirname, '.env');
if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
}

(async () => {
  const prisma = new PrismaClient({
    log: ['error']
  });
  try {
    await prisma.$connect();

    const count = await prisma.user.count();
    console.log(`Total de usuarios: ${count}`);

    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true,
        emailVerified: true,
        createdAt: true,
      }
    });

    if (users.length === 0) {
      console.log('No hay usuarios.');
    } else {
      console.log('Últimos usuarios creados:');
      users.forEach(u => {
        console.log(`- ${u.id} | ${u.email} | ${u.firstName ?? ''} ${u.lastName ?? ''} | activo=${u.isActive} | verificado=${u.emailVerified} | creado=${u.createdAt.toISOString()}`);
      });
    }
  } catch (e) {
    console.error('Error listando usuarios:', e?.message || e);
  } finally {
    await prisma.$disconnect();
  }
})();



