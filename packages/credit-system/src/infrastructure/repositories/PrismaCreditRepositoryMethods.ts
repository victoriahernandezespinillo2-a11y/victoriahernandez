/**
 * Métodos adicionales para PrismaCreditRepository
 * Implementación de métodos faltantes para compatibilidad
 */

import { CreditBalance } from '../../domain/entities/CreditBalance';
import { CreditTransaction } from '../../domain/entities/CreditTransaction';
import { CreditAmount } from '../../domain/value-objects/CreditAmount';
import { TransactionId } from '../../domain/value-objects/TransactionId';
import { UserId } from '../../domain/value-objects/UserId';

export class PrismaCreditRepositoryMethods {
  /**
   * Obtener balance de un usuario (alias para compatibilidad)
   */
  async getBalance(userId: UserId): Promise<CreditBalance> {
    const balance = await this.findBalanceByUserId(userId);
    if (!balance) {
      // Crear balance inicial si no existe
      const newBalance = new CreditBalance({
        userId,
        amount: new CreditAmount(0, 'EUR'),
        version: 1
      });
      await this.saveBalance(newBalance);
      return newBalance;
    }
    return balance;
  }

  /**
   * Buscar transacción por clave (alias para compatibilidad)
   */
  async findByKey(idempotencyKey: string): Promise<CreditTransaction | null> {
    return this.findTransactionByIdempotencyKey(idempotencyKey);
  }

  /**
   * Realizar débito de créditos
   */
  async debit(data: {
    userId: UserId;
    amount: any;
    reason: string;
    referenceId?: string;
    metadata?: Record<string, any>;
    idempotencyKey?: string;
  }): Promise<{ balanceAfter: number; transactionId: string }> {
    return this.transaction(async (tx) => {
      // Verificar idempotencia
      if (data.idempotencyKey) {
        const existing = await tx.findTransactionByIdempotencyKey(data.idempotencyKey);
        if (existing) {
          return {
            balanceAfter: existing.balanceAfter.value,
            transactionId: existing.id.value
          };
        }
      }

      // Obtener balance actual
      const currentBalance = await tx.findBalanceByUserId(data.userId);
      if (!currentBalance) {
        throw new Error('Usuario no encontrado');
      }

      // Verificar saldo suficiente
      if (currentBalance.amount.isLessThan(data.amount)) {
        throw new Error('Saldo insuficiente');
      }

      // Calcular nuevo balance
      const newAmount = currentBalance.amount.subtract(data.amount);
      const updatedBalance = new CreditBalance({
        userId: data.userId,
        amount: newAmount,
        version: 1
      });

      // Crear transacción
      const transaction = new CreditTransaction({
        id: new TransactionId(`tx_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`),
        userId: data.userId,
        type: 'DEBIT' as any,
        amount: data.amount,
        reason: data.reason as any,
        balanceBefore: currentBalance.amount,
        balanceAfter: newAmount,
        referenceId: data.referenceId,
        metadata: data.metadata,
        idempotencyKey: data.idempotencyKey,
        createdAt: new Date()
      });

      // Guardar cambios
      await tx.saveBalance(updatedBalance);
      await tx.saveTransaction(transaction);

      return {
        balanceAfter: newAmount.value,
        transactionId: transaction.id.value
      };
    });
  }

  // Métodos que deben ser implementados por la clase base
  async findBalanceByUserId(_userId: UserId): Promise<CreditBalance | null> {
    throw new Error('Method must be implemented by subclass');
  }

  async saveBalance(_balance: CreditBalance): Promise<void> {
    throw new Error('Method must be implemented by subclass');
  }

  async findTransactionByIdempotencyKey(_idempotencyKey: string): Promise<CreditTransaction | null> {
    throw new Error('Method must be implemented by subclass');
  }

  async transaction<T>(_operation: (tx: any) => Promise<T>): Promise<T> {
    throw new Error('Method must be implemented by subclass');
  }
}
