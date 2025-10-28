import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

async function auditFootballTestTrainings() {
    console.log('🔍 AUDITORIA DE ENTRENAMIENTOS DE FÚTBOL TEST');
    console.log('='.repeat(60));
    
    try {
        // Buscar entrenamientos en la cancha TEST 1 NO UTILIZAR
        const testTrainings = await prisma.maintenanceSchedule.findMany({
            where: {
                court: {
                    name: {
                        contains: 'TEST 1 NO UTILIZAR'
                    }
                },
                description: {
                    contains: 'entrenamiento test futbol'
                }
            },
            include: {
                court: true
            },
            orderBy: {
                scheduledAt: 'asc'
            }
        });

        console.log(`📊 Total de entrenamientos encontrados: ${testTrainings.length}`);
        console.log('');

        // Fechas esperadas (sábados a las 16:00)
        const expectedDates = [
            '2025-11-02T16:00:00.000Z', // 2/11/2025
            '2025-11-09T16:00:00.000Z', // 9/11/2025
            '2025-11-16T16:00:00.000Z', // 16/11/2025
            '2025-11-23T16:00:00.000Z', // 23/11/2025
            '2025-11-30T16:00:00.000Z', // 30/11/2025
            '2025-12-07T16:00:00.000Z', // 7/12/2025
            '2025-12-14T16:00:00.000Z', // 14/12/2025
            '2025-12-21T16:00:00.000Z'  // 21/12/2025
        ];

        console.log('📅 VERIFICACIÓN DE FECHAS Y HORARIOS:');
        console.log('-'.repeat(50));

        let correctCount = 0;
        let incorrectCount = 0;
        const issues = [];

        // Verificar cada entrenamiento
        testTrainings.forEach((training, index) => {
            const scheduledDate = new Date(training.scheduledAt);
            const expectedDate = new Date(expectedDates[index]);
            
            // Formatear fechas para comparación visual
            const scheduledStr = scheduledDate.toLocaleString('es-ES', {
                weekday: 'long',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                timeZone: 'Europe/Madrid'
            });
            
            const expectedStr = expectedDate.toLocaleString('es-ES', {
                weekday: 'long',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                timeZone: 'Europe/Madrid'
            });

            const isCorrect = Math.abs(scheduledDate.getTime() - expectedDate.getTime()) < 60000; // 1 minuto de tolerancia
            
            console.log(`${index + 1}. ID: ${training.id}`);
            console.log(`   Programado: ${scheduledStr}`);
            console.log(`   Esperado:   ${expectedStr}`);
            console.log(`   Estado: ${isCorrect ? '✅ CORRECTO' : '❌ INCORRECTO'}`);
            
            if (isCorrect) {
                correctCount++;
            } else {
                incorrectCount++;
                const diffMinutes = Math.round((scheduledDate.getTime() - expectedDate.getTime()) / (1000 * 60));
                issues.push({
                    id: training.id,
                    scheduled: scheduledStr,
                    expected: expectedStr,
                    differenceMinutes: diffMinutes
                });
            }
            console.log('');
        });

        // Verificar fechas faltantes
        console.log('🔍 VERIFICACIÓN DE FECHAS FALTANTES:');
        console.log('-'.repeat(50));
        
        const foundDates = testTrainings.map(t => new Date(t.scheduledAt).getTime());
        const missingDates = expectedDates.filter(expectedDate => {
            const expectedTime = new Date(expectedDate).getTime();
            return !foundDates.some(foundTime => Math.abs(foundTime - expectedTime) < 60000);
        });

        if (missingDates.length > 0) {
            console.log('❌ Fechas faltantes:');
            missingDates.forEach(date => {
                const dateStr = new Date(date).toLocaleString('es-ES', {
                    weekday: 'long',
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZone: 'Europe/Madrid'
                });
                console.log(`   - ${dateStr}`);
            });
        } else {
            console.log('✅ Todas las fechas esperadas están presentes');
        }

        // Resumen final
        console.log('');
        console.log('📊 RESUMEN DE LA AUDITORÍA:');
        console.log('='.repeat(60));
        console.log(`✅ Entrenamientos correctos: ${correctCount}`);
        console.log(`❌ Entrenamientos incorrectos: ${incorrectCount}`);
        console.log(`📅 Fechas faltantes: ${missingDates.length}`);
        console.log(`📈 Precisión: ${((correctCount / testTrainings.length) * 100).toFixed(1)}%`);

        if (issues.length > 0) {
            console.log('');
            console.log('🚨 PROBLEMAS DETECTADOS:');
            console.log('-'.repeat(50));
            issues.forEach((issue, index) => {
                console.log(`${index + 1}. ID ${issue.id}:`);
                console.log(`   Diferencia: ${issue.differenceMinutes} minutos`);
                console.log(`   Programado: ${issue.scheduled}`);
                console.log(`   Esperado: ${issue.expected}`);
                console.log('');
            });
        }

        // Verificar detalles adicionales
        console.log('🔍 VERIFICACIÓN DE DETALLES:');
        console.log('-'.repeat(50));
        
        const firstTraining = testTrainings[0];
        if (firstTraining) {
            console.log(`Cancha: ${firstTraining.court.name}`);
            console.log(`Descripción: ${firstTraining.description}`);
            console.log(`Tipo: ${firstTraining.type}`);
            console.log(`Estado: ${firstTraining.status}`);
            console.log(`Duración estimada: ${firstTraining.estimatedDuration} minutos`);
        }

        // Generar reporte JSON
        const report = {
            timestamp: new Date().toISOString(),
            totalTrainings: testTrainings.length,
            correctTrainings: correctCount,
            incorrectTrainings: incorrectCount,
            missingDates: missingDates.length,
            accuracy: ((correctCount / testTrainings.length) * 100).toFixed(1),
            issues: issues,
            trainings: testTrainings.map(t => ({
                id: t.id,
                scheduledAt: t.scheduledAt,
                description: t.description,
                court: t.court.name,
                status: t.status
            }))
        };

        // Guardar reporte
        await fs.promises.writeFile(
            'football_test_audit_report.json',
            JSON.stringify(report, null, 2)
        );

        console.log('');
        console.log('💾 Reporte guardado en: football_test_audit_report.json');

    } catch (error) {
        console.error('❌ Error durante la auditoría:', error);
    } finally {
        await prisma.$disconnect();
    }
}

// Ejecutar auditoría
auditFootballTestTrainings();