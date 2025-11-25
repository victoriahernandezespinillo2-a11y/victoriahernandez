/**
 * Service: ReservationPaymentService
 * Servicio para procesar pagos de reservas con créditos
 */

import { db } from '@repo/db';
import { getCreditSystemService } from './credit-system.service';
import { ledgerService } from './ledger.service';
import { PrismaClient } from '@prisma/client';
import { notificationService } from '@repo/notifications';
import { reservationNotificationService } from './reservation-notification.service';

export interface ReservationPaymentResult {
  success: boolean;
  reservationId: string;
  paymentMethod: 'CREDITS' | 'CARD' | 'FREE';
  amount: number;
  creditsUsed?: number;
  balanceAfter?: number;
  error?: string;
  redirectUrl?: string; // Para pagos con tarjeta
}

export interface ReservationPaymentInput {
  reservationId: string;
  paymentMethod: 'CREDITS' | 'CARD' | 'FREE';
  userId: string;
  amount: number;
  idempotencyKey?: string;
  appliedPromo?: {
    code: string;
    finalAmount: number;
    savings: number;
    rewardAmount: number;
  };
}

export class ReservationPaymentService {
  private creditSystemService: any;

  constructor(private prisma: PrismaClient) {
    this.creditSystemService = getCreditSystemService(prisma);
  }

