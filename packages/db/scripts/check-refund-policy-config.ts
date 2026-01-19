/**
 * Verificar configuración de políticas de reembolso en la base de datos
 */

import { db } from '../src';

async function checkRefundPolicyConfig() {
  try {
    console.log('🔍 VERIFICANDO CONFIGURACIÓN DE POLÍTICAS DE REEMBOLSO\n');
    console.log('='.repeat(80));

    // Obtener todos los centros
    const centers = await db.center.findMany({
      select: {
        id: true,
        name: true,
        settings: true,
      },
    });

    console.log(`\n📊 Total de centros: ${centers.length}\n`);

    for (const center of centers) {
      console.log(`\n🏟️  Centro: ${center.name} (ID: ${center.id})`);
      
      const settings: any = (center.settings as any) || {};
      const paymentsCfg: any = settings?.payments || {};
      const businessCfg: any = settings?.business || {};

      const refundPolicy = paymentsCfg?.refundPolicy || 'moderate';
      const refundDeadlineHours = paymentsCfg?.refundDeadlineHours;
      const cancellationHours = businessCfg?.cancellationHours;

      console.log(`   Política de reembolso: ${refundPolicy}`);
      
      // Calcular horas límite según la lógica del código
      let deadlineHours = 0;
      switch (refundPolicy) {
        case 'flexible':
          deadlineHours = refundDeadlineHours ?? cancellationHours ?? 24;
          console.log(`   Horas límite: ${deadlineHours} (flexible)`);
          if (refundDeadlineHours) {
            console.log(`      - refundDeadlineHours configurado: ${refundDeadlineHours}`);
          } else if (cancellationHours) {
            console.log(`      - Usando cancellationHours: ${cancellationHours}`);
          } else {
            console.log(`      - Usando default: 24h`);
          }
          break;
        case 'moderate':
          deadlineHours = refundDeadlineHours ?? 48;
          console.log(`   Horas límite: ${deadlineHours} (moderate)`);
          if (refundDeadlineHours) {
            console.log(`      - refundDeadlineHours configurado: ${refundDeadlineHours}`);
          } else {
            console.log(`      - Usando default: 48h`);
          }
          break;
        case 'strict':
          deadlineHours = 0;
          console.log(`   Horas límite: ${deadlineHours} (strict - sin reembolsos automáticos)`);
          break;
        default:
          deadlineHours = refundDeadlineHours ?? 48;
          console.log(`   Horas límite: ${deadlineHours} (default moderate)`);
      }

      // Mostrar configuración completa
      console.log(`   Configuración completa:`);
      console.log(`      - payments.refundPolicy: ${paymentsCfg?.refundPolicy || 'NO CONFIGURADO (default: moderate)'}`);
      console.log(`      - payments.refundDeadlineHours: ${refundDeadlineHours ?? 'NO CONFIGURADO'}`);
      console.log(`      - business.cancellationHours: ${cancellationHours ?? 'NO CONFIGURADO'}`);
      
      // Mostrar settings completos si hay algo configurado
      if (Object.keys(paymentsCfg).length > 0 || Object.keys(businessCfg).length > 0) {
        console.log(`   Settings JSON:`);
        if (Object.keys(paymentsCfg).length > 0) {
          console.log(`      payments: ${JSON.stringify(paymentsCfg, null, 2)}`);
        }
        if (Object.keys(businessCfg).length > 0) {
          console.log(`      business: ${JSON.stringify(businessCfg, null, 2)}`);
        }
      } else {
        console.log(`   ⚠️  No hay configuración personalizada, usando defaults`);
      }
    }

    // Verificar reservas recientes para ver qué política se aplicó
    console.log('\n' + '='.repeat(80));
    console.log('📋 VERIFICANDO POLÍTICA APLICADA EN REEMBOLSOS RECIENTES\n');
    console.log('='.repeat(80));

    const recentRefunds = await db.payment.findMany({
      where: {
        metadata: {
          path: ['type'],
          equals: 'AUTO_REFUND_CREDITS',
        },
      },
      orderBy: { processedAt: 'desc' },
      take: 5,
      include: {
        user: { select: { id: true, name: true } },
      },
    });

    if (recentRefunds.length > 0) {
      console.log(`\nÚltimos 5 reembolsos automáticos:\n`);
      for (const refund of recentRefunds) {
        const metadata = refund.metadata as any;
        console.log(`   Reserva: ${refund.referenceId}`);
        console.log(`   Usuario: ${refund.user?.name || 'N/A'}`);
        console.log(`   Fecha: ${refund.processedAt?.toISOString() || 'N/A'}`);
        console.log(`   Política aplicada: ${metadata?.policy || 'N/A'}`);
        console.log(`   Horas límite usadas: ${metadata?.deadlineHours || 'N/A'}`);
        console.log(`   Monto: €${Math.abs(Number(refund.amount || 0)).toFixed(2)}`);
        console.log('');
      }
    } else {
      console.log('\nNo se encontraron reembolsos automáticos recientes');
    }

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await db.$disconnect();
  }
}

checkRefundPolicyConfig()
  .then(() => {
    console.log('\n✅ Verificación completada');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });







