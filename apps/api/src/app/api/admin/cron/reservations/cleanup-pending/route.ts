import { NextRequest } from 'next/server';
import { ApiResponse, withAdminMiddleware } from '@/lib/middleware';
import { db } from '@repo/db';

/**
 * Cron job para limpiar reservas PENDING expiradas
 * Se ejecuta cada 15 minutos para cancelar reservas PENDING que no se completaron
 * en el tiempo establecido (15 minutos por defecto)
 */
export async function GET(request: NextRequest) {
  // Protección simple por secreto opcional (útil para Vercel cron externamente)
  const secret = request.nextUrl.searchParams.get('secret');
  if ((process.env.CRON_SECRET || '') && secret !== process.env.CRON_SECRET) {
    return ApiResponse.unauthorized('No autorizado');
  }

  // Permitir invocación sin sesión usando secreto, o autenticado admin vía withAdminMiddleware
  return await withAdminMiddleware(async () => {
    try {
      console.log('🧹 [CRON] Iniciando limpieza automática de reservas PENDING expiradas...');
      
      // Configuración del timeout (15 minutos por defecto, configurable via env)
      const timeoutMinutes = parseInt(process.env.PENDING_RESERVATION_TIMEOUT_MINUTES || '15');
      const cutoffTime = new Date(Date.now() - timeoutMinutes * 60 * 1000);
      
      console.log(`⏰ [CRON] Buscando reservas PENDING creadas antes de: ${cutoffTime.toISOString()}`);
      
      // Buscar reservas PENDING expiradas
      const expiredReservations = await db.reservation.findMany({
        where: {
          status: 'PENDING',
          createdAt: {
            lt: cutoffTime
          }
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
            
            console.log(`✅ [CRON] Cancelada reserva ${reservation.id} (${minutesAgo} min de antigüedad)`);
            
          } catch (error) {
            console.error(`❌ [CRON] Error cancelando reserva ${reservation.id}:`, error);
            // Continuar con las demás reservas
          }
        }
      });
      
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
  })(request, {} as any);
}