  /**
   * Procesar pago de reserva con créditos
   */
  async processPaymentWithCredits(input: ReservationPaymentInput): Promise<ReservationPaymentResult> {
    console.log('💰 [CREDITS-PAYMENT] Iniciando processPaymentWithCredits...');
    console.log('💰 [CREDITS-PAYMENT] Input:', input);
    
    const { reservationId, userId, amount, idempotencyKey } = input;

    try {
      // 1. Verificar que la reserva existe y está pendiente
      console.log('🔍 [CREDITS-PAYMENT] Buscando reserva...');
      const reservation = await this.prisma.reservation.findUnique({
        where: { id: reservationId },
        include: { user: true, court: { include: { center: true } } }
      });

      if (!reservation) {
        console.error('❌ [CREDITS-PAYMENT] Reserva no encontrada');
        return {
          success: false,
          reservationId,
          paymentMethod: 'CREDITS',
          amount,
          error: 'Reserva no encontrada'
        };
      }

      console.log('✅ [CREDITS-PAYMENT] Reserva encontrada:', {
        id: reservation.id,
        status: reservation.status,
        paymentStatus: reservation.paymentStatus,
        totalPrice: reservation.totalPrice
      });

      if (reservation.status !== 'PENDING') {
        return {
          success: false,
          reservationId,
          paymentMethod: 'CREDITS',
          amount,
          error: `La reserva no está pendiente. Estado actual: ${reservation.status}`
        };
      }

      if (reservation.userId !== userId) {
        return {
          success: false,
          reservationId,
          paymentMethod: 'CREDITS',
          amount,
          error: 'No tienes permisos para pagar esta reserva'
        };
      }

      const centerSettings: any = (reservation.court as any)?.center?.settings || {};
      const creditsCfg: any = centerSettings.credits || {};
      const euroPerCredit = typeof creditsCfg.euroPerCredit === 'number' && creditsCfg.euroPerCredit > 0
        ? creditsCfg.euroPerCredit
        : null;

      if (!euroPerCredit) {
        console.error('❌ [CREDITS-PAYMENT] euroPerCredit no configurado para el centro');
        return {
          success: false,
          reservationId,
          paymentMethod: 'CREDITS',
          amount,
          error: 'El centro no tiene configurado el valor euroPorCrédito. Contacta con el administrador.'
        };
      }

      const creditsToChargeRaw = amount / euroPerCredit;
      const creditsToCharge = Number(creditsToChargeRaw.toFixed(6));

      if (!Number.isFinite(creditsToCharge) || creditsToCharge <= 0) {
        console.error('❌ [CREDITS-PAYMENT] Créditos a cobrar inválidos:', { amount, euroPerCredit, creditsToCharge });
        return {
          success: false,
          reservationId,
          paymentMethod: 'CREDITS',
          amount,
          error: 'Monto inválido para el cobro en créditos.'
        };
      }

      // 2. Verificar que el usuario tiene suficientes créditos
      const canAfford = await this.creditSystemService.canAfford(userId, creditsToCharge);
      if (!canAfford) {
        const currentBalance = await this.creditSystemService.getBalance(userId);
        return {
          success: false,
          reservationId,
          paymentMethod: 'CREDITS',
          amount,
          error: `Saldo insuficiente. Disponible: ${currentBalance} créditos, Requerido: ${creditsToCharge} créditos (importe €${amount})`
        };
      }

      // 3. Procesar el pago en transacción
      console.log('🔄 [CREDITS-PAYMENT] Iniciando transacción de pago...');
      const transactionResult = await this.prisma.$transaction(async (tx) => {
        console.log('🔄 [CREDITS-PAYMENT] Transacción iniciada, verificando idempotencia...');
        
        // Verificar idempotencia (por referenceType y referenceId)
        const existingPayment = await tx.payment.findFirst({
          where: { 
            referenceType: 'RESERVATION',
            referenceId: reservationId,
            status: 'PAID'
          }
        });
        
        if (existingPayment) {
          console.log('🔄 [CREDITS-PAYMENT] Pago ya procesado, devolviendo resultado existente');
          // Obtener balance directamente desde la BD dentro de la transacción para evitar query adicional
          const user = await tx.user.findUnique({
            where: { id: userId },
            select: { creditsBalance: true }
          });
          const result: ReservationPaymentResult = {
            success: true,
            reservationId,
            paymentMethod: 'CREDITS',
            amount,
            creditsUsed: Number(existingPayment.creditAmount),
            balanceAfter: Number(user?.creditsBalance || 0)
          };
          return result;
        }

        // Deducir créditos
        console.log('💰 [CREDITS-PAYMENT] Deduciendo créditos...');
        const creditResult = await this.creditSystemService.deductCredits({
          userId,
          credits: creditsToCharge,
          reason: 'ORDER',
          referenceId: reservationId,
          metadata: {
            reservationId,
            courtId: reservation.courtId,
            courtName: reservation.court?.name,
            startTime: reservation.startTime,
            endTime: reservation.endTime,
            amountEuro: amount,
            euroPerCredit
          },
          idempotencyKey: idempotencyKey || `RESERVATION_CREDITS:${reservationId}:${Date.now()}`
        });
        console.log('✅ [CREDITS-PAYMENT] Créditos deducidos exitosamente:', creditResult);

        // Actualizar reserva como pagada
        console.log('📝 [CREDITS-PAYMENT] Actualizando reserva como pagada...');
        const updatedReservation = await tx.reservation.update({
          where: { id: reservationId },
          data: {
            paymentStatus: 'PAID',
            status: 'PAID',
            paidAt: new Date(),
            paymentMethod: 'CREDITS',
            creditsUsed: creditsToCharge,
            creditDiscount: 0, // Sin descuento por ahora
            // Agregar información de promoción si existe
            ...(input.appliedPromo && input.appliedPromo.code && {
              promoCode: input.appliedPromo.code,
              promoDiscount: input.appliedPromo.savings || 0
            })
          }
        });
        console.log('✅ [CREDITS-PAYMENT] Reserva actualizada exitosamente:', updatedReservation.id);

        // 🎁 NUEVO: Registrar aplicación de promoción si existe (fuera de transacción principal)
        // Nota: Movido fuera de la transacción para evitar abortar el pago principal

        // ✨ Aplicar USAGE_BONUS automáticamente si existe (fuera de transacción para no bloquear)
        setImmediate(async () => {
          try {
            await this.applyUsageBonus(userId, creditsToCharge);
          } catch (promoError) {
            console.error('⚠️ [PAYMENT] Error aplicando USAGE_BONUS (no crítico):', promoError);
          }
        });

        // 🎁 Registrar aplicación de promoción (fuera de transacción principal para evitar abortos)
        if (input.appliedPromo && input.appliedPromo.code) {
          // Usar setTimeout en lugar de setImmediate para mejor manejo de errores
          setTimeout(async () => {
            try {
              if (!input.appliedPromo || !input.appliedPromo.code) {
                console.warn('⚠️ [CREDITS-PAYMENT] No hay promoción aplicada para registrar');
                return;
              }
              
              console.log('🎁 [CREDITS-PAYMENT] Registrando aplicación de promoción (async):', input.appliedPromo.code);
              
              // Buscar la promoción por código
              const promotion = await this.prisma.promotion.findUnique({
                where: { code: input.appliedPromo.code }
              });

              if (promotion) {
                // Crear registro de aplicación de promoción
                await this.prisma.promotionApplication.create({
                  data: {
                    promotionId: promotion.id,
                    userId: userId,
                    creditsAwarded: 0.01, // Valor mínimo para códigos de descuento (restricción DB)
                    metadata: {
                      reason: 'DISCOUNT_APPLIED',
                      reservationId: reservationId,
                      originalAmount: input.appliedPromo.finalAmount + input.appliedPromo.savings,
                      discountAmount: input.appliedPromo.savings,
                      finalAmount: input.appliedPromo.finalAmount
                    }
                  }
                });

                // Actualizar contador de usos de la promoción
                await this.prisma.promotion.update({
                  where: { id: promotion.id },
                  data: {
                    usageCount: { increment: 1 }
                  }
                });

                console.log('✅ [CREDITS-PAYMENT] Aplicación de promoción registrada exitosamente (async)');
              } else {
                console.warn('⚠️ [CREDITS-PAYMENT] Promoción no encontrada:', input.appliedPromo?.code);
              }
            } catch (promoError) {
              console.error('❌ [CREDITS-PAYMENT] Error registrando aplicación de promoción (async):', promoError);
              console.error('❌ [CREDITS-PAYMENT] Stack trace:', (promoError as Error)?.stack);
              // No afecta el pago principal
            }
          }, 100); // 100ms delay para asegurar que la transacción principal termine
        }

        // Crear registro de pago unificado
        console.log('💰 [CREDITS-PAYMENT] Creando registro de pago...');
        try {
          await tx.payment.create({
            data: {
              userId,
              amount: amount,
              currency: 'EUR',
              method: 'CREDITS',
              creditAmount: creditsToCharge,
              cardAmount: 0,
              status: 'PAID',
              referenceType: 'RESERVATION',
              referenceId: reservationId,
              metadata: {
                reservationId,
                courtId: reservation.courtId,
                courtName: reservation.court?.name,
                startTime: reservation.startTime,
                endTime: reservation.endTime,
                paymentMethod: 'CREDITS',
                amountEuro: amount,
                euroPerCredit
              },
              processedAt: new Date()
            }
          });
          console.log('✅ [CREDITS-PAYMENT] Registro de pago creado exitosamente');
        } catch (paymentError) {
          console.error('❌ [CREDITS-PAYMENT] Error creando registro de pago:', paymentError);
          throw paymentError; // Re-lanzar para abortar la transacción
        }


        const result: ReservationPaymentResult = {
          success: true,
          reservationId,
          paymentMethod: 'CREDITS',
          amount,
          creditsUsed: creditsToCharge,
          balanceAfter: creditResult.balanceAfter
        };
        console.log('✅ [CREDITS-PAYMENT] Transacción completada exitosamente:', result);
        return result;
      }, { timeout: 40000 }); // 40 segundos de timeout para operaciones de pago (aumentado por transacciones anidadas)

      // Obtener el resultado de la transacción
      const result = await transactionResult;

      // Registrar en ledger contable (fuera de la transacción para evitar timeout)
      try {
        await ledgerService.recordPayment({
          paymentStatus: 'PAID',
          sourceType: 'RESERVATION',
          sourceId: reservationId,
          direction: 'CREDIT',
          amountEuro: amount,
          currency: 'EUR',
          method: 'CREDITS',
          paidAt: new Date(),
          idempotencyKey: `CREDITS:RES:${reservationId}`,
          metadata: { 
            provider: 'CREDITS',
            reservationId,
            courtId: reservation?.courtId,
            creditsUsed: creditsToCharge,
            euroPerCredit
          }
        });
      } catch (e) {
        console.warn('Ledger recordPayment failed (RESERVATION CREDITS):', e);
      }

      // Crear evento para notificaciones (fuera de la transacción para evitar timeout)
      try {
        await db.outboxEvent.create({
          data: {
            eventType: 'RESERVATION_PAID',
            eventData: {
              reservationId,
              userId,
              paymentMethod: 'CREDITS',
              amount,
              creditsUsed: creditsToCharge
            }
          }
        });
      } catch (e) {
        console.warn('Failed to create outbox event:', e);
      }

      // Enviar email de confirmación con QR (igual que pago con tarjeta)
      try {
        console.log('📧 [CREDITS-PAYMENT] Iniciando envío de email de confirmación...');
        console.log('📧 [CREDITS-PAYMENT] Datos de reserva:', {
          reservationId: reservation?.id,
          userEmail: reservation?.user?.email,
          courtName: reservation?.court?.name,
          amount
        });
        await this.sendConfirmationEmailWithQR(reservation!, amount);
        console.log('✅ [CREDITS-PAYMENT] Email de confirmación enviado exitosamente');
      } catch (e) {
        console.error('❌ [CREDITS-PAYMENT] Error enviando email de confirmación:', e);
        console.error('❌ [CREDITS-PAYMENT] Stack trace:', (e as Error)?.stack);
      }

      console.log('🎉 [CREDITS-PAYMENT] Proceso de pago completado exitosamente');
      return result;

    } catch (error) {
      console.error('💥 [CREDITS-PAYMENT] Error procesando pago con créditos:', error);
      return {
        success: false,
        reservationId,
        paymentMethod: 'CREDITS',
        amount,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  /**
   * Procesar pago de reserva con tarjeta (redirección a Redsys)
   */
  async processPaymentWithCard(input: ReservationPaymentInput): Promise<ReservationPaymentResult> {
    const { reservationId, userId } = input;

    try {
      // Verificar que la reserva existe y está pendiente
      const reservation = await this.prisma.reservation.findUnique({
        where: { id: reservationId },
        include: { user: true, court: true }
      });

      if (!reservation) {
        return {
          success: false,
          reservationId,
          paymentMethod: 'CARD',
          amount: input.amount,
          error: 'Reserva no encontrada'
        };
      }

      if (reservation.status !== 'PENDING') {
        return {
          success: false,
          reservationId,
          paymentMethod: 'CARD',
          amount: input.amount,
          error: `La reserva no está pendiente. Estado actual: ${reservation.status}`
        };
      }

      if (reservation.userId !== userId) {
        return {
          success: false,
          reservationId,
          paymentMethod: 'CARD',
          amount: input.amount,
          error: 'No tienes permisos para pagar esta reserva'
        };
      }

      // Generar URL de redirección a Redsys
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';
      const redirectUrl = `${apiUrl}/api/payments/redsys/redirect?rid=${encodeURIComponent(reservationId)}`;

      return {
        success: true,
        reservationId,
        paymentMethod: 'CARD',
        amount: input.amount,
        redirectUrl
      };

    } catch (error) {
      console.error('Error procesando pago con tarjeta:', error);
      return {
        success: false,
        reservationId,
        paymentMethod: 'CARD',
        amount: input.amount,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  /**
   * Procesar pago de reserva (método principal)
   */
  async processPayment(input: ReservationPaymentInput): Promise<ReservationPaymentResult> {
    console.log('🔄 [RESERVATION-PAYMENT] Iniciando processPayment...');
    console.log('🔄 [RESERVATION-PAYMENT] Input:', input);
    
    if (input.paymentMethod === 'CREDITS') {
      console.log('💰 [RESERVATION-PAYMENT] Procesando pago con créditos...');
      return await this.processPaymentWithCredits(input);
    } else if (input.paymentMethod === 'CARD') {
      console.log('💳 [RESERVATION-PAYMENT] Procesando pago con tarjeta...');
      return await this.processPaymentWithCard(input);
    } else if (input.paymentMethod === 'FREE') {
      console.log('🎉 [RESERVATION-PAYMENT] Procesando pago gratis...');
      return await this.processPaymentFree(input);
    } else {
      console.error('❌ [RESERVATION-PAYMENT] Método de pago no soportado:', input.paymentMethod);
      return {
        success: false,
        reservationId: input.reservationId,
        paymentMethod: input.paymentMethod,
        amount: input.amount,
        error: `Método de pago no soportado: ${input.paymentMethod}`
      };
    }
  }

  /**
   * Procesar pago gratis (con promoción aplicada)
   */
  async processPaymentFree(input: ReservationPaymentInput): Promise<ReservationPaymentResult> {
    console.log('🎉 [FREE-PAYMENT] Iniciando processPaymentFree...');
    console.log('🎉 [FREE-PAYMENT] Input:', input);
    
    const { reservationId, userId, amount, idempotencyKey } = input;

    try {
      // 1. Verificar que la reserva existe y está pendiente
      console.log('🔍 [FREE-PAYMENT] Buscando reserva...');
      const reservation = await this.prisma.reservation.findUnique({
        where: { id: reservationId },
        include: { user: true, court: true }
      });

      if (!reservation) {
        console.error('❌ [FREE-PAYMENT] Reserva no encontrada');
        return {
          success: false,
          reservationId,
          paymentMethod: 'FREE',
          amount,
          error: 'Reserva no encontrada'
        };
      }

      if (reservation.paymentStatus === 'PAID') {
        console.error('❌ [FREE-PAYMENT] Reserva ya pagada');
        return {
          success: false,
          reservationId,
          paymentMethod: 'FREE',
          amount,
          error: 'La reserva ya está pagada'
        };
      }

      // 2. Verificar que el usuario es el propietario
      if (reservation.userId !== userId) {
        console.error('❌ [FREE-PAYMENT] Usuario no autorizado');
        return {
          success: false,
          reservationId,
          paymentMethod: 'FREE',
          amount,
          error: 'No autorizado para pagar esta reserva'
        };
      }

      // 3. Verificar que el monto es 0
      if (amount !== 0) {
        console.error('❌ [FREE-PAYMENT] Monto debe ser 0 para pago gratis');
        return {
          success: false,
          reservationId,
          paymentMethod: 'FREE',
          amount,
          error: 'El monto debe ser 0 para pago gratis'
        };
      }

      // 4. Procesar pago gratis usando transacción
      console.log('🔄 [FREE-PAYMENT] Iniciando transacción para pago gratis...');
      const result = await this.prisma.$transaction(async (tx) => {
        // Actualizar estado de la reserva
        const updatedReservation = await tx.reservation.update({
          where: { id: reservationId },
          data: {
            paymentStatus: 'PAID',
            paymentMethod: 'FREE',
            paidAt: new Date(),
            // Agregar información de promoción si existe
            ...(input.appliedPromo && input.appliedPromo.code && {
              promoCode: input.appliedPromo.code,
              promoDiscount: input.appliedPromo.savings || 0
            })
          }
        });

        console.log('✅ [FREE-PAYMENT] Reserva actualizada:', updatedReservation);

        // 5. Si hay promoción aplicada, registrar su uso
        if (input.appliedPromo && input.appliedPromo.code) {
          console.log('🎁 [FREE-PAYMENT] Registrando aplicación de promoción:', input.appliedPromo);
          
          try {
            // Buscar la promoción por código
            const promotion = await tx.promotion.findFirst({
              where: {
                code: input.appliedPromo.code,
                status: 'ACTIVE'
              }
            });

            if (promotion) {
              console.log('✅ [FREE-PAYMENT] Promoción encontrada:', promotion.name);
              
              // Registrar la aplicación de la promoción
              await tx.promotionApplication.create({
                data: {
                  promotionId: promotion.id,
                  userId: userId,
                  creditsAwarded: 0.01, // Valor mínimo para códigos de descuento (restricción DB)
                  appliedAt: new Date(),
                  metadata: {
                    reason: 'DISCOUNT_APPLIED',
                    reservationId: reservationId,
                    originalAmount: Number(reservation.totalPrice),
                    finalAmount: 0,
                    discountAmount: input.appliedPromo.savings
                  }
                }
              });

              // Actualizar contador de usos de la promoción
              await tx.promotion.update({
                where: { id: promotion.id },
                data: {
                  usageCount: {
                    increment: 1
                  }
                }
              });

              console.log('✅ [FREE-PAYMENT] Promoción registrada y contador actualizado');
            } else {
              console.log('⚠️ [FREE-PAYMENT] Promoción no encontrada:', input.appliedPromo?.code);
            }
          } catch (promoError) {
            console.error('❌ [FREE-PAYMENT] Error registrando promoción:', promoError);
            // No fallar la transacción por error de promoción
          }
        }

        return {
          success: true,
          reservationId,
          paymentMethod: 'FREE' as const,
          amount: 0
        };
      }, { timeout: 40000 }); // 40 segundos de timeout para operaciones de pago (aumentado por transacciones anidadas)

      console.log('🎉 [FREE-PAYMENT] Pago gratis procesado exitosamente');
      return result;

    } catch (error: any) {
      console.error('💥 [FREE-PAYMENT] Error procesando pago gratis:', error);
      return {
        success: false,
        reservationId,
        paymentMethod: 'FREE',
        amount,
        error: error.message || 'Error procesando pago gratis'
      };
    }
  }

  /**
   * Reembolsar reserva pagada con créditos
   */
  async refundReservation(params: {
    reservationId: string;
    amount?: number;
    reason: string;
    adminUserId: string;
  }): Promise<{ success: boolean; error?: string; creditsRefunded?: number }> {
    try {
      const reservation = await this.prisma.reservation.findUnique({
        where: { id: params.reservationId },
        include: { user: true }
      });

      if (!reservation) {
        return { success: false, error: 'Reserva no encontrada' };
      }

      if (reservation.paymentStatus !== 'PAID') {
        return { success: false, error: 'La reserva no está pagada' };
      }

      if (reservation.paymentMethod !== 'CREDITS') {
        return { success: false, error: 'Esta reserva no fue pagada con créditos' };
      }

      const refundAmount = params.amount || Number(reservation.creditsUsed || 0);
      
      if (refundAmount <= 0) {
        return { success: false, error: 'El monto de reembolso debe ser positivo' };
      }

      // Procesar reembolso en transacción
      return await this.prisma.$transaction(async (tx) => {
        // Reembolsar créditos
        const refundResult = await this.creditSystemService.refundCredits({
          userId: reservation.userId,
          credits: refundAmount,
          reason: `Reembolso de reserva ${params.reservationId}`,
          metadata: {
            reservationId: params.reservationId,
            refundReason: params.reason,
            adminUserId: params.adminUserId,
            originalAmount: Number(reservation.creditsUsed || 0)
          },
          idempotencyKey: `REFUND_CREDITS:RES:${params.reservationId}:${Date.now()}`
        });

        // Actualizar reserva
        await tx.reservation.update({
          where: { id: params.reservationId },
          data: {
            paymentStatus: 'REFUNDED',
            status: 'CANCELLED'
          }
        });

        // Crear registro de pago de reembolso
        await tx.payment.create({
          data: {
            userId: reservation.userId,
            amount: -refundAmount, // Negativo para reembolso
            currency: 'EUR',
            method: 'CREDITS',
            creditAmount: refundAmount,
            cardAmount: 0,
            status: 'REFUNDED',
            referenceType: 'RESERVATION',
            referenceId: params.reservationId,
            metadata: {
              type: 'REFUND',
              reservationId: params.reservationId,
              reason: params.reason,
              adminUserId: params.adminUserId
            },
            processedAt: new Date()
          }
        });

        // Registrar en ledger
        try {
          await ledgerService.recordRefund({
            sourceType: 'RESERVATION',
            sourceId: params.reservationId,
            amountEuro: refundAmount,
            currency: 'EUR',
            method: 'CREDITS',
            paidAt: new Date(),
            idempotencyKey: `REFUND:RES:${params.reservationId}`,
            metadata: { 
              provider: 'CREDITS',
              adminUserId: params.adminUserId,
              creditsRefunded: refundAmount,
              reason: params.reason
            }
          });
        } catch (e) {
          console.warn('Ledger recordRefund failed (RESERVATION CREDITS):', e);
        }

        return {
          success: true,
          creditsRefunded: refundAmount
        };
      }, { timeout: 30000 }); // 30 segundos de timeout para operaciones de reembolso (aumentado por timeout del pool)

    } catch (error) {
      console.error('Error procesando reembolso:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  /**
   * Enviar email de confirmación con QR (igual que pago con tarjeta)
   */
  private async sendConfirmationEmailWithQR(reservation: any, amount: number): Promise<void> {
    try {
      await reservationNotificationService.sendReservationConfirmation(reservation.id, { amount });
      await this.prisma.outboxEvent.create({
        data: {
          eventType: 'RESERVATION_EMAIL_SENT',
          eventData: {
            reservationId: reservation.id,
            provider: 'CREDITS',
            emailSent: true,
            qrGenerated: true,
          } as any,
        },
      });
    } catch (error) {
      console.error('❌ [CREDITS-PAYMENT] Error enviando email de confirmación:', error);
      throw error;
    }
  }

  /**
   * Aplicar USAGE_BONUS automáticamente después de usar el servicio
   * 
   * @description Busca promociones USAGE_BONUS activas que otorguen cashback
   * al pagar una reserva con créditos.
   * 
   * @param userId - ID del usuario que realizó el pago
   * @param amount - Monto pagado en créditos
   * 
   * @returns {Promise<void>}
   */
  private async applyUsageBonus(userId: string, amount: number): Promise<void> {
    console.log('🎁 [USAGE-BONUS] Verificando bonus de uso:', { userId, amount });

    try {
      const now = new Date();

      // Buscar USAGE_BONUS activos
      const usagePromotions = await this.prisma.promotion.findMany({
        where: {
          type: 'USAGE_BONUS',
          status: 'ACTIVE',
          validFrom: { lte: now },
          OR: [
            { validTo: null },
            { validTo: { gte: now } }
          ]
        }
      });

      if (usagePromotions.length === 0) {
        console.log('ℹ️ [USAGE-BONUS] No hay promociones USAGE_BONUS activas');
        return;
      }

      // Encontrar la primera promoción que aplique
      for (const promo of usagePromotions) {
        const conditions = promo.conditions as any;
        const rewards = promo.rewards as any;

        // Verificar conditions de monto
        if (conditions.minAmount && amount < conditions.minAmount) continue;
        if (conditions.maxAmount && amount > conditions.maxAmount) continue;

        // TODO: Verificar dayOfWeek y timeOfDay si están configurados

        // Verificar límite de uso global
        if (promo.usageLimit && promo.usageCount >= promo.usageLimit) {
          console.log(`⚠️ [USAGE-BONUS] ${promo.name}: Límite alcanzado`);
          continue;
        }

        // Solo aplicar FIXED_CREDITS y PERCENTAGE_BONUS (cashback post-pago)
        if (!['FIXED_CREDITS', 'PERCENTAGE_BONUS'].includes(rewards.type)) {
          console.log(`⚠️ [USAGE-BONUS] ${promo.name}: Tipo ${rewards.type} no aplicable post-pago`);
          continue;
        }

        console.log('✅ [USAGE-BONUS] Promoción aplicable:', promo.name);

        // Calcular créditos a otorgar (cashback)
        let creditsAwarded = 0;

        if (rewards.type === 'FIXED_CREDITS') {
          creditsAwarded = rewards.value;
        } else if (rewards.type === 'PERCENTAGE_BONUS') {
          creditsAwarded = amount * (rewards.value / 100);
        }

        // Aplicar límite máximo
        if (rewards.maxRewardAmount && creditsAwarded > rewards.maxRewardAmount) {
          creditsAwarded = rewards.maxRewardAmount;
        }

        creditsAwarded = Math.round(creditsAwarded * 100) / 100;

        console.log('💰 [USAGE-BONUS] Otorgando cashback:', creditsAwarded);

        // Aplicar en transacción
        await this.prisma.$transaction(async (tx) => {
          await tx.promotionApplication.create({
            data: {
              promotionId: promo.id,
              userId,
              creditsAwarded,
              metadata: {
                autoApplied: true,
                reason: 'USAGE',
                reservationAmount: amount,
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
                promotionType: 'USAGE_BONUS',
                autoApplied: true,
                reservationAmount: amount
              },
              idempotencyKey: `USAGE_BONUS:${userId}:${promo.id}:${Date.now()}`
            }
          });

          console.log('✅ [USAGE-BONUS] Aplicado exitosamente:', {
            promotion: promo.name,
            creditsAwarded,
            newBalance: Number(updatedUser.creditsBalance)
          });
        }, { timeout: 30000 }); // 30 segundos de timeout para operaciones de bonus (aumentado por timeout del pool)

        // Solo aplicar la primera promoción que coincida
        break;
      }

    } catch (error) {
      console.error('❌ [USAGE-BONUS] Error:', error);
      // No relanzar para no interrumpir el flujo de pago
    }
  }
}

// Singleton instance
let reservationPaymentServiceInstance: ReservationPaymentService | null = null;

export function getReservationPaymentService(prisma?: PrismaClient): ReservationPaymentService {
  if (!reservationPaymentServiceInstance && prisma) {
    reservationPaymentServiceInstance = new ReservationPaymentService(prisma);
  }
  
  if (!reservationPaymentServiceInstance) {
    throw new Error('ReservationPaymentService no inicializado. Proporciona una instancia de Prisma.');
  }
  
  return reservationPaymentServiceInstance;
}
