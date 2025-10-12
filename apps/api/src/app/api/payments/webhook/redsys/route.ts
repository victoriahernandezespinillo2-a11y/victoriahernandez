/**
 * API Route para webhook de Redsys
 * POST /api/payments/webhook/redsys - Manejar notificaciones de Redsys
 */

import { NextRequest } from 'next/server';
import { ApiResponse } from '@/lib/middleware';
import { paymentService } from '@repo/payments';
import { db } from '@repo/db';
import { walletService } from '@/lib/services/wallet.service';
import { ledgerService } from '@/lib/services/ledger.service';
import { NotificationService } from '@/lib/services/notification.service';

// Forzar runtime Node.js para poder leer cuerpo/form-data correctamente
export const runtime = 'nodejs';

/**
 * Aplicar RECHARGE_BONUS automáticamente después de una recarga exitosa
 * 
 * @param userId - ID del usuario que realizó la recarga
 * @param topupAmount - Monto recargado en EUR
 */
async function applyRechargeBonus(userId: string, topupAmount: number): Promise<void> {
  console.log('🎁 [RECHARGE-BONUS] Verificando bonus de recarga:', { userId, topupAmount });

  try {
    const now = new Date();

    // Buscar RECHARGE_BONUS activo que aplique al monto
    const rechargePromotions = await db.promotion.findMany({
      where: {
        type: 'RECHARGE_BONUS',
        status: 'ACTIVE',
        validFrom: { lte: now },
        OR: [
          { validTo: null },
          { validTo: { gte: now } }
        ]
      }
    });

    if (rechargePromotions.length === 0) {
      console.log('ℹ️ [RECHARGE-BONUS] No hay promociones RECHARGE_BONUS activas');
      return;
    }

    // Encontrar la primera promoción que aplique
    for (const promo of rechargePromotions) {
      const conditions = promo.conditions as any;
      const rewards = promo.rewards as any;

      // Verificar conditions de monto
      if (conditions.minTopupAmount && topupAmount < conditions.minTopupAmount) {
        console.log(`⚠️ [RECHARGE-BONUS] ${promo.name}: Monto insuficiente (min: ${conditions.minTopupAmount})`);
        continue;
      }

      if (conditions.minAmount && topupAmount < conditions.minAmount) continue;
      if (conditions.maxAmount && topupAmount > conditions.maxAmount) continue;

      // Verificar límite de uso global
      if (promo.usageLimit && promo.usageCount >= promo.usageLimit) {
        console.log(`⚠️ [RECHARGE-BONUS] ${promo.name}: Límite alcanzado`);
        continue;
      }

      console.log('✅ [RECHARGE-BONUS] Promoción aplicable:', promo.name);

      // Calcular créditos a otorgar
      let creditsAwarded = 0;

      if (rewards.type === 'FIXED_CREDITS') {
        creditsAwarded = rewards.value;
      } else if (rewards.type === 'PERCENTAGE_BONUS') {
        creditsAwarded = topupAmount * (rewards.value / 100);
      } else {
        console.log(`⚠️ [RECHARGE-BONUS] Tipo de recompensa no válido: ${rewards.type}`);
        continue;
      }

      // Aplicar límite máximo
      if (rewards.maxRewardAmount && creditsAwarded > rewards.maxRewardAmount) {
        creditsAwarded = rewards.maxRewardAmount;
      }

      creditsAwarded = Math.round(creditsAwarded * 100) / 100;

      console.log('💰 [RECHARGE-BONUS] Otorgando créditos:', creditsAwarded);

      // Aplicar en transacción
      await db.$transaction(async (tx) => {
        await tx.promotionApplication.create({
          data: {
            promotionId: promo.id,
            userId,
            creditsAwarded,
            metadata: {
              autoApplied: true,
              reason: 'RECHARGE',
              topupAmount,
              appliedAt: now.toISOString()
            }
          }
        });

        await tx.promotion.update({
          where: { id: promo.id },
          data: { usageCount: { increment: 1 } }
        });

        const updatedUser = await tx.user.update({
          where: { id: userId },
          data: { creditsBalance: { increment: creditsAwarded } }
        });

        await tx.walletLedger.create({
          data: {
            userId,
            type: 'CREDIT',
            reason: 'TOPUP',
            credits: creditsAwarded,
            balanceAfter: updatedUser.creditsBalance,
            metadata: {
              promotionId: promo.id,
              promotionName: promo.name,
              promotionType: 'RECHARGE_BONUS',
              autoApplied: true,
              topupAmount
            },
            idempotencyKey: `RECHARGE_BONUS:${userId}:${promo.id}:${Date.now()}`
          }
        });

        console.log('✅ [RECHARGE-BONUS] Aplicado exitosamente:', {
          promotion: promo.name,
          creditsAwarded,
          newBalance: Number(updatedUser.creditsBalance)
        });
      });

      // Solo aplicar la primera promoción que coincida
      break;
    }

  } catch (error) {
    console.error('❌ [RECHARGE-BONUS] Error:', error);
    // No relanzar para no interrumpir el webhook
  }
}

