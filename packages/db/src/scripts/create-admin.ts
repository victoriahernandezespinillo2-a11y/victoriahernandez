import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

async function main() {
  const prisma = new PrismaClient();
  const email = process.env.ADMIN_EMAIL || 'admin@polideportivo.com';
  const password = process.env.ADMIN_PASSWORD || 'Admin123!';

  try {
    await prisma.$connect();
    const hashed = await bcrypt.hash(password, 12);

    const user = await prisma.user.upsert({
      where: { email },
      update: {
        role: 'ADMIN',
        isActive: true,
        emailVerified: true,
        emailVerifiedAt: new Date(),
        password: hashed,
      },
      create: {
        email,
        password: hashed,
        name: 'Administrador',
        role: 'ADMIN',
        isActive: true,
        emailVerified: true,
        emailVerifiedAt: new Date(),
      },
      select: { id: true, email: true, role: true, isActive: true }
    });

    console.log('Admin creado/actualizado:', user);
    console.log(`Credenciales -> email: ${email} | password: ${password}`);
  } catch (e) {
    console.error('Error creando admin:', e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();





