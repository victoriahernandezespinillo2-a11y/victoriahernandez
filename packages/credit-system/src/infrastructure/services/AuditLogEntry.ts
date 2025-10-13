/**
 * Audit Log Entry Interface
 * Representa una entrada de auditoría
 */

export interface AuditLogEntry {
  action: string;
  userId: string;
  amount?: number;
  transactionId?: string;
  metadata?: Record<string, any>;
  timestamp: Date;
}



