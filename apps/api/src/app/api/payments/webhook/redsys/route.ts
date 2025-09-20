/**
 * API Route para webhook de Redsys
 * POST /api/payments/webhook/redsys - Manejar notificaciones de Redsys
 */

import { NextRequest } from 'next/server';
import { ApiResponse } from '@/lib/middleware';
import { paymentService } from '@repo/payments';
import { db } from '@repo/db';
import { walletService } from '@/lib/services/wallet.service';
import { NotificationService } from '@/lib/services/notification.service';

// Forzar runtime Node.js para poder leer cuerpo/form-data correctamente
export const runtime = 'nodejs';

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
              await db.order.update({ where: { id: merchantData.orderId }, data: { status: 'PAID' } });
              
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
              // 1) Marcar como pagada (idempotente)
              await db.reservation.update({ where: { id: merchantData.reservationId }, data: { status: 'PAID' } });
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
                  const qrCodeDataUrl = await QRCode.toDataURL(passUrl, { width: 200, margin: 1 });

                  // Construir variables de plantilla
                  const durationMin = Math.round((reservation.endTime.getTime() - reservation.startTime.getTime()) / 60000);
                  const price = Number((reservation.totalPrice as any)?.toString?.() || reservation.totalPrice || 0);
                  // Generar URL de Google Calendar
                  const generateGoogleCalendarUrl = (reservation: any) => {
                    const startDate = reservation.startTime.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
                    const endDate = reservation.endTime.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
                    
                    const title = encodeURIComponent(`🎾 Reserva: ${reservation.court?.name || 'Cancha'} - Polideportivo Victoria Hernández`);
                    const details = encodeURIComponent(`Reserva confirmada en ${reservation.court?.name || 'Cancha'}

Detalles:
• Pista: ${reservation.court?.name || 'Cancha'}
• Fecha: ${reservation.startTime.toLocaleDateString('es-ES')}
• Horario: ${reservation.startTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} - ${reservation.endTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
• Duración: ${durationMin} minutos
• Precio: ${price.toFixed(2)}€
• Código: ${reservation.id.slice(0, 10).toUpperCase()}

¡No olvides llegar 10 minutos antes!

Ver detalles: ${process.env.NEXT_PUBLIC_WEB_URL || 'https://www.polideportivovictoriahernandez.es'}/dashboard/reservations/${reservation.id}`);
                    
                    const location = encodeURIComponent('Polideportivo Victoria Hernández');
                    
                    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startDate}/${endDate}&details=${details}&location=${location}&sf=true&output=xml`;
                  };

                  const variables = {
                    userName: reservation.user?.name || reservation.user?.email || 'Usuario',
                    courtName: reservation.court?.name || 'Cancha',
                    date: reservation.startTime.toLocaleDateString('es-ES'),
                    startTime: reservation.startTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
                    endTime: reservation.endTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
                    duration: String(durationMin),
                    price: price.toFixed(2),
                    reservationCode: reservation.id.slice(0, 10).toUpperCase(),
                    qrCodeDataUrl,
                    accessPassUrl: `${process.env.NEXT_PUBLIC_WEB_URL || 'https://www.polideportivovictoriahernandez.es'}/dashboard/reservations/${reservation.id}`,
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
