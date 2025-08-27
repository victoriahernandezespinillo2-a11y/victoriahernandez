/**
 * API Route para redirigir al usuario a Redsys mediante auto-post de formulario
 * GET /api/payments/redsys/redirect?rid=<reservationId> | ?oid=<orderId>
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@repo/db';
import { paymentService, RedsysService } from '@repo/payments';

// Forzamos runtime Node.js (evita edge y asegura compatibilidad)
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const reservationId = searchParams.get('rid') || '';
    const orderId = searchParams.get('oid') || '';

    if (!reservationId && !orderId) {
      return htmlResponse(errorHtml('Falta el parámetro rid u oid'));
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001';
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

    // 🔍 DEBUG: Verificar variables de entorno Redsys
    const isTestMode = process.env.NODE_ENV !== 'production';
    const configuredMerchantCode = process.env.REDSYS_MERCHANT_CODE || process.env.NEXT_PUBLIC_REDSYS_MERCHANT_CODE;
    
    // Configuración robusta con fallback a merchant genérico para test
    const merchantCode = configuredMerchantCode || (isTestMode ? '999008881' : null);
    
    // Validar configuración de merchant
    const merchantKey = isTestMode 
      ? (process.env.REDSYS_TEST_MERCHANT_KEY || process.env.REDSYS_MERCHANT_KEY || 'sq7HjrUOBfKmC576ILgskD5srU870gJ7')
      : (process.env.REDSYS_MERCHANT_KEY || '');
    
    const validation = RedsysService.validateMerchantConfig(merchantCode || '', merchantKey);

    console.log('🔍 [REDSYS-ENV] Variables de entorno:', {
      REDSYS_MERCHANT_CODE: configuredMerchantCode || 'Usando genérico 999008881',
      REDSYS_TEST_MERCHANT_KEY: process.env.REDSYS_TEST_MERCHANT_KEY ? '✅ Definida' : '❌ No definida',
      REDSYS_MERCHANT_KEY: process.env.REDSYS_MERCHANT_KEY ? '✅ Definida' : '❌ No definida',
      NODE_ENV: process.env.NODE_ENV,
      testMode: isTestMode,
      merchantCodeSource: configuredMerchantCode ? 'CONFIGURED' : 'GENERIC_TEST',
      merchantType: validation.merchantType,
      configValid: validation.isValid,
      warnings: validation.warnings
    });

    if (!validation.isValid) {
      return htmlResponse(errorHtml(`Configuración Redsys inválida: ${validation.warnings.join(', ')}`));
    }

    if (!merchantCode) {
      return htmlResponse(errorHtml('Configuración de Redsys incompleta: REDSYS_MERCHANT_CODE requerido en producción'));
    }

    // USAR TERMINAL '001' según guía oficial Redsys (formato de 3 dígitos)
    const terminal = (process.env.REDSYS_TERMINAL || '001').toString().padStart(3, '0');
    const currency = process.env.REDSYS_CURRENCY || '978'; // EUR por defecto

    // URLs de retorno al frontend (éxito/cancelación) y webhook al backend
    const merchantUrl = `${apiUrl}/api/payments/webhook/redsys`;

    // Si viene orderId, construimos pago para pedido de tienda
    if (orderId) {
      const order = await db.order.findUnique({ where: { id: orderId }, include: { user: true } });
      if (!order) {
        return htmlResponse(errorHtml('Pedido no encontrado'));
      }

      // CRÍTICO: Calcular amount correctamente en céntimos según guía oficial
      // Convertir Decimal de Prisma a número correctamente
      const totalEuroValue = order.totalEuro ? Number(order.totalEuro.toString()) : 0;
      const amount = Math.round(totalEuroValue * 100).toString();
      
      console.log('💰 [REDSYS-AMOUNT] Conversión de importe:', {
        originalTotalEuro: order.totalEuro,
        totalEuroType: typeof order.totalEuro,
        totalEuroValue,
        amountInCents: amount,
        amountAsNumber: Number(amount)
      });
      
      // 🔧 DEBUG: Verificar datos de la orden
      const amountNumber = Number(amount);
      console.log('🔍 DEBUG REDSYS REDIRECT:', {
        orderId: order.id,
        totalEuro: order.totalEuro,
        totalEuroType: typeof order.totalEuro,
        totalEuroString: order.totalEuro?.toString(),
        amount: amount,
        amountNumber: amountNumber,
        isFinite: Number.isFinite(amountNumber),
        isPositive: amountNumber > 0
      });
      
      // Validar amount (ahora es string en céntimos)
      if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
        console.error('❌ REDSYS ERROR: Invalid amount', { 
          originalTotal: order.totalEuro, 
          processedAmount: amount,
          amountNumber 
        });
        return htmlResponse(errorHtml(`Importe del pedido no válido: €${order.totalEuro} → ${amount} céntimos`));
      }

      const orderNumber = paymentService.generateRedsysOrderNumber();

      // Detectar si es una recarga de monedero
      const isWalletTopup = order.id.startsWith('TOPUP_');
      
      const urlOk = isWalletTopup 
        ? `${appUrl}/dashboard/wallet?payment=success&orderId=${encodeURIComponent(order.id)}`
        : `${appUrl}/dashboard/orders?payment=success&orderId=${encodeURIComponent(order.id)}`;
      const urlKo = isWalletTopup 
        ? `${appUrl}/dashboard/wallet?payment=cancel`
        : `${appUrl}/dashboard/orders?payment=cancel`;

      // Construir formulario para Redsys con MerchantData para conciliación
      const { Ds_Signature, Ds_MerchantParameters, Ds_SignatureVersion, action } = await paymentService.createRedsysPayment({
        amount,
        order: orderNumber,
        merchantCode,
        terminal,
        currency,
        transactionType: '0',
        productDescription: `Pedido ${order.id}`,
        titular: (order as any)?.user?.name || (order as any)?.user?.email || 'Cliente',
        merchantName: 'Polideportivo',
        merchantUrl,
        urlOk,
        urlKo,
        merchantData: { 
          type: isWalletTopup ? 'wallet_topup' : 'shop_order', 
          orderId: order.id, 
          userId: order.userId 
        },
        useBizum: false,
      });

      // 🔍 DEBUG REDSYS: decodificar y loggear parámetros enviados (SHOP)
      try {
        const decoded = JSON.parse(Buffer.from(Ds_MerchantParameters, 'base64').toString('utf8'));
        console.log('🔍 [REDSYS-PARAMETERS-SHOP] Decoded MerchantParameters:', decoded);
        
        // Validaciones pre-envío
        const expectedAmount = amount; // amount ya está en céntimos
        if (decoded.DS_MERCHANT_AMOUNT !== expectedAmount) {
          console.error('❌ [REDSYS-CHECK-SHOP] Mismatch en amount (centavos). Enviando:', decoded.DS_MERCHANT_AMOUNT, ' Esperado:', expectedAmount);
        }
        if (!decoded.DS_MERCHANT_ORDER || decoded.DS_MERCHANT_ORDER.length < 4 || decoded.DS_MERCHANT_ORDER.length > 12) {
          console.error('❌ [REDSYS-CHECK-SHOP] Ds_Order inválido:', decoded.DS_MERCHANT_ORDER);
        }
        
        // Log de configuración para troubleshooting
        console.log('📋 [REDSYS-CONFIG-SHOP] Configuración del pago:', {
          merchantCode: decoded.DS_MERCHANT_MERCHANTCODE,
          terminal: decoded.DS_MERCHANT_TERMINAL,
          currency: decoded.DS_MERCHANT_CURRENCY,
          transactionType: decoded.DS_MERCHANT_TRANSACTIONTYPE,
          amount: decoded.DS_MERCHANT_AMOUNT,
          order: decoded.DS_MERCHANT_ORDER,
          merchantType: validation.merchantType,
          signatureLength: Ds_Signature.length
        });
        
      } catch (e) {
        console.warn('⚠️ [REDSYS-PARAMETERS-SHOP] No pude decodificar Ds_MerchantParameters:', e);
      }

      const html = buildAutoPostHtml(action, Ds_SignatureVersion, Ds_MerchantParameters, Ds_Signature);
      return htmlResponse(html);
    }

    // Flujo por reserva (backward compatible)
    const reservation = await db.reservation.findUnique({
      where: { id: reservationId },
      include: {
        user: true,
        court: { include: { center: true } },
      },
    });

    if (!reservation) {
      return htmlResponse(errorHtml('Reserva no encontrada'));
    }

        // CRÍTICO: Calcular amount correctamente en céntimos según guía oficial
    // Convertir Decimal de Prisma a número correctamente
    const totalPriceValue = reservation.totalPrice ? Number(reservation.totalPrice.toString()) : 0;
    const amount = Math.round(totalPriceValue * 100).toString();
    
    console.log('💰 [REDSYS-AMOUNT] Conversión de importe (reserva):', {
      originalTotalPrice: reservation.totalPrice,
      totalPriceType: typeof reservation.totalPrice,
      totalPriceValue,
      amountInCents: amount,
      amountAsNumber: Number(amount)
    });
    
    // 🔧 DEBUG: Verificar datos de la reserva
    const amountNumberReservation = Number(amount);
    console.log('🔍 DEBUG REDSYS RESERVATION:', {
      reservationId: reservation.id,
      totalPrice: reservation.totalPrice,
      totalPriceType: typeof reservation.totalPrice,
      totalPriceString: reservation.totalPrice?.toString(),
      amount: amount,
      amountNumber: amountNumberReservation,
      isFinite: Number.isFinite(amountNumberReservation),
      isPositive: amountNumberReservation > 0,
      court: reservation.court?.name,
      user: reservation.user?.name
    });
    
    // Validar amount (ahora es string en céntimos)
    if (!Number.isFinite(amountNumberReservation) || amountNumberReservation <= 0) {
      console.error('❌ REDSYS RESERVATION ERROR: Invalid amount', { 
        originalTotal: reservation.totalPrice, 
        processedAmount: amount,
        amountNumber: amountNumberReservation 
      });
      return htmlResponse(errorHtml(`Importe de la reserva no válido: €${reservation.totalPrice} → ${amount} céntimos`));
    }

    const order = paymentService.generateRedsysOrderNumber();

    const urlOk = `${appUrl}/dashboard/reservations/success?reservationId=${encodeURIComponent(reservation.id)}`;
    const urlKo = `${appUrl}/dashboard/reservations`;

    const { Ds_Signature, Ds_MerchantParameters, Ds_SignatureVersion, action } = await paymentService.createRedsysPayment({
      amount,
      order,
      merchantCode,
      terminal,
      currency,
      transactionType: '0',
      productDescription: `Reserva ${reservation.court?.name || ''}`.trim(),
      titular: reservation.user?.name || reservation.user?.email || 'Cliente',
      merchantName: reservation.court?.center?.name || 'Polideportivo',
      merchantUrl,
      urlOk,
      urlKo,
      merchantData: { type: 'reservation', reservationId: reservation.id, userId: reservation.userId },
      useBizum: false,
    });

    // 🔍 DEBUG REDSYS: decodificar y loggear parámetros enviados (RESERVATION)
    try {
      const decoded = JSON.parse(Buffer.from(Ds_MerchantParameters, 'base64').toString('utf8'));
      console.log('🔍 [REDSYS-PARAMETERS] Decoded MerchantParameters:', decoded);
      
      // Validaciones pre-envío
      const expectedAmount = amount; // amount ya está en céntimos
      if (decoded.DS_MERCHANT_AMOUNT !== expectedAmount) {
        console.error('❌ [REDSYS-CHECK] Mismatch en amount (centavos). Enviando:', decoded.DS_MERCHANT_AMOUNT, ' Esperado:', expectedAmount);
      }
      if (!decoded.DS_MERCHANT_ORDER || decoded.DS_MERCHANT_ORDER.length < 4 || decoded.DS_MERCHANT_ORDER.length > 12) {
        console.error('❌ [REDSYS-CHECK] Ds_Order inválido:', decoded.DS_MERCHANT_ORDER);
      }
      
      // Log de configuración para troubleshooting
      console.log('📋 [REDSYS-CONFIG] Configuración del pago:', {
        merchantCode: decoded.DS_MERCHANT_MERCHANTCODE,
        terminal: decoded.DS_MERCHANT_TERMINAL,
        currency: decoded.DS_MERCHANT_CURRENCY,
        transactionType: decoded.DS_MERCHANT_TRANSACTIONTYPE,
        amount: decoded.DS_MERCHANT_AMOUNT,
        order: decoded.DS_MERCHANT_ORDER,
        merchantType: validation.merchantType,
        signatureLength: Ds_Signature.length
      });
      
    } catch (e) {
      console.warn('⚠️ [REDSYS-PARAMETERS] No pude decodificar Ds_MerchantParameters:', e);
    }

    const html = buildAutoPostHtml(action, Ds_SignatureVersion, Ds_MerchantParameters, Ds_Signature);
    console.log('🔍 [REDSYS-HTML] Generated HTML:', html);
    return htmlResponse(html);
  } catch (error) {
    console.error('Error preparando redirección Redsys:', error);
    return htmlResponse(errorHtml('Se produjo un error preparando el pago. Inténtalo de nuevo.'));
  }
}

function buildAutoPostHtml(action: string, Ds_SignatureVersion: string, Ds_MerchantParameters: string, Ds_Signature: string) {
  // Evitar que '+' se interprete como espacio en application/x-www-form-urlencoded
  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Redirigiendo a Redsys…</title>
  <style>
    body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"; margin: 0; padding: 0; background: #0b132b; color: #fff; display: grid; place-items: center; min-height: 100vh; }
    .card { background: #1c2541; padding: 24px; border-radius: 12px; max-width: 520px; width: calc(100% - 32px); box-shadow: 0 10px 30px rgba(0,0,0,0.3); }
    h1 { margin: 0 0 8px; font-size: 20px; }
    p { margin: 0 0 12px; opacity: .9; }
    .btn { appearance: none; border: 0; border-radius: 8px; background: #5bc0be; color: #0b132b; padding: 10px 16px; font-weight: 600; cursor: pointer; }
    .btn:focus { outline: 2px solid #98c1d9; outline-offset: 2px; }
    .hint { font-size: 12px; opacity: .75; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Te estamos redirigiendo a la pasarela de pago</h1>
    <p>Por favor, espera un instante…</p>
    <form id="redsys-form" method="POST" action="${action}">
      <input type="hidden" name="Ds_SignatureVersion" value="${escapeHtml(Ds_SignatureVersion)}" />
      <input type="hidden" name="Ds_MerchantParameters" value="${escapeHtml(Ds_MerchantParameters)}" />
      <input type="hidden" name="Ds_Signature" value="${escapeHtml(Ds_Signature)}" />
      <noscript>
        <p class="hint">JavaScript está deshabilitado. Haz clic en el botón para continuar al pago.</p>
        <button type="submit" class="btn">Continuar al pago</button>
      </noscript>
    </form>
  </div>
  <script>
    // Log de debug para verificar valores antes del submit
    console.log('🔍 [REDSYS-FORM] Parámetros enviados:', {
      action: '${action}',
      Ds_SignatureVersion: '${escapeHtml(Ds_SignatureVersion)}',
      Ds_MerchantParameters_length: '${Ds_MerchantParameters}'.length,
      Ds_Signature_base64: '${Ds_Signature}',
      Ds_MerchantParameters_length: '${Ds_MerchantParameters}'.length
    });
    
    (function(){
      var f = document.getElementById('redsys-form');
      if (f) { f.submit(); }
    })();
  </script>
</body>
</html>`;
}

function htmlResponse(html: string) {
  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

function errorHtml(message: string) {
  const safe = escapeHtml(message);
  return `<!doctype html><html lang="es"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>Error</title><style>body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell,Noto Sans,Helvetica,Arial;display:grid;place-items:center;min-height:100vh;background:#fff;margin:0} .box{max-width:560px;width:calc(100% - 32px);padding:24px;border:1px solid #eee;border-radius:12px}</style></head><body><div class="box"><h1>Pago no disponible</h1><p>${safe}</p></div></body></html>`;
}

function escapeHtml(str: string) {
  return str
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}