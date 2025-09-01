import { LRUCache } from 'lru-cache';

/**
 * Servicio de bloqueo temporal para reservas
 * Evita conflictos de concurrencia durante la creación de reservas
 */
class ReservationLockService {
  private locks: LRUCache<string, { timestamp: number; userId: string }>;
  private readonly LOCK_DURATION = 30 * 1000; // 30 segundos
  private readonly MAX_LOCKS = 1000; // Máximo número de locks en memoria

  constructor() {
    this.locks = new LRUCache({
      max: this.MAX_LOCKS,
      ttl: this.LOCK_DURATION,
    });
  }

  /**
   * Genera una clave única para el bloqueo basada en cancha y horario
   */
  private generateLockKey(courtId: string, startTime: Date, endTime: Date): string {
    const start = startTime.toISOString();
    const end = endTime.toISOString();
    return `${courtId}:${start}:${end}`;
  }

  /**
   * Intenta adquirir un bloqueo para una reserva
   * @param courtId ID de la cancha
   * @param startTime Hora de inicio de la reserva
   * @param endTime Hora de fin de la reserva
   * @param userId ID del usuario que intenta hacer la reserva
   * @returns true si se adquirió el bloqueo, false si ya está bloqueado
   */
  async acquireLock(
    courtId: string,
    startTime: Date,
    endTime: Date,
    userId: string
  ): Promise<boolean> {
    const lockKey = this.generateLockKey(courtId, startTime, endTime);
    const existingLock = this.locks.get(lockKey);

    // Si ya existe un bloqueo y no es del mismo usuario
    if (existingLock && existingLock.userId !== userId) {
      const now = Date.now();
      const lockAge = now - existingLock.timestamp;
      
      // Si el bloqueo aún es válido
      if (lockAge < this.LOCK_DURATION) {
        console.log(`🔒 [RESERVATION-LOCK] Bloqueo activo para ${lockKey} por usuario ${existingLock.userId}`);
        return false;
      }
    }

    // Adquirir o renovar el bloqueo
    this.locks.set(lockKey, {
      timestamp: Date.now(),
      userId,
    });

    console.log(`✅ [RESERVATION-LOCK] Bloqueo adquirido para ${lockKey} por usuario ${userId}`);
    return true;
  }

  /**
   * Libera un bloqueo específico
   * @param courtId ID de la cancha
   * @param startTime Hora de inicio de la reserva
   * @param endTime Hora de fin de la reserva
   * @param userId ID del usuario (solo puede liberar sus propios bloqueos)
   */
  async releaseLock(
    courtId: string,
    startTime: Date,
    endTime: Date,
    userId: string
  ): Promise<void> {
    const lockKey = this.generateLockKey(courtId, startTime, endTime);
    const existingLock = this.locks.get(lockKey);

    // Solo puede liberar sus propios bloqueos
    if (existingLock && existingLock.userId === userId) {
      this.locks.delete(lockKey);
      console.log(`🔓 [RESERVATION-LOCK] Bloqueo liberado para ${lockKey} por usuario ${userId}`);
    }
  }

  /**
   * Verifica si un horario está bloqueado
   * @param courtId ID de la cancha
   * @param startTime Hora de inicio de la reserva
   * @param endTime Hora de fin de la reserva
   * @returns true si está bloqueado, false si está disponible
   */
  isLocked(courtId: string, startTime: Date, endTime: Date): boolean {
    const lockKey = this.generateLockKey(courtId, startTime, endTime);
    const existingLock = this.locks.get(lockKey);

    if (!existingLock) {
      return false;
    }

    const now = Date.now();
    const lockAge = now - existingLock.timestamp;
    
    // Si el bloqueo ha expirado, lo eliminamos
    if (lockAge >= this.LOCK_DURATION) {
      this.locks.delete(lockKey);
      return false;
    }

    return true;
  }

  /**
   * Obtiene estadísticas del servicio de bloqueos
   */
  getStats() {
    return {
      activeLocks: this.locks.size,
      maxLocks: this.MAX_LOCKS,
      lockDuration: this.LOCK_DURATION,
    };
  }

  /**
   * Limpia todos los bloqueos (útil para testing)
   */
  clearAllLocks(): void {
    this.locks.clear();
    console.log('🧹 [RESERVATION-LOCK] Todos los bloqueos han sido limpiados');
  }
}

// Singleton instance
export const reservationLockService = new ReservationLockService();
export { ReservationLockService };
