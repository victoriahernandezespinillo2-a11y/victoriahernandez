/**
 * Use Case: Deduct Credits
 * Maneja la deducción de créditos de un usuario
 */

import { CreditAmount } from '../../domain/value-objects/CreditAmount';
import { UserId } from '../../domain/value-objects/UserId';
import { CreditRepository } from '../../domain/repositories/CreditRepository';
import { EventBus } from '../../domain/events/EventBus';

export interface DeductCreditsInput {
  userId: string;
  amount: number;
  currency: string;
  reason: string;
  referenceId?: string;
  metadata?: Record<string, any>;
  idempotencyKey?: string;
}

export interface DeductCreditsOutput {
  success: boolean;
  balanceAfter: number;
  transactionId?: string;
  error?: string;
}

export class DeductCreditsUseCase {
  constructor(
    private creditRepository: CreditRepository,
    private eventBus: EventBus
  ) {}

  async execute(input: DeductCreditsInput): Promise<DeductCreditsOutput> {
    try {
      const userId = new UserId(input.userId);
      const amount = new CreditAmount(input.amount, input.currency);

      // Verificar balance suficiente
      const currentBalance = await this.creditRepository.getBalance(userId);
      if (currentBalance.amount.isLessThan(amount)) {
        return {
          success: false,
          balanceAfter: currentBalance.amount.value,
          error: 'Saldo insuficiente'
        };
      }

      // Verificar idempotencia
      if (input.idempotencyKey) {
        const existing = await this.creditRepository.findByKey(input.idempotencyKey);
        if (existing) {
          return {
            success: true,
            balanceAfter: existing.balanceAfter.value,
            transactionId: existing.id.value
          };
        }
      }

      // Ejecutar deducción
      const result = await this.creditRepository.debit({
        userId,
        amount,
        reason: input.reason,
        referenceId: input.referenceId,
        metadata: input.metadata || {},
        idempotencyKey: input.idempotencyKey
      });

      // Emitir evento
      await this.eventBus.emit('credits.deducted', {
        userId: input.userId,
        amount: input.amount,
        currency: input.currency,
        balanceAfter: result.balanceAfter,
        transactionId: result.transactionId
      });

      return {
        success: true,
        balanceAfter: result.balanceAfter,
        transactionId: result.transactionId
      };

    } catch (error) {
      return {
        success: false,
        balanceAfter: 0,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }
}
