// Actualiza la contraseña del administrador en la base de datos (Supabase/Postgres)
const path = require('path');
const fs = require('fs');
const dotenvPathCandidates = [
	path.resolve(__dirname, '../../.env'),
	path.resolve(process.cwd(), '.env'),
];
for (const p of dotenvPathCandidates) {
	if (fs.existsSync(p)) {
		require('dotenv').config({ path: p });
		break;
	}
}

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

(async () => {
	const prisma = new PrismaClient();
	const email = process.env.ADMIN_EMAIL || 'admin@polideportivovictoriahernandez.es';
	const newPassword = process.argv[2] || process.env.ADMIN_PASSWORD || 'Admin123!';

	if (!process.env.DATABASE_URL) {
		console.error('ERROR: DATABASE_URL no está definido. Asegúrate de tener .env con DATABASE_URL.');
		process.exit(1);
	}

	try {
		await prisma.$connect();
		const hashed = await bcrypt.hash(newPassword, 12);
		const user = await prisma.user.upsert({
			where: { email },
			update: { password: hashed, role: 'ADMIN', isActive: true, emailVerified: true },
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
		console.log('✅ Admin actualizado/creado:', user);
		console.log(`🔑 Nueva contraseña establecida para ${email}`);
	} catch (e) {
		console.error('❌ Error actualizando contraseña de admin:', e?.message || e);
		process.exit(1);
	} finally {
		await prisma.$disconnect();
	}
})();



