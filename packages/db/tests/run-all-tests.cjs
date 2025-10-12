/**
 * EJECUTOR DE TODOS LOS TESTS DEL SISTEMA DE PROMOCIONES
 * 
 * Este script ejecuta todos los tests de promociones en secuencia:
 * 1. SIGNUP_BONUS
 * 2. RECHARGE_BONUS
 * 3. USAGE_BONUS
 * 4. REFERRAL_BONUS
 * 5. DISCOUNT_CODE
 * 
 * USO:
 *   node tests/run-all-tests.cjs           # Ejecutar todos los tests
 *   node tests/run-all-tests.cjs --cleanup # Limpiar todos los datos
 */

const { execSync } = require('child_process');
const path = require('path');

const TESTS = [
  {
    name: 'SIGNUP_BONUS (Bono de Registro)',
    file: 'test-signup-bonus.cjs',
    emoji: '🎁'
  },
  {
    name: 'RECHARGE_BONUS (Bono de Recarga)',
    file: 'test-recharge-bonus.cjs',
    emoji: '💰'
  },
  {
    name: 'USAGE_BONUS (Cashback)',
    file: 'test-usage-bonus.cjs',
    emoji: '🎮'
  },
  {
    name: 'REFERRAL_BONUS (Sistema de Referidos)',
    file: 'test-referral-complete.cjs',
    emoji: '🔗'
  },
  {
    name: 'DISCOUNT_CODE (Código de Descuento)',
    file: 'test-discount-code.cjs',
    emoji: '🎫'
  }
];

function runTest(test, cleanup = false) {
  const testPath = path.join(__dirname, test.file);
  const command = `node "${testPath}"${cleanup ? ' --cleanup' : ''}`;
  
  console.log(`\n${'═'.repeat(80)}`);
  console.log(`${test.emoji} ${test.name.toUpperCase()}`);
  console.log('═'.repeat(80));
  
  try {
    execSync(command, { stdio: 'inherit', cwd: path.join(__dirname, '..') });
    console.log(`\n✅ ${test.name} - ${cleanup ? 'LIMPIADO' : 'COMPLETADO'}`);
    return true;
  } catch (error) {
    console.error(`\n❌ ${test.name} - FALLÓ`);
    return false;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const cleanup = args.includes('--cleanup');
  
  console.log('\n🚀 INICIANDO SUITE COMPLETA DE TESTS DE PROMOCIONES\n');
  console.log('═'.repeat(80));
  
  if (cleanup) {
    console.log('🧹 MODO LIMPIEZA: Eliminando todos los datos de prueba');
  } else {
    console.log('🧪 MODO PRUEBA: Ejecutando todos los tests');
  }
  
  console.log('═'.repeat(80));
  
  const results = {
    passed: 0,
    failed: 0,
    total: TESTS.length
  };
  
  for (const test of TESTS) {
    const success = runTest(test, cleanup);
    if (success) {
      results.passed++;
    } else {
      results.failed++;
    }
    
    // Pausa breve entre tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Resumen final
  console.log('\n' + '═'.repeat(80));
  console.log('📊 RESUMEN FINAL');
  console.log('═'.repeat(80));
  
  if (cleanup) {
    console.log(`\n🧹 Limpieza completada:`);
    console.log(`   ✅ Tests limpiados: ${results.passed}/${results.total}`);
    if (results.failed > 0) {
      console.log(`   ❌ Errores: ${results.failed}`);
    }
  } else {
    console.log(`\n🎉 Tests ejecutados:`);
    console.log(`   ✅ Exitosos: ${results.passed}/${results.total}`);
    if (results.failed > 0) {
      console.log(`   ❌ Fallidos: ${results.failed}`);
    }
    
    if (results.passed === results.total) {
      console.log('\n🏆 ¡TODOS LOS TESTS PASARON EXITOSAMENTE!');
      console.log('   El sistema de promociones está funcionando perfectamente.');
    } else {
      console.log('\n⚠️ Algunos tests fallaron. Revisa los errores arriba.');
    }
    
    console.log('\n💡 Para limpiar todos los datos de prueba:');
    console.log('   node tests/run-all-tests.cjs --cleanup');
  }
  
  console.log('\n' + '═'.repeat(80));
  
  process.exit(results.failed > 0 ? 1 : 0);
}

main();

