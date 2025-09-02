#!/usr/bin/env node

/**
 * Script para generar QR de prueba y verificar seguridad
 * Ejecutar: node test-qr-generator.js
 */

const jwt = require('jsonwebtoken');
const QRCode = require('qrcode');
const fs = require('fs');

// Configuración de prueba
const TEST_CONFIG = {
  JWT_SECRET: 'super-secret-jwt-key-for-local-development', // mismo que en .env.local
  RESERVATION_ID: 'test-reservation-12345',
  USER_ID: 'test-user-67890',
  API_URL: 'http://localhost:3002'
};

async function generateTestQR() {
  console.log('🔧 Generando QR de acceso de prueba...\n');

  try {
    // 1. Simular una reserva (de ahora a +2 horas)
    const now = new Date();
    const startTime = new Date(now.getTime() + 30 * 60 * 1000); // +30 min
    const endTime = new Date(now.getTime() + 2.5 * 60 * 60 * 1000); // +2.5h
    const expTime = new Date(endTime.getTime() + 60 * 60 * 1000); // +1h después

    console.log('📅 Simulando reserva:');
    console.log(`   Inicio: ${startTime.toLocaleString()}`);
    console.log(`   Fin: ${endTime.toLocaleString()}`);
    console.log(`   QR expira: ${expTime.toLocaleString()}\n`);

    // 2. Generar token JWT
    const payload = {
      reservationId: TEST_CONFIG.RESERVATION_ID,
      uid: TEST_CONFIG.USER_ID,
      exp: Math.floor(expTime.getTime() / 1000)
    };

    const token = jwt.sign(payload, TEST_CONFIG.JWT_SECRET);
    console.log('🔑 Token JWT generado:');
    console.log(`   Payload: ${JSON.stringify(payload, null, 2)}`);
    console.log(`   Token: ${token.substring(0, 50)}...\n`);

    // 3. Generar QR
    const qrOptions = {
      width: 320,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    };

    const qrDataUrl = await QRCode.toDataURL(token, qrOptions);
    console.log('📱 QR generado exitosamente!');

    // 4. Guardar QR como imagen
    const base64Data = qrDataUrl.replace(/^data:image\/png;base64,/, '');
    fs.writeFileSync('test-qr.png', base64Data, 'base64');
    console.log('   💾 Guardado como: test-qr.png\n');

    // 5. Generar HTML de prueba
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <title>QR de Prueba - Polideportivo</title>
    <meta charset="utf-8">
    <style>
        body { 
            font-family: 'Inter', sans-serif; 
            max-width: 600px; 
            margin: 50px auto; 
            padding: 20px;
            background: linear-gradient(135deg, #10b981, #3b82f6);
            min-height: 100vh;
        }
        .container {
            background: white;
            padding: 40px;
            border-radius: 16px;
            box-shadow: 0 25px 50px rgba(0,0,0,0.15);
            text-align: center;
        }
        .qr-container {
            background: linear-gradient(135deg, #eff6ff, #dbeafe);
            border: 2px solid #3b82f6;
            border-radius: 12px;
            padding: 24px;
            margin: 24px 0;
        }
        .token-info {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 16px;
            margin: 20px 0;
            text-align: left;
            font-family: monospace;
            font-size: 12px;
            word-break: break-all;
        }
        .test-buttons {
            margin-top: 24px;
        }
        .btn {
            display: inline-block;
            padding: 12px 24px;
            margin: 8px;
            background: #3b82f6;
            color: white;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 500;
        }
        .btn:hover { background: #2563eb; }
        .security-info {
            background: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 16px;
            margin: 24px 0;
            text-align: left;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1 style="color: #1f2937; margin-bottom: 8px;">🎾 QR de Prueba</h1>
        <p style="color: #6b7280; margin-bottom: 32px;">
            Código de acceso generado para testing
        </p>

        <div class="qr-container">
            <h3 style="color: #1e40af; margin: 0 0 16px 0;">📱 Código QR</h3>
            <img src="${qrDataUrl}" alt="QR Code" style="width: 200px; height: 200px; border-radius: 8px;">
            
            <div class="token-info">
                <strong>Token JWT:</strong><br>
                ${token}
            </div>
        </div>

        <div class="security-info">
            <h4 style="margin: 0 0 12px 0; color: #92400e;">🔐 Seguridad implementada</h4>
            <ul style="margin: 0; padding-left: 20px; color: #78350f;">
                <li>JWT firmado con clave secreta del servidor</li>
                <li>Expiración automática: ${expTime.toLocaleString()}</li>
                <li>Vinculado a reserva específica: ${TEST_CONFIG.RESERVATION_ID}</li>
                <li>Autorización por propietario: ${TEST_CONFIG.USER_ID}</li>
                <li>Ventana temporal de acceso configurada</li>
            </ul>
        </div>

        <div class="test-buttons">
            <a href="${TEST_CONFIG.API_URL}/api/access/verify?token=${encodeURIComponent(token)}" 
               class="btn" target="_blank">
                🔍 Verificar Token
            </a>
        </div>

        <p style="color: #9ca3af; font-size: 14px; margin-top: 24px;">
            ⚠️ Este es un QR de prueba. En producción, cada QR es único por reserva.
        </p>
    </div>
</body>
</html>`;

    fs.writeFileSync('test-qr.html', htmlContent);
    console.log('🌐 Vista de prueba generada: test-qr.html');
    console.log('   Abre el archivo en tu navegador para ver el QR\n');

    // 6. Simular validación
    console.log('🔍 Probando validación del token...');
    try {
      const decoded = jwt.verify(token, TEST_CONFIG.JWT_SECRET);
      console.log('   ✅ Token válido');
      console.log(`   📊 Datos: reservationId=${decoded.reservationId}, uid=${decoded.uid}`);
      console.log(`   ⏰ Expira: ${new Date(decoded.exp * 1000).toLocaleString()}\n`);
    } catch (err) {
      console.log('   ❌ Token inválido:', err.message);
    }

    // 7. URLs de prueba
    console.log('🧪 URLs para testing:');
    console.log(`   Verificar: ${TEST_CONFIG.API_URL}/api/access/verify?token=${encodeURIComponent(token)}`);
    console.log('   (Requiere que el API esté corriendo en localhost:3002)\n');

    console.log('✅ Generación completada!');
    console.log('📂 Archivos creados:');
    console.log('   - test-qr.png (imagen QR)');
    console.log('   - test-qr.html (vista de prueba)');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  generateTestQR();
}

module.exports = { generateTestQR, TEST_CONFIG };












