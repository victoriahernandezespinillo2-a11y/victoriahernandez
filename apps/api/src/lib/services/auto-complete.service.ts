/**
 * Servicio para auto-completar reservas sin necesidad de cron
 * Se ejecuta en endpoints existentes para mantener el estado actualizado
 */

import { db } from '@repo/db';

export class AutoCompleteService {
  /**
   * Marca automáticamente como COMPLETED las reservas que ya terminaron
   * y están en estado IN_PROGRESS
   */
  static async autoCompleteExpiredReservations(): Promise<{ completed: number; errors: number }> {
    try {
      const now = new Date();
      
      // Buscar reservas que:
      // 1. Están en estado IN_PROGRESS
      // 2. Ya terminaron (endTime < now)
      // 3. Tienen checkInTime (se hizo check-in)
      const expiredReservations = await db.reservation.findMany({
        where: {
          status: 'IN_PROGRESS',
          endTime: { lt: now },
          checkInTime: { not: null },
        },
        select: { id: true, endTime: true },
      });

      if (expiredReservations.length === 0) {
        return { completed: 0, errors: 0 };
      }

      console.log(`🔄 [AUTO-COMPLETE] Procesando ${expiredReservations.length} reservas expiradas`);

      let completed = 0;
      let errors = 0;

      for (const reservation of expiredReservations) {
        try {
          // Actualizar estado a COMPLETED
          await db.reservation.update({
            where: { id: reservation.id },
            data: { 
              status: 'COMPLETED',
              checkOutTime: new Date(reservation.endTime) // Usar endTime como checkOutTime
            },
          });

          // Registrar evento de completado
          await db.outboxEvent.create({
            data: {
              eventType: 'RESERVATION_COMPLETED',
              eventData: { 
                reservationId: reservation.id, 
                completedAt: now.toISOString(),
                endTime: reservation.endTime.toISOString()
              } as any,
            },
          });

          completed++;
          console.log(`✅ [AUTO-COMPLETE] Reserva ${reservation.id} marcada como COMPLETED`);
        } catch (error) {
          errors++;
          console.error(`❌ [AUTO-COMPLETE] Error procesando reserva ${reservation.id}:`, error);
        }
      }

      if (completed > 0) {
        console.log(`🎉 [AUTO-COMPLETE] Completadas ${completed} reservas, ${errors} errores`);
      }

      return { completed, errors };
    } catch (error) {
      console.error('❌ [AUTO-COMPLETE] Error general:', error);
      return { completed: 0, errors: 1 };
    }
  }

  /**
   * Versión ligera que solo verifica sin procesar (para endpoints que no necesitan el overhead)
   */
  static async checkExpiredReservations(): Promise<number> {
    try {
      const now = new Date();
      
      const count = await db.reservation.count({
        where: {
          status: 'IN_PROGRESS',
          endTime: { lt: now },
          checkInTime: { not: null },
        },
      });

      return count;
    } catch (error) {
      console.error('❌ [AUTO-COMPLETE-CHECK] Error:', error);
      return 0;
    }
  }
}



