#!/usr/bin/env node

// CLI: Decodifica y valida Ds_MerchantParameters (Base64)
// Uso:
//   node decode-redsys.js "<BASE64>"

function exitWith(msg, code = 1) {
  console.error(msg);
  process.exit(code);
}

const b64 = process.argv[2];
if (!b64) exitWith('Uso: node decode-redsys.js "<Ds_MerchantParameters_Base64>"');

try {
  const jsonStr = Buffer.from(b64, 'base64').toString('utf8');
  const data = JSON.parse(jsonStr);

  const issues = [];
  const amount = data.DS_MERCHANT_AMOUNT;
  const order = data.DS_MERCHANT_ORDER;
  const merchant = data.DS_MERCHANT_MERCHANTCODE;
  const terminal = data.DS_MERCHANT_TERMINAL;
  const currency = data.DS_MERCHANT_CURRENCY;

  if (typeof amount !== 'string' || !/^\d+$/.test(amount)) {
    issues.push(`DS_MERCHANT_AMOUNT debe ser string de céntimos. Actual: ${amount}`);
  }
  if (!order || typeof order !== 'string' || order.length < 4 || order.length > 12 || !/^\d{4}/.test(order)) {
    issues.push(`DS_MERCHANT_ORDER inválido (4–12, primeras 4 numéricas). Actual: ${order}`);
  }
  if (merchant !== '999008881') {
    issues.push(`DS_MERCHANT_MERCHANTCODE esperado 999008881 en test. Actual: ${merchant}`);
  }
  if (terminal !== '001') {
    issues.push(`DS_MERCHANT_TERMINAL esperado '001'. Actual: '${terminal}'`);
  }
  if (currency !== '978') {
    issues.push(`DS_MERCHANT_CURRENCY esperado '978'. Actual: '${currency}'`);
  }

  console.log('Decoded JSON:\n', JSON.stringify(data, null, 2));
  if (issues.length) {
    console.log('\n⚠️  Problemas encontrados:');
    for (const i of issues) console.log(' -', i);
    process.exit(2);
  } else {
    console.log('\n✅ Parámetros válidos (formato correcto).');
    process.exit(0);
  }
} catch (e) {
  exitWith('Error decodificando Base64/JSON: ' + e.message);
}













