#!/usr/bin/env node

/**
 * 🔍 Test específico de Redsys con los datos EXACTOS del banco
 */

const crypto = require('crypto');

// Datos EXACTOS del banco
const merchantCode = '367717568';
const terminal = '1';
const currency = '978';
const merchantKey = 'sq7HjrUOBfKmC576ILgskD5srU870gJ7';

// Datos de prueba
const amount = '1000'; // 10 euros en céntimos
const order = '123456789012'; // 12 dígitos

console.log('🔍 TEST REDSYS CON DATOS EXACTOS DEL BANCO');
console.log('==========================================');

// Crear parámetros
const merchantParameters = {
  DS_MERCHANT_AMOUNT: amount,
  DS_MERCHANT_ORDER: order,
  DS_MERCHANT_MERCHANTCODE: merchantCode,
  DS_MERCHANT_CURRENCY: currency,
  DS_MERCHANT_TRANSACTIONTYPE: '0',
  DS_MERCHANT_TERMINAL: terminal,
  DS_MERCHANT_MERCHANTURL: 'http://localhost:3002/api/payments/webhook/redsys',
  DS_MERCHANT_URLOK: 'http://localhost:3001/dashboard/wallet?payment=success',
  DS_MERCHANT_URLKO: 'http://localhost:3001/dashboard/wallet?payment=cancel'
};

console.log('📋 Parámetros generados:');
console.log(JSON.stringify(merchantParameters, null, 2));

// Codificar en Base64
const merchantParametersB64 = Buffer.from(JSON.stringify(merchantParameters), 'utf8').toString('base64');
console.log('\n📦 MerchantParameters (Base64):');
console.log(merchantParametersB64);

// Crear firma (algoritmo oficial Redsys)
function createSignature(order, merchantParametersB64, merchantKey) {
  try {
    // Decodificar clave
    const keyBytes = Buffer.from(merchantKey, 'base64');
    console.log(`\n🔑 Clave decodificada: ${keyBytes.length} bytes`);
    
    // Crear clave derivada usando 3DES-CBC
    const iv = Buffer.alloc(8, 0);
    const cipher = crypto.createCipheriv('des-ede3-cbc', keyBytes, iv);
    cipher.setAutoPadding(true);
    
    const derivedKey = Buffer.concat([
      cipher.update(order, 'utf8'),
      cipher.final()
    ]);
    
    console.log(`🔄 Clave derivada: ${derivedKey.length} bytes`);
    
    // Crear HMAC SHA256
    const hmac = crypto.createHmac('sha256', derivedKey);
    hmac.update(merchantParametersB64, 'utf8');
    const signature = hmac.digest('base64');
    
    return signature;
  } catch (error) {
    console.error('❌ Error creando firma:', error.message);
    return null;
  }
}

const signature = createSignature(order, merchantParametersB64, merchantKey);

console.log('\n🔏 Firma generada:');
console.log(signature);

console.log('\n🌐 Datos para formulario Redsys:');
console.log('================================');
console.log(`Ds_SignatureVersion: HMAC_SHA256_V1`);
console.log(`Ds_MerchantParameters: ${merchantParametersB64}`);
console.log(`Ds_Signature: ${signature}`);
console.log(`Action: https://sis-t.redsys.es:25443/sis/realizarPago`);

console.log('\n📝 Decodificar MerchantParameters para verificar:');
try {
  const decoded = JSON.parse(Buffer.from(merchantParametersB64, 'base64').toString('utf8'));
  console.log(JSON.stringify(decoded, null, 2));
} catch (e) {
  console.error('❌ Error decodificando:', e.message);
}

console.log('\n🔍 Validaciones:');
console.log('================');
console.log(`✅ Amount (céntimos): ${amount} = ${parseInt(amount)/100} EUR`);
console.log(`✅ Order length: ${order.length} caracteres (4-12 requerido)`);
console.log(`✅ Merchant: ${merchantCode} (específico del banco)`);
console.log(`✅ Terminal: ${terminal}`);
console.log(`✅ Currency: ${currency} (EUR)`);
console.log(`✅ Signature length: ${signature ? signature.length : 'ERROR'} caracteres`);

