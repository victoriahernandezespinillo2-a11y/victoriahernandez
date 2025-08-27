#!/usr/bin/env node

/**
 * 🔍 Script de Verificación de Configuración Redsys
 * 
 * Este script verifica la configuración de Redsys tanto en local como en producción
 */

console.log('🔍 VERIFICACIÓN DE CONFIGURACIÓN REDSYS\n');

// Cargar variables de entorno
require('dotenv').config();

const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  merchantCode: process.env.REDSYS_MERCHANT_CODE || process.env.NEXT_PUBLIC_REDSYS_MERCHANT_CODE,
  merchantKey: process.env.REDSYS_MERCHANT_KEY,
  testMerchantKey: process.env.REDSYS_TEST_MERCHANT_KEY,
  terminal: process.env.REDSYS_TERMINAL || '001',
  currency: process.env.REDSYS_CURRENCY || '978',
  appUrl: process.env.NEXT_PUBLIC_APP_URL,
  apiUrl: process.env.NEXT_PUBLIC_API_URL,
};

console.log('📋 VARIABLES DE ENTORNO DETECTADAS:');
console.log('=====================================');
console.log(`NODE_ENV: ${config.nodeEnv}`);
console.log(`REDSYS_MERCHANT_CODE: ${config.merchantCode || '❌ NO DEFINIDA'}`);
console.log(`REDSYS_MERCHANT_KEY: ${config.merchantKey ? '✅ DEFINIDA' : '❌ NO DEFINIDA'}`);
console.log(`REDSYS_TEST_MERCHANT_KEY: ${config.testMerchantKey ? '✅ DEFINIDA' : '❌ NO DEFINIDA'}`);
console.log(`REDSYS_TERMINAL: ${config.terminal}`);
console.log(`REDSYS_CURRENCY: ${config.currency}`);
console.log(`NEXT_PUBLIC_APP_URL: ${config.appUrl || '❌ NO DEFINIDA'}`);
console.log(`NEXT_PUBLIC_API_URL: ${config.apiUrl || '❌ NO DEFINIDA'}`);

console.log('\n🔍 ANÁLISIS DE CONFIGURACIÓN:');
console.log('==============================');

const isProduction = config.nodeEnv === 'production';
const isTestMode = !isProduction;

console.log(`🌍 Entorno: ${isProduction ? 'PRODUCCIÓN' : 'DESARROLLO/TEST'}`);

// Verificar merchant code
if (!config.merchantCode) {
  console.log('❌ CRÍTICO: No hay merchant code configurado');
} else if (config.merchantCode === '999008881') {
  console.log('⚠️  ATENCIÓN: Usando merchant code genérico de test');
} else {
  console.log(`✅ Merchant code personalizado: ${config.merchantCode}`);
}

// Verificar clave de merchant
const keyToUse = isTestMode && config.testMerchantKey ? config.testMerchantKey : config.merchantKey;

if (!keyToUse) {
  console.log('❌ CRÍTICO: No hay clave de merchant configurada');
} else if (keyToUse === 'sq7HjrUOBfKmC576ILgskD5srU870gJ7') {
  console.log('⚠️  ATENCIÓN: Usando clave genérica de test de Redsys');
  console.log('   En producción, necesitas tu clave real del banco');
} else {
  console.log('✅ Clave personalizada configurada');
  
  // Verificar formato de la clave
  try {
    const keyBuffer = Buffer.from(keyToUse, 'base64');
    if (keyBuffer.length === 24) {
      console.log('✅ Clave tiene el formato correcto (24 bytes)');
    } else {
      console.log(`❌ Clave tiene longitud incorrecta: ${keyBuffer.length} bytes (esperados: 24)`);
    }
  } catch (error) {
    console.log('❌ Clave no es base64 válido');
  }
}

// Verificar URLs
if (!config.appUrl || config.appUrl.includes('localhost')) {
  console.log('⚠️  App URL: Usando localhost (solo válido en desarrollo)');
} else {
  console.log(`✅ App URL configurada: ${config.appUrl}`);
}

if (!config.apiUrl || config.apiUrl.includes('localhost')) {
  console.log('⚠️  API URL: Usando localhost (solo válido en desarrollo)');
} else {
  console.log(`✅ API URL configurada: ${config.apiUrl}`);
}

// URLs que se generarán
console.log('\n🔗 URLs GENERADAS PARA REDSYS:');
console.log('===============================');
const merchantUrl = `${config.apiUrl || 'http://localhost:3002'}/api/payments/webhook/redsys`;
const urlOk = `${config.appUrl || 'http://localhost:3001'}/dashboard/wallet?payment=success`;
const urlKo = `${config.appUrl || 'http://localhost:3001'}/dashboard/wallet?payment=cancel`;

console.log(`Webhook: ${merchantUrl}`);
console.log(`URL Éxito: ${urlOk}`);
console.log(`URL Error: ${urlKo}`);

// URL de Redsys
const redsysUrl = isTestMode 
  ? 'https://sis-t.redsys.es:25443/sis/realizarPago'
  : 'https://sis.redsys.es/sis/realizarPago';

console.log(`Endpoint Redsys: ${redsysUrl}`);

console.log('\n📋 RESUMEN:');
console.log('============');

const criticalIssues = [];
const warnings = [];

if (!config.merchantCode) {
  criticalIssues.push('Merchant code no configurado');
}

if (!keyToUse) {
  criticalIssues.push('Clave de merchant no configurada');
} else if (keyToUse === 'sq7HjrUOBfKmC576ILgskD5srU870gJ7' && isProduction) {
  criticalIssues.push('Usando clave de test en producción');
}

if (isProduction && (!config.appUrl || config.appUrl.includes('localhost'))) {
  criticalIssues.push('URL de aplicación no configurada para producción');
}

if (isProduction && (!config.apiUrl || config.apiUrl.includes('localhost'))) {
  criticalIssues.push('URL de API no configurada para producción');
}

if (config.merchantCode === '999008881' && isProduction) {
  warnings.push('Usando merchant code genérico en producción');
}

if (criticalIssues.length > 0) {
  console.log('❌ PROBLEMAS CRÍTICOS:');
  criticalIssues.forEach(issue => console.log(`   • ${issue}`));
}

if (warnings.length > 0) {
  console.log('⚠️  ADVERTENCIAS:');
  warnings.forEach(warning => console.log(`   • ${warning}`));
}

if (criticalIssues.length === 0 && warnings.length === 0) {
  console.log('✅ Configuración parece correcta');
}

console.log('\n💡 PRÓXIMOS PASOS:');
console.log('===================');

if (isProduction) {
  console.log('1. Contacta a tu banco para obtener:');
  console.log('   • Tu clave de cifrado REAL de producción');
  console.log('   • Confirmar registro de tu dominio en Redsys');
  console.log('2. Configurar variables en Vercel:');
  console.log('   • REDSYS_MERCHANT_KEY=tu_clave_real');
  console.log('   • NEXT_PUBLIC_APP_URL=https://tu-dominio.vercel.app');
  console.log('   • NEXT_PUBLIC_API_URL=https://tu-dominio.vercel.app');
} else {
  console.log('1. Para test en local, la configuración actual debería funcionar');
  console.log('2. Asegúrate de que NODE_ENV=development en local');
  console.log('3. Para probar en producción, configura las variables reales');
}

console.log('\n🔍 Para más información, revisa los logs de la aplicación cuando hagas un pago de prueba.\n');

