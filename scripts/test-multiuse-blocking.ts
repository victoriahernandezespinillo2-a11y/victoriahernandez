// import 'dotenv/config'; // Handled by @repo/db
import { db as prisma } from '@repo/db';

async function testMultiuseBlocking() {
    console.log('🧪 === INICIANDO TEST DE BLOQUEO MULTIUSO ===\n');

    try {
        // 1. Buscar la cancha multiuso "TEST 1 NO UTILIZAR"
        const court = await prisma.court.findFirst({
            where: {
                name: {
                    contains: 'TEST 1',
                    mode: 'insensitive',
                },
                isMultiuse: true,
            },
        });

        if (!court) {
            console.error('❌ No se encontró la cancha multiuso TEST 1');
            return;
        }

        console.log('✅ Cancha encontrada:', {
            id: court.id,
            name: court.name,
            primarySport: court.primarySport,
            allowedSports: court.allowedSports,
        });

        // 2. Buscar dos usuarios de prueba
        const users = await prisma.user.findMany({
            where: {
                email: {
                    in: ['cieloyverdad@gmail.com', 'gabbx.nlfn@gmail.com'],
                },
            },
            take: 2,
        });

        if (users.length < 2) {
            console.error('❌ No se encontraron suficientes usuarios de prueba');
            return;
        }

        const [user1, user2] = users;
        console.log('\n✅ Usuarios encontrados:', {
            user1: { id: user1.id, email: user1.email },
            user2: { id: user2.id, email: user2.email },
        });

        // 3. Limpiar reservas existentes en la fecha de prueba (25 de noviembre)
        await prisma.reservation.deleteMany({
            where: {
                courtId: court.id,
                startTime: {
                    gte: new Date('2025-11-25T00:00:00.000Z'),
                    lte: new Date('2025-11-25T23:59:59.999Z'),
                },
            },
        });

        console.log('\n✅ Reservas anteriores limpiadas para el 25 de noviembre');

        // ==========================================
        // TEST 1: Deporte Primario bloquea todo
        // ==========================================
        console.log('\n\n🧪 === TEST 1: Deporte Primario (Fútbol) debería BLOQUEAR todo ===');

        // Crear reserva de Fútbol (deporte primario) manualmente
        console.log('\n📝 Paso 1.1: Creando reserva de Fútbol (usuario 1)...');
        const reservation1 = await prisma.reservation.create({
            data: {
                courtId: court.id,
                userId: user1.id,
                startTime: new Date('2025-11-25T10:00:00.000Z'),
                endTime: new Date('2025-11-25T11:00:00.000Z'),
                sport: 'Fútbol',
                status: 'PAID',

                creditsUsed: 0,
                totalPrice: 0,
                paymentMethod: 'FREE',
            },
        });
        console.log('✅ Reserva de Fútbol creada:', reservation1.id);

        // Intentar crear reserva de Voleibol simulando la validación
        console.log('\n📝 Paso 1.2: Simulando validación de Voleibol en mismo horario...');
        console.log('⚠️  ESPERADO: Debería BLOQUEAR porque Fútbol es primario\n');

        // Obtener reservas conflictivas
        const conflicting1 = await prisma.reservation.findMany({
            where: {
                courtId: court.id,
                status: { in: ['PENDING', 'PAID'] },
                OR: [
                    {
                        startTime: { lt: new Date('2025-11-25T11:00:00.000Z') },
                        endTime: { gt: new Date('2025-11-25T10:00:00.000Z') },
                    },
                ],
            },
        });

        console.log(`🔍 Reservas conflictivas encontradas: ${conflicting1.length}`);
        conflicting1.forEach((r) => {
            console.log(`  - ${r.sport} (${r.startTime.toISOString()})`);
            const isPrimary = r.sport === court.primarySport;
            console.log(`    ¿Es primaria? ${isPrimary ? '✅ SÍ' : '❌ NO'}`);
            if (isPrimary) {
                console.log(`    ✅ CORRECTO: Bloquea todo`);
            }
        });

        // Limpiar
        await prisma.reservation.delete({ where: { id: reservation1.id } });
        console.log('\n🧹 Limpieza: Reserva de Fútbol eliminada');

        // ==========================================
        // TEST 2: Deporte Secundario + Deporte Secundario (DEBERÍA PERMITIRSE)
        // ==========================================
        console.log('\n\n🧪 === TEST 2: Dos Deportes Secundarios deberían PERMITIRSE ===');

        // Crear reserva de Voleibol (deporte secundario)
        console.log('\n📝 Paso 2.1: Creando reserva de Voleibol (usuario 1)...');
        const reservation2 = await prisma.reservation.create({
            data: {
                courtId: court.id,
                userId: user1.id,
                startTime: new Date('2025-11-25T12:00:00.000Z'),
                endTime: new Date('2025-11-25T13:00:00.000Z'),
                sport: 'Voleibol',
                status: 'PAID',

                creditsUsed: 0,
                totalPrice: 0,
                paymentMethod: 'FREE',
            },
        });
        console.log('✅ Reserva de Voleibol creada:', reservation2.id);

        // Intentar validar reserva de Básquet
        console.log('\n📝 Paso 2.2: Simulando validación de Básquet en mismo horario...');
        console.log('⚠️  ESPERADO: Debería PERMITIRSE porque ambos son secundarios\n');

        const conflicting2 = await prisma.reservation.findMany({
            where: {
                courtId: court.id,
                status: { in: ['PENDING', 'PAID'] },
                OR: [
                    {
                        startTime: { lt: new Date('2025-11-25T13:00:00.000Z') },
                        endTime: { gt: new Date('2025-11-25T12:00:00.000Z') },
                    },
                ],
            },
        });

        console.log(`🔍 Reservas conflictivas encontradas: ${conflicting2.length}`);
        let shouldBlock = false;
        conflicting2.forEach((r) => {
            console.log(`  - ${r.sport} (${r.startTime.toISOString()})`);
            const isPrimary = r.sport === court.primarySport;
            const isNewSportPrimary = 'Básquet' === court.primarySport;
            const isNewSportSecondary = court.allowedSports?.includes('Básquet');

            console.log(`    Reserva existente es primaria: ${isPrimary ? '✅ SÍ' : '❌ NO'}`);
            console.log(`    Nueva reserva (Básquet) es primaria: ${isNewSportPrimary ? '✅ SÍ' : '❌ NO'}`);
            console.log(`    Nueva reserva (Básquet) es secundaria: ${isNewSportSecondary ? '✅ SÍ' : '❌ NO'}`);

            if (isPrimary) {
                console.log(`    ❌ BLOQUEADO: Hay una reserva primaria`);
                shouldBlock = true;
            } else if (isNewSportPrimary) {
                console.log(`    ❌ BLOQUEADO: Intentas reservar deporte primario`);
                shouldBlock = true;
            } else {
                console.log(`    ✅ PERMITIDO: Ambos son secundarios`);
            }
        });

        if (shouldBlock) {
            console.log('\n❌ ERROR: Se bloqueó cuando debería permitirse');
        } else {
            console.log('\n✅ CORRECTO: Se permitiría la reserva');
        }

        // Limpiar
        await prisma.reservation.delete({ where: { id: reservation2.id } });
        console.log('🧹 Reserva de Voleibol eliminada');

        // ==========================================
        // TEST 3: Deporte Secundario + Deporte Primario (DEBERÍA BLOQUEARSE)
        // ==========================================
        console.log('\n\n🧪 === TEST 3: Deporte Secundario + Primario debería BLOQUEARSE ===');

        // Crear reserva de Básquet (deporte secundario)
        console.log('\n📝 Paso 3.1: Creando reserva de Básquet (usuario 1)...');
        const reservation3 = await prisma.reservation.create({
            data: {
                courtId: court.id,
                userId: user1.id,
                startTime: new Date('2025-11-25T14:00:00.000Z'),
                endTime: new Date('2025-11-25T15:00:00.000Z'),
                sport: 'Básquet',
                status: 'PAID',

                creditsUsed: 0,
                totalPrice: 0,
                paymentMethod: 'FREE',
            },
        });
        console.log('✅ Reserva de Básquet creada:', reservation3.id);

        // Intentar validar reserva de Fútbol
        console.log('\n📝 Paso 3.2: Simulando validación de Fútbol en mismo horario...');
        console.log('⚠️  ESPERADO: Debería BLOQUEARSE porque Fútbol es primario\n');

        const conflicting3 = await prisma.reservation.findMany({
            where: {
                courtId: court.id,
                status: { in: ['PENDING', 'PAID'] },
                OR: [
                    {
                        startTime: { lt: new Date('2025-11-25T15:00:00.000Z') },
                        endTime: { gt: new Date('2025-11-25T14:00:00.000Z') },
                    },
                ],
            },
        });

        console.log(`🔍 Reservas conflictivas encontradas: ${conflicting3.length}`);
        let shouldBlock3 = false;
        conflicting3.forEach((r) => {
            console.log(`  - ${r.sport} (${r.startTime.toISOString()})`);
            const isNewSportPrimary = 'Fútbol' === court.primarySport;

            console.log(`    Nueva reserva (Fútbol) es primaria: ${isNewSportPrimary ? '✅ SÍ' : '❌ NO'}`);

            if (isNewSportPrimary) {
                console.log(`    ✅ CORRECTO: Bloqueado porque intentas reservar deporte primario`);
                shouldBlock3 = true;
            }
        });

        if (shouldBlock3) {
            console.log('\n✅ CORRECTO: Se bloquearía la reserva');
        } else {
            console.log('\n❌ ERROR: Se permitió cuando debería bloquearse');
        }

        // Limpiar
        await prisma.reservation.delete({ where: { id: reservation3.id } });
        console.log('🧹 Reserva de Básquet eliminada');

        console.log('\n\n🎉 === TEST COMPLETADO ===');
    } catch (error) {
        console.error('\n❌ Error durante el test:', error);
    } finally {
        await prisma.$disconnect();
    }
}

testMultiuseBlocking();
