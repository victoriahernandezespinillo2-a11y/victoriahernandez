
import * as fs from 'fs';
import * as path from 'path';
import { db } from '../packages/db/src/index.js';

async function checkReservations() {
    try {
        console.log('🔍 Buscando TODAS las reservas para el 25 de Noviembre de 2025...\n');

        const reservations = await db.reservation.findMany({
            where: {
                startTime: {
                    gte: new Date('2025-11-22T00:00:00Z'),
                    lte: new Date('2025-11-22T23:59:59Z'),
                },
                status: {
                    in: ['PAID', 'PENDING', 'IN_PROGRESS']
                }
            },
            include: {
                court: true,
                user: true
            }
        });

        console.log(`✅ Encontradas ${reservations.length} reservas.`);

        const output = {
            reservations
        };

        fs.writeFileSync(path.join(process.cwd(), 'court-info.json'), JSON.stringify(output, null, 2));
        console.log('✅ Output written to court-info.json');

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await db.$disconnect();
    }
}

checkReservations();
