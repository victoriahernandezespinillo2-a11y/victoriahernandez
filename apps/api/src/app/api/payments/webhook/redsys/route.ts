/**
 * API Route para webhook de Redsys
 * POST /api/payments/webhook/redsys - Manejar notificaciones de Redsys
 */

import { NextRequest } from 'next/server';
import { ApiResponse } from '@/lib/middleware';
import { paymentService } from '@repo/payments';
import { db } from '@repo/db';

// Forzar runtime Node.js para poder leer cuerpo/form-data correctamente
export const runtime = 'nodejs';

/**
 * POST /api/payments/webhook/redsys
 * Manejar notificaciones (URLOK/URLKO/MerchantURL) desde Redsys
 * Acceso: Público (validado mediante firma Redsys)
 */
export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';

    let Ds_Signature = '';
    let Ds_MerchantParameters = '';

    if (contentType.includes('application/json')) {
      const body = await request.json().catch(() => ({} as any));
      Ds_Signature = (body?.Ds_Signature || body?.signature || '').toString();
      Ds_MerchantParameters = (body?.Ds_MerchantParameters || body?.merchantParameters || '').toString();
    } else {
      const form = await request.formData();
      Ds_Signature = (form.get('Ds_Signature') as string) || '';
      Ds_MerchantParameters = (form.get('Ds_MerchantParameters') as string) || '';
    }

    if (!Ds_Signature || !Ds_MerchantParameters) {
      return ApiResponse.badRequest('Parámetros Redsys requeridos');
    }

    // Procesar la notificación con el servicio unificado de pagos (@repo/payments)
    const result = await paymentService.processRedsysNotification({
      signature: Ds_Signature,
      merchantParameters: Ds_MerchantParameters,
    });

    // Conciliación de negocio usando MerchantData si está presente
    try {
      const decoded = Buffer.from(Ds_MerchantParameters, 'base64').toString('utf8');
      const params = JSON.parse(decoded || '{}');
      const merchantDataRaw: string | undefined = params?.Ds_MerchantData;
      if (merchantDataRaw) {
        const mdJson = Buffer.from(merchantDataRaw, 'base64').toString('utf8');
        const merchantData = JSON.parse(mdJson || '{}');
        if ((merchantData?.type === 'shop_order' || merchantData?.type === 'wallet_topup') && merchantData?.orderId) {
          if (result.success) {
            try {
              await db.order.update({ where: { id: merchantData.orderId }, data: { status: 'PAID' } });
              
              // Verificar si es una recarga de monedero
              if (merchantData.type === 'wallet_topup') {
                // Procesar la recarga del monedero
                const order = await db.order.findUnique({ 
                  where: { id: merchantData.orderId }
                });
                
                if (order && order.creditsUsed > 0) {
                  const creditsToAdd = order.creditsUsed; // Los créditos están en creditsUsed
                  
                  // Actualizar el balance del usuario
                  const updatedUser = await db.user.update({
                    where: { id: order.userId },
                    data: { creditsBalance: { increment: creditsToAdd } }
                  });
                  
                  // Crear entrada en el ledger del monedero
                  await db.walletLedger.create({
                    data: {
                      userId: order.userId,
                      type: 'CREDIT',
                      reason: 'TOPUP',
                      credits: creditsToAdd,
                      balanceAfter: updatedUser.creditsBalance,
                      metadata: {
                        orderId: order.id,
                        provider: 'REDSYS',
                        amount: Number(order.totalEuro),
                        currency: 'EUR'
                      }
                    }
                  });
                  
                  await db.outboxEvent.create({ 
                    data: { 
                      eventType: 'WALLET_TOPUP_COMPLETED', 
                      eventData: { 
                        orderId: merchantData.orderId, 
                        userId: order.userId,
                        credits: creditsToAdd,
                        amount: Number(order.totalEuro),
                        provider: 'REDSYS' 
                      } as any 
                    } 
                  });
                }
              } else {
                await db.outboxEvent.create({ data: { eventType: 'ORDER_PAID', eventData: { orderId: merchantData.orderId, method: 'CARD', provider: 'REDSYS' } as any } });
              }
            } catch (e) {
              // idempotencia: si ya está marcado, ignorar
              console.error('Error procesando pago exitoso:', e);
            }
          } else {
            // Podríamos registrar fallo de pago si es necesario
            try {
              const eventType = merchantData.type === 'wallet_topup' ? 'WALLET_TOPUP_FAILED' : 'ORDER_PAYMENT_FAILED';
              await db.outboxEvent.create({ data: { eventType, eventData: { orderId: merchantData.orderId, provider: 'REDSYS' } as any } });
            } catch {}
          }
        }
        // Conciliación de reservas
        if (merchantData?.type === 'reservation' && merchantData?.reservationId) {
          if (result.success) {
            try {
              await db.reservation.update({ where: { id: merchantData.reservationId }, data: { status: 'PAID' } });
              await db.outboxEvent.create({ data: { eventType: 'RESERVATION_PAID', eventData: { reservationId: merchantData.reservationId, provider: 'REDSYS' } as any } });
            } catch (e) {
              // idempotencia: si ya está marcado, ignorar
            }
          } else {
            // Por ahora no registramos evento de fallo para reservas (no hay consumidor)
          }
        }
      }
    } catch (e) {
      // Si falla el parseo, no bloqueamos la respuesta del webhook
      console.error('No se pudo parsear MerchantData de Redsys:', e);
    }

    // Siempre respondemos 200 para evitar reintentos masivos de Redsys.
    // El resultado queda registrado en la base de datos (webhookEvent/outboxEvent) por el servicio.
    return ApiResponse.success({ received: true, success: result.success, order: result.order });
  } catch (error) {
    console.error('Error en webhook Redsys:', error);
    // Responder 200 con error para evitar reintentos agresivos; log ya registrado
    return ApiResponse.success({ received: true, success: false });
  }
}

/**
 * OPTIONS /api/payments/webhook/redsys
 * Manejar preflight requests
 */
export async function OPTIONS() {
  return ApiResponse.success(null);
}