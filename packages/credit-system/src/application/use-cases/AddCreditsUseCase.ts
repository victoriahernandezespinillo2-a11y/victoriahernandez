/**
 * Use Case: AddCreditsUseCase
 * Caso de uso para agregar créditos a un usuario
 */

import { AddCreditsCommand } from '../commands/AddCreditsCommand';
import { CreditTransaction } from '../../domain/entities/CreditTransaction';
import { CreditRepository } from '../../domain/repositories/CreditRepository';
import { EventBus } from '../../domain/events/EventBus';
import { ValidationResult } from '../../domain/common/ValidationResult';

export class AddCreditsUseCase {
  constructor(
    private creditRepository: CreditRepository,
    private eventBus: EventBus
  ) {}

  /**
   * Ejecutar el caso de uso
   */
  async execute(command: AddCreditsCommand): Promise<CreditTransaction> {
    // Validar comando
    const validation = await this.validateCommand(command);
    if (!validation.isValid) {
      throw new Error(`Comando inválido: ${validation.errors.join(', ')}`);
    }

    // Ejecutar en transacción
    return await this.creditRepository.transaction(async (tx) => {
      // Verificar idempotencia
      if (command.idempotencyKey) {
        const existingTransaction = await tx.findTransactionByIdempotencyKey(
          command.idempotencyKey
        );
        if (existingTransaction) {
          return existingTransaction;
        }
      }

      // Obtener balance actual
      const currentBalance = await tx.findBalanceByUserId(command.userId);
      if (!currentBalance) {
        throw new Error(`Usuario no encontrado: ${command.userId.value}`);
      }

      // Crear nueva transacción
      const transaction = CreditTransaction.createCredit({
        userId: command.userId,
        amount: command.amount,
        reason: command.reason,
        balanceBefore: currentBalance.amount,
        referenceId: command.referenceId,
        metadata: command.metadata,
        idempotencyKey: command.idempotencyKey
      });

      // Actualizar balance
      const updatedBalance = currentBalance.add(command.amount);
      await tx.saveBalance(updatedBalance);

      // Guardar transacción
      await tx.saveTransaction(transaction);

      // Emitir eventos de dominio
      await this.eventBus.publish({
        type: 'CREDITS_ADDED',
        payload: {
          userId: command.userId.value,
          amount: command.amount.value,
          transactionId: transaction.id.value,
          reason: command.reason,
          timestamp: new Date()
        },
        timestamp: new Date(),
        aggregateId: command.userId.value,
        version: 1
      });

      // Auditoría (comentado temporalmente)
      // await this.auditService.log({
      //   action: 'CREDITS_ADDED',
      //   userId: command.userId.value,
      //   amount: command.amount.value,
      //   transactionId: transaction.id.value,
      //   metadata: command.metadata,
      //   timestamp: new Date()
      // });

      return transaction;
    });
  }

  /**
   * Validar el comando
   */
  private async validateCommand(command: AddCreditsCommand): Promise<ValidationResult> {
    const errors: string[] = [];

    // Validar que el monto sea positivo
    if (!command.amount.isPositive()) {
      errors.push('El monto debe ser positivo');
    }

    // Validar que el usuario exista
    const userExists = await this.creditRepository.userExists(command.userId);
    if (!userExists) {
      errors.push(`Usuario no encontrado: ${command.userId.value}`);
    }

    // Validar que la razón sea válida
    const validReasons = ['TOPUP', 'PROMOTION', 'REFUND', 'ADMIN_ADJUSTMENT'];
    if (!validReasons.includes(command.reason)) {
      errors.push(`Razón inválida: ${command.reason}`);
    }

    return new ValidationResult(errors.length === 0, errors);
  }
}