/**
 * POST /api/payments/webhook/redsys
 * Manejar notificaciones (URLOK/URLKO/MerchantURL) desde Redsys
 * Acceso: Público (validado mediante firma Redsys)
 */
export async function POST(request: NextRequest) {
  console.log('🔔 [REDSYS-WEBHOOK] Webhook recibido:', {
    method: request.method,
    url: request.url,
    headers: Object.fromEntries(request.headers.entries()),
    timestamp: new Date().toISOString()
  });
  
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
      console.log('❌ [REDSYS-WEBHOOK] Parámetros faltantes:', { Ds_Signature: !!Ds_Signature, Ds_MerchantParameters: !!Ds_MerchantParameters });
      return ApiResponse.badRequest('Parámetros Redsys requeridos');
    }

    console.log('✅ [REDSYS-WEBHOOK] Parámetros recibidos:', { 
      hasSignature: !!Ds_Signature, 
      hasMerchantParameters: !!Ds_MerchantParameters,
      signatureLength: Ds_Signature.length,
      merchantParamsLength: Ds_MerchantParameters.length
    });

    // Procesar la notificación con el servicio unificado de pagos (@repo/payments)
    const result = await paymentService.processRedsysNotification({
      signature: Ds_Signature,
      merchantParameters: Ds_MerchantParameters,
    });

    // Conciliación de negocio usando MerchantData si está presente
    try {
      const decoded = Buffer.from(Ds_MerchantParameters, 'base64').toString('utf8');
      const params = JSON.parse(decoded || '{}');
      // Extraer identificadores de Redsys para idempotencia estricta
      const dsOrder: string | undefined = (params?.Ds_Order || params?.DS_ORDER || params?.DS_MERCHANT_ORDER || params?.Ds_Merchant_Order)?.toString?.();
      const dsAuth: string | undefined = (params?.Ds_AuthorisationCode || params?.DS_AUTHORIZATIONCODE || params?.Ds_AuthorizationCode)?.toString?.();
      // Redsys puede devolver el campo como Ds_MerchantData (base64) o, segfn integracidn, como DS_MERCHANT_MERCHANTDATA
      const merchantDataRaw: string | undefined = params?.Ds_MerchantData || params?.DS_MERCHANT_MERCHANTDATA;
      if (merchantDataRaw) {
        const parseMerchantData = (raw: string): any | null => {
          const candidates: string[] = [];
          try {
            candidates.push(Buffer.from(raw, 'base64').toString('utf8'));
          } catch {}
          candidates.push(raw);
          for (const candidate of candidates) {
            try {
              return JSON.parse(candidate);
            } catch {
              // Intentar extraer primer objeto JSON bien formado si hay ruido extradido por el proveedor
              const start = candidate.indexOf('{');
              const end = candidate.lastIndexOf('}');
              if (start !== -1 && end !== -1 && end > start) {
                const slice = candidate.slice(start, end + 1);
                try { return JSON.parse(slice); } catch {}
              }
              try {
                const dec = decodeURIComponent(candidate);
                return JSON.parse(dec);
              } catch {}
            }
          }
          return null;
        };

        const merchantData = parseMerchantData(merchantDataRaw);
        if (!merchantData) {
          console.warn('No se pudo parsear MerchantData de Redsys (robusto):', merchantDataRaw?.slice?.(0, 200));
        }
        if ((merchantData?.type === 'shop_order' || merchantData?.type === 'wallet_topup') && merchantData?.orderId) {
          if (result.success) {
            try {
              await db.order.update({ where: { id: merchantData.orderId }, data: { paymentStatus: 'PAID' as any, paidAt: new Date() } });
              // Registrar asiento en Ledger (idempotente)
              try {
                const order = await db.order.findUnique({ where: { id: merchantData.orderId } });
                if (order) {
                  await ledgerService.recordPayment({
                    paymentStatus: 'PAID',
                    sourceType: 'ORDER',
                    sourceId: order.id,
                    direction: 'CREDIT',
                    amountEuro: Number(order.totalEuro || 0),
                    currency: 'EUR',
                    method: 'CARD',
                    paidAt: new Date(),
                    idempotencyKey: `REDSYS:ORDER:${order.id}:${dsOrder || ''}:${dsAuth || ''}`,
                    gatewayRef: [dsOrder, dsAuth].filter(Boolean).join(':') || undefined,
                    metadata: { provider: 'REDSYS' }
                  });
                }
              } catch (e) { console.warn('Ledger recordPayment failed (REDSYS ORDER):', e); }
              
              // Verificar si es una recarga de monedero
              if (merchantData.type === 'wallet_topup') {
                console.log('💰 [REDSYS-WEBHOOK] Procesando TOPUP:', { orderId: merchantData.orderId, type: merchantData.type });
                
                // Procesar la recarga del monedero
                const order = await db.order.findUnique({ 
                  where: { id: merchantData.orderId }
                });
                
                if (order) {
                  // Validación robusta: interpretamos recarga por créditos especificados en la orden
                  const creditsToAdd = Math.max(0, Number(order.creditsUsed || 0));
                  if (creditsToAdd > 0) {
                    try {
                      const res = await walletService.credit({
                        userId: order.userId,
                        credits: creditsToAdd,
                        reason: 'TOPUP',
                        metadata: {
                          orderId: order.id,
                          provider: 'REDSYS',
                          amount: Number(order.totalEuro),
                          currency: 'EUR'
                        },
                        idempotencyKey: `REDSYS:${order.id}`,
                      });
                      await db.outboxEvent.create({ 
                        data: { 
                          eventType: 'WALLET_TOPUP_COMPLETED', 
                          eventData: { 
                            orderId: merchantData.orderId, 
                            userId: order.userId,
                            credits: creditsToAdd,
                            balanceAfter: res.balanceAfter,
                            amount: Number(order.totalEuro),
                            provider: 'REDSYS' 
                          } as any 
                        } 
                      });

                      // ✨ Aplicar RECHARGE_BONUS automáticamente si existe
                      try {
                        await applyRechargeBonus(order.userId, Number(order.totalEuro));
                      } catch (promoError) {
                        console.error('⚠️ [TOPUP] Error aplicando RECHARGE_BONUS (no crítico):', promoError);
                      }
                    } catch (e) {
                      // idempotencia o error: no bloquear webhook, ya se registró evento o no corresponde
                    }
                  }
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
              // 1) Marcar como pagada (idempotente) y actualizar estado operativo
              await db.reservation.update({ 
                where: { id: merchantData.reservationId }, 
                data: { 
                  paymentStatus: 'PAID' as any, 
                  status: 'PAID' as any,  // Actualizar estado operativo
                  paidAt: new Date() 
                } 
              });
              // Registrar asiento en Ledger (idempotente)
              try {
                const res = await db.reservation.findUnique({ where: { id: merchantData.reservationId } });
                if (res) {
                  await ledgerService.recordPayment({
                    paymentStatus: 'PAID',
                    sourceType: 'RESERVATION',
                    sourceId: res.id,
                    direction: 'CREDIT',
                    amountEuro: Number(res.totalPrice || 0),
                    currency: 'EUR',
                    method: 'CARD',
                    paidAt: new Date(),
                    idempotencyKey: `REDSYS:RES:${res.id}:${dsOrder || ''}:${dsAuth || ''}`,
                    gatewayRef: [dsOrder, dsAuth].filter(Boolean).join(':') || undefined,
                    metadata: { provider: 'REDSYS' }
                  });
                }
              } catch (e) { console.warn('Ledger recordPayment failed (REDSYS RESERVATION):', e); }
              await db.outboxEvent.create({ data: { eventType: 'RESERVATION_PAID', eventData: { reservationId: merchantData.reservationId, provider: 'REDSYS' } as any } });

              // 2) Enviar email con links a recibo y pase (idempotente por outbox)
              const alreadySent = await db.outboxEvent.findFirst({
                where: {
                  eventType: 'RESERVATION_EMAIL_SENT',
                  eventData: { path: ['reservationId'], equals: merchantData.reservationId } as any,
                } as any,
              });

              if (!alreadySent) {
                const reservation = await db.reservation.findUnique({
                  where: { id: merchantData.reservationId },
                  include: { user: true, court: { include: { center: true } } },
                });

                if (reservation?.user?.email) {
                  const jwt = (await import('jsonwebtoken')) as unknown as typeof import('jsonwebtoken');
                  const QRCode = (await import('qrcode')) as unknown as { toDataURL: (text: string, opts?: any) => Promise<string> };
                  const jwtSecret = process.env.JWT_SECRET || '';
                  const expiresIn = Math.max(1, Number(process.env.RECEIPT_LINK_TTL_MIN || '120')); // 120 min por defecto
                  const expSeconds = Math.floor(Date.now() / 1000) + expiresIn * 60;

                  const receiptToken = jwt.sign({ type: 'receipt-access', userId: reservation.userId, exp: expSeconds }, jwtSecret);
                  const passToken = jwt.sign({ type: 'pass-access', userId: reservation.userId, exp: expSeconds }, jwtSecret);

                  const apiUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002').replace(/\/$/, '');
                  const receiptUrl = `${apiUrl}/api/reservations/${reservation.id}/receipt?token=${encodeURIComponent(receiptToken)}`;
                  const passUrl = `${apiUrl}/api/reservations/${reservation.id}/pass?token=${encodeURIComponent(passToken)}`;

                  // Generar QR data URL embebiendo el enlace del pase
                  let qrCodeDataUrl = '';
                  try {
                    qrCodeDataUrl = await QRCode.toDataURL(passUrl, { width: 200, margin: 1 });
                    console.log('✅ QR Code generado exitosamente para reserva:', reservation.id);
                  } catch (qrError) {
                    console.error('❌ Error generando QR Code:', qrError);
                    // Fallback: generar QR con URL básica
                    qrCodeDataUrl = await QRCode.toDataURL(`${apiUrl}/api/reservations/${reservation.id}/pass`, { width: 200, margin: 1 });
                  }

                  // Construir variables de plantilla
                  const durationMin = Math.round((reservation.endTime.getTime() - reservation.startTime.getTime()) / 60000);
                  const price = Number((reservation.totalPrice as any)?.toString?.() || reservation.totalPrice || 0);
                  // Formatear fechas con zona horaria correcta (Europe/Madrid)
                  const centerTimezone = 'Europe/Madrid';
                  
                  // Convertir fechas UTC a timezone local correctamente
                  const startTimeLocal = new Date(reservation.startTime);
                  const endTimeLocal = new Date(reservation.endTime);
                  
                  // Aplicar timezone para display (sin cambiar la fecha real)
                  const startTimeFormatted = new Intl.DateTimeFormat('es-ES', {
                    timeZone: centerTimezone,
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false
                  }).format(startTimeLocal);
                  
                  const endTimeFormatted = new Intl.DateTimeFormat('es-ES', {
                    timeZone: centerTimezone,
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false
                  }).format(endTimeLocal);
                  
                  // Generar URL de Google Calendar con fechas corregidas
                  const generateGoogleCalendarUrl = (reservation: any) => {
                    const startDate = startTimeLocal.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
                    const endDate = endTimeLocal.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
                    
                    const title = encodeURIComponent(`🎾 Reserva: ${reservation.court?.name || 'Cancha'} - Polideportivo Victoria Hernández`);
                    const details = encodeURIComponent(`Reserva confirmada en ${reservation.court?.name || 'Cancha'}

Detalles:
• Pista: ${reservation.court?.name || 'Cancha'}
• Fecha: ${datePart || startTimeLocal.toLocaleDateString('es-ES')}
• Horario: ${startTimeFormatted.split(', ')[1] || startTimeLocal.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} - ${endTimeFormatted || endTimeLocal.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
• Duración: ${durationMin} minutos
• Precio: ${price.toFixed(2)}€
• Código: ${reservation.id.slice(0, 10).toUpperCase()}

¡No olvides llegar 10 minutos antes!

Ver detalles: ${process.env.NEXT_PUBLIC_WEB_URL || 'https://www.polideportivovictoriahernandez.es'}/dashboard/reservations/${reservation.id}`);
                    
                    const location = encodeURIComponent('Polideportivo Victoria Hernández');
                    
                    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startDate}/${endDate}&details=${details}&location=${location}&sf=true&output=xml`;
                  };

                  // Extraer fecha y hora de los formatos
                  const [datePart] = startTimeFormatted.split(', ');
                  const [startHour] = startTimeFormatted.split(', ')[1]?.split(':') || ['00'];
                  const [endHour] = endTimeFormatted.split(':') || ['00'];
                  
                  const variables = {
                    userName: reservation.user?.name || reservation.user?.email || 'Usuario',
                    courtName: reservation.court?.name || 'Cancha',
                    date: datePart || startTimeLocal.toLocaleDateString('es-ES'),
                    startTime: startTimeFormatted.split(', ')[1] || startTimeLocal.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
                    endTime: endTimeFormatted || endTimeLocal.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
                    duration: String(durationMin),
                    price: price.toFixed(2),
                    reservationCode: reservation.id.slice(0, 10).toUpperCase(),
                    qrCodeDataUrl,
                    accessPassUrl: `${apiUrl}/api/reservations/${reservation.id}/pass?token=${encodeURIComponent(passToken)}`,
                    googleCalendarUrl: generateGoogleCalendarUrl(reservation),
                  } as Record<string, string>;

                  const notifier = new NotificationService();
                  await notifier.sendEmail({
                    to: reservation.user.email,
                    subject: 'Reserva confirmada',
                    template: 'reservationConfirmation',
                    data: variables,
                  } as any);

                  await db.outboxEvent.create({
                    data: {
                      eventType: 'RESERVATION_EMAIL_SENT',
                      eventData: { reservationId: reservation.id, provider: 'REDSYS' } as any,
                    },
                  });
                }
              }
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
