const crypto = require('crypto');

// Paste Ds_MerchantParameters (base64) here
const B64 = process.argv[2];
// Test key (base64 from Redsys docs)
const KEY_B64 = process.argv[3] || 'sq7HjrUOBfKmC576ILgskD5srU870gJ7';

if (!B64) {
  console.error('Usage: node sig-check.js <Ds_MerchantParameters_b64> [key_b64]');
  process.exit(1);
}

const json = Buffer.from(B64, 'base64').toString('utf8');
const params = JSON.parse(json);
const order = params.DS_MERCHANT_ORDER || params.Ds_Order || params.DS_ORDER;

const key = Buffer.from(KEY_B64, 'base64');
const iv = Buffer.alloc(8, 0);
const cipher = crypto.createCipheriv('des-ede3-cbc', key, iv);
cipher.setAutoPadding(true);
const derived = Buffer.concat([cipher.update(order, 'utf8'), cipher.final()]);

const hmac = crypto.createHmac('sha256', derived);
hmac.update(B64, 'utf8');
const signature = hmac.digest('base64');

console.log(JSON.stringify({ order, expectedSignature: signature }, null, 2));


