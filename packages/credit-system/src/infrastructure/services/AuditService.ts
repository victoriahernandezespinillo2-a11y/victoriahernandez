/**
 * Infrastructure Service: AuditService
 * Servicio de auditoría para registrar operaciones críticas
 */

export interface AuditLogEntry {
  action: string;
  userId: string;
  amount?: number;
  transactionId?: string;
  metadata?: Record<string, any>;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuditService {
  /**
   * Registrar una operación en el log de auditoría
   */
  log(entry: AuditLogEntry): Promise<void>;

  /**
   * Obtener logs de auditoría
   */
  getLogs(options?: {
    userId?: string;
    action?: string;
    fromDate?: Date;
    toDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<AuditLogEntry[]>;
}

/**
 * Implementación simple del servicio de auditoría
 */
export class SimpleAuditService implements AuditService {
  private logs: AuditLogEntry[] = [];

  async log(entry: AuditLogEntry): Promise<void> {
    const logEntry: AuditLogEntry = {
      ...entry,
      timestamp: new Date()
    };

    this.logs.push(logEntry);

    // En un sistema real, aquí guardarías en base de datos
    console.log('🔍 AUDIT LOG:', {
      action: logEntry.action,
      userId: logEntry.userId,
      amount: logEntry.amount,
      transactionId: logEntry.transactionId,
      timestamp: logEntry.timestamp.toISOString()
    });
  }

  async getLogs(options: {
    userId?: string;
    action?: string;
    fromDate?: Date;
    toDate?: Date;
    limit?: number;
    offset?: number;
  } = {}): Promise<AuditLogEntry[]> {
    let filteredLogs = [...this.logs];

    // Filtrar por usuario
    if (options.userId) {
      filteredLogs = filteredLogs.filter(log => log.userId === options.userId);
    }

    // Filtrar por acción
    if (options.action) {
      filteredLogs = filteredLogs.filter(log => log.action === options.action);
    }

    // Filtrar por fecha
    if (options.fromDate) {
      filteredLogs = filteredLogs.filter(log => log.timestamp >= options.fromDate!);
    }

    if (options.toDate) {
      filteredLogs = filteredLogs.filter(log => log.timestamp <= options.toDate!);
    }

    // Ordenar por timestamp descendente
    filteredLogs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Aplicar paginación
    const offset = options.offset || 0;
    const limit = options.limit || 100;

    return filteredLogs.slice(offset, offset + limit);
  }
}

/**
 * Servicio de auditoría singleton
 */
export const auditService = new SimpleAuditService();



