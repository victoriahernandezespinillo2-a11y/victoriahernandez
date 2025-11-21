
import { PrismaClient } from '@repo/db';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
    const courtName = 'TEST 1 NO UTILIZAR';
    const outputPath = path.join(process.cwd(), 'debug-output.json');

    try {
        const court = await prisma.court.findFirst({
            where: { name: courtName },
            include: {
                reservations: {
                    where: {
                        startTime: {
                            gte: new Date('2025-11-25T00:00:00Z'),
                            lte: new Date('2025-11-25T23:59:59Z'),
                        }
                    }
                }
            }
        });

        const result = {
            found: !!court,
            court: court ? {
                id: court.id,
                name: court.name,
                isMultiuse: court.isMultiuse,
                primarySport: court.primarySport,
                allowedSports: court.allowedSports,
                reservations: court.reservations.map(r => ({
                    id: r.id,
                    sport: r.sport,
                    startTime: r.startTime,
                    endTime: r.endTime,
                    status: r.status
                }))
            } : null
        };

        fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
        console.log('Debug info written to debug-output.json');
    } catch (error) {
        fs.writeFileSync(outputPath, JSON.stringify({ error: error.message }, null, 2));
        console.error('Error written to debug-output.json');
    } finally {
        await prisma.$disconnect();
    }
}

main();
