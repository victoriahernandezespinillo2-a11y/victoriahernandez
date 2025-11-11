import { NextRequest } from 'next/server';
import { ApiResponse, withAdminMiddleware } from '@/lib/middleware';
import { NON_EXPIRABLE_PAYMENT_METHODS } from '@/lib/constants/reservation.constants';
import { reservationNotificationService } from '@/lib/services/reservation-notification.service';
import { ReservationReminderService } from '@/lib/services/reservation-reminder.service';
import { db } from '@repo/db';

/**
 * Cron job para limpiar reservas PENDING expiradas
 * Se ejecuta cada 5 minutos (o la frecuencia que configures) para cancelar reservas PENDING que no se completaron
 * en el tiempo establecido (5 minutos por defecto, configurable por env)
 */
export async function GET(request: NextRequest) {
  // Protección por secreto para cron jobs externos (GitHub Actions, Vercel Cron)
  const secret = request.nextUrl.searchParams.get('secret');
  const hasValidSecret = secret && process.env.CRON_SECRET && secret === process.env.CRON_SECRET;
  
  // Si no tiene secret válido, requiere autenticación de admin
  if (!hasValidSecret) {
    return await withAdminMiddleware(async () => {
      return executeCleanup();
    })(request);
  }
  
  // Si tiene secret válido, ejecutar directamente sin middleware
  return executeCleanup();
}

async function executeCleanup() {
  try {
      console.log('🧹 [CRON] Iniciando limpieza automática de reservas PENDING expiradas...');

      const now = new Date();

      try {
        await ReservationReminderService.processPendingPaymentReminders(now);
      } catch (error) {
        console.error('❌ [CRON] Error procesando recordatorios de pago pendiente:', error);
      }
      
      // Configuración del timeout (5 minutos por defecto, configurable via env)
      const timeoutMinutes = parseInt(process.env.PENDING_RESERVATION_TIMEOUT_MINUTES || '5');
      const cutoffTime = new Date(now.getTime() - timeoutMinutes * 60 * 1000);
      
      console.log(
        `⏰ [CRON] Buscando reservas PENDING expiradas (expiresAt < ${now.toISOString()} o legacy antes de ${cutoffTime.toISOString()})`
      );
      
      // Buscar reservas PENDING expiradas, respetando métodos no expirables
      const expiredReservations = await db.reservation.findMany({
        where: {
          status: 'PENDING',
          NOT: {
            paymentMethod: {
              in: [...NON_EXPIRABLE_PAYMENT_METHODS],
            },
          },
          OR: [
            {
              AND: [
                { expiresAt: { not: null } },
                { expiresAt: { lt: now } },
              ],
            },
            {
              AND: [
                { expiresAt: null },
                { createdAt: { lt: cutoffTime } },
              ],
            },
          ],
        },
        select: {
          id: true,
          userId: true,
          courtId: true,
          startTime: true,
          endTime: true,
          totalPrice: true,
          notes: true,
          createdAt: true
        }
      });
      
      console.log(`📊 [CRON] Encontradas ${expiredReservations.length} reservas PENDING expiradas`);
      
      if (expiredReservations.length === 0) {
        console.log('✅ [CRON] No hay reservas PENDING expiradas para limpiar');
        return ApiResponse.success({
          message: 'No hay reservas PENDING expiradas para limpiar',
          cleaned: 0,
          timeoutMinutes,
          cutoffTime: cutoffTime.toISOString()
        });
      }
      
      // Cancelar las reservas expiradas en una transacción
      let cleanedCount = 0;
      const cleanupResults = [];
      const notifications: Array<{ id: string; minutesAgo: number }> = [];
      
      await db.$transaction(async (tx) => {
        for (const reservation of expiredReservations) {
          const minutesAgo = Math.floor((Date.now() - new Date(reservation.createdAt).getTime()) / (1000 * 60));
          
          try {
            // Actualizar el estado a CANCELLED
            await tx.reservation.update({
              where: { id: reservation.id },
              data: {
                status: 'CANCELLED',
                notes: `${reservation.notes || ''} - Auto-cancelada por timeout (${minutesAgo} min)`.trim()
              }
            });
            
            // Crear evento para procesamiento asíncrono (notificaciones, reembolsos, etc.)
            await tx.outboxEvent.create({
              data: {
                eventType: 'RESERVATION_AUTO_CANCELLED',
                eventData: {
                  reservationId: reservation.id,
                  userId: reservation.userId,
                  courtId: reservation.courtId,
                  startTime: reservation.startTime,
                  endTime: reservation.endTime,
                  reason: `Auto-cancelada por timeout después de ${minutesAgo} minutos`,
                  originalStatus: 'PENDING',
                  totalPrice: reservation.totalPrice,
                  cleanupTimestamp: new Date().toISOString()
                }
              }
            });
            
            cleanedCount++;
            cleanupResults.push({
              id: reservation.id,
              minutesAgo,
              startTime: reservation.startTime,
              totalPrice: reservation.totalPrice
            });
            notifications.push({ id: reservation.id, minutesAgo });
            
            console.log(`✅ [CRON] Cancelada reserva ${reservation.id} (${minutesAgo} min de antigüedad)`);
            
          } catch (error) {
            console.error(`❌ [CRON] Error cancelando reserva ${reservation.id}:`, error);
            // Continuar con las demás reservas
          }
        }
      });
      
      for (const notification of notifications) {
        try {
          await reservationNotificationService.sendAutoCancelledNotification(notification.id, {
            cancelReason: 'No recibimos el pago dentro del tiempo establecido.',
            cancelledAt: new Date(),
          });
        } catch (error) {
          console.error('❌ [CRON] Error enviando notificación de cancelación:', error);
        }
      }
      
      console.log(`🎉 [CRON] Limpieza automática completada: ${cleanedCount}/${expiredReservations.length} reservas canceladas`);
      
      return ApiResponse.success({
        message: `Limpieza automática completada: ${cleanedCount} reservas PENDING expiradas canceladas`,
        cleaned: cleanedCount,
        total: expiredReservations.length,
        timeoutMinutes,
        cutoffTime: cutoffTime.toISOString(),
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('❌ [CRON] Error en limpieza automática de reservas PENDING:', error);
      return ApiResponse.internalError('Error interno del servidor');
    }
}
