
import { PrismaClient } from '@repo/db';

const prisma = new PrismaClient();

async function main() {
    const courtName = 'TEST 1 NO UTILIZAR';
    console.log(`🔍 Searching for court: ${courtName}`);

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

    if (!court) {
        console.error('❌ Court not found!');
        return;
    }

    console.log('✅ Court Found:');
    console.log(JSON.stringify({
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
    }, null, 2));
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
