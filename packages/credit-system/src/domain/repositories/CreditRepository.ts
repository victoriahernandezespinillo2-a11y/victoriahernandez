/**
 * Repository Interface: CreditRepository
 * Contrato para la persistencia de entidades de créditos
 */

import { CreditBalance } from '../entities/CreditBalance';
import { CreditTransaction } from '../entities/CreditTransaction';
import { UserId } from '../value-objects/UserId';
import { TransactionId } from '../value-objects/TransactionId';

export interface TransactionContext {
  findBalanceByUserId(userId: UserId): Promise<CreditBalance | null>;
  findTransactionByIdempotencyKey(key: string): Promise<CreditTransaction | null>;
  saveBalance(balance: CreditBalance): Promise<void>;
  saveTransaction(transaction: CreditTransaction): Promise<void>;
  findTransactionsByUserId(userId: UserId, limit?: number): Promise<CreditTransaction[]>;
}

export interface CreditRepository {
  /**
   * Ejecutar operaciones en una transacción
   */
  transaction<T>(operation: (tx: TransactionContext) => Promise<T>): Promise<T>;

  /**
   * Verificar si un usuario existe
   */
  userExists(userId: UserId): Promise<boolean>;

  /**
   * Obtener balance de un usuario
   */
  findBalanceByUserId(userId: UserId): Promise<CreditBalance | null>;

  /**
   * Guardar balance
   */
  saveBalance(balance: CreditBalance): Promise<void>;

  /**
   * Obtener transacción por ID
   */
  findTransactionById(id: TransactionId): Promise<CreditTransaction | null>;

  /**
   * Obtener transacción por clave de idempotencia
   */
  findTransactionByIdempotencyKey(key: string): Promise<CreditTransaction | null>;

  /**
   * Guardar transacción
   */
  saveTransaction(transaction: CreditTransaction): Promise<void>;

  /**
   * Obtener transacciones de un usuario
   */
  findTransactionsByUserId(
    userId: UserId,
    options?: {
      limit?: number;
      offset?: number;
      fromDate?: Date;
      toDate?: Date;
    }
  ): Promise<CreditTransaction[]>;

  /**
   * Obtener historial de transacciones
   */
  findTransactionHistory(options?: {
    userId?: UserId;
    limit?: number;
    offset?: number;
    fromDate?: Date;
    toDate?: Date;
    type?: string;
    reason?: string;
  }): Promise<CreditTransaction[]>;

  /**
   * Obtener balance de un usuario (alias para compatibilidad)
   */
  getBalance(userId: UserId): Promise<CreditBalance>;

  /**
   * Buscar transacción por clave (alias para compatibilidad)
   */
  findByKey(idempotencyKey: string): Promise<CreditTransaction | null>;

  /**
   * Realizar débito de créditos
   */
  debit(data: {
    userId: UserId;
    amount: any;
    reason: string;
    referenceId?: string;
    metadata?: Record<string, any>;
    idempotencyKey?: string;
  }): Promise<{ balanceAfter: number; transactionId: string }>;
}
