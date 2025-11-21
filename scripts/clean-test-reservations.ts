import { db } from '@repo/db';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

async function cleanTestReservations() {
    try {
        console.log('🧹 Limpiando reservas de usuarios de prueba...\n');

        // Buscar IDs de los usuarios
        const users = await db.user.findMany({
            where: {
                email: {
                    in: ['cieloyverdad@gmail.com', 'gabbx.nlfn@gmail.com']
                }
            },
            select: {
                id: true,
                email: true,
                name: true
            }
        });

        if (users.length === 0) {
            console.log('❌ No se encontraron usuarios con esos emails');
            return;
        }

        console.log(`✅ Usuarios encontrados: ${users.length}`);
        users.forEach(user => {
            console.log(`   - ${user.email} (${user.name})`);
        });

        const userIds = users.map(u => u.id);

        // Eliminar reservas de estos usuarios
        const deleted = await db.reservation.deleteMany({
            where: {
                userId: {
                    in: userIds
                }
            }
        });

        console.log(`\n🗑️  Reservas eliminadas: ${deleted.count}`);
        console.log('✅ Limpieza completada exitosamente\n');

    } catch (error) {
        console.error('❌ Error limpiando reservas:', error);
        process.exit(1);
    } finally {
        await db.$disconnect();
    }
}

cleanTestReservations();
