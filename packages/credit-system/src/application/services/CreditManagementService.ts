/**
 * Application Service: CreditManagementService
 * Fachada para operaciones de gestión de créditos
 */

import { AddCreditsUseCase } from '../use-cases/AddCreditsUseCase';
import { DeductCreditsUseCase } from '../use-cases/DeductCreditsUseCase';
import { AddCreditsCommand } from '../commands/AddCreditsCommand';
import { DeductCreditsCommand } from '../commands/DeductCreditsCommand';
import { CreditTransaction } from '../../domain/entities/CreditTransaction';
import { CreditBalance } from '../../domain/entities/CreditBalance';
import { UserId } from '../../domain/value-objects/UserId';
import { CreditAmount } from '../../domain/value-objects/CreditAmount';
import { CreditRepository } from '../../domain/repositories/CreditRepository';
import { SimpleEventBus } from '../../domain/events/EventBus';

export interface CreditOperationResult {
  success: boolean;
  transaction?: any; // Cambiado para aceptar DeductCreditsOutput
  balance?: CreditBalance;
  error?: string;
}

export class CreditManagementService {
  private addCreditsUseCase: AddCreditsUseCase;
  private deductCreditsUseCase: DeductCreditsUseCase;

  constructor(
    private creditRepository: CreditRepository
  ) {
    // Crear EventBus singleton
    const eventBus = new SimpleEventBus();
    
    this.addCreditsUseCase = new AddCreditsUseCase(
      creditRepository,
      eventBus
    );
    this.deductCreditsUseCase = new DeductCreditsUseCase(
      creditRepository,
      eventBus
    );
  }

  /**
   * Agregar créditos a un usuario
   */
  async addCredits(params: {
    userId: string;
    amount: number;
    currency?: string;
    reason: string;
    referenceId?: string;
    metadata?: Record<string, any>;
    idempotencyKey?: string;
  }): Promise<CreditOperationResult> {
    try {
      const command = AddCreditsCommand.create(params);
      const transaction = await this.addCreditsUseCase.execute(command);
      
      // Obtener balance actualizado
      const balance = await this.creditRepository.findBalanceByUserId(
        new UserId(params.userId)
      );

      return {
        success: true,
        transaction,
        balance: balance || undefined
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  /**
   * Deducir créditos de un usuario
   */
  async deductCredits(params: {
    userId: string;
    amount: number;
    currency?: string;
    reason: string;
    referenceId?: string;
    metadata?: Record<string, any>;
    idempotencyKey?: string;
  }): Promise<CreditOperationResult> {
    try {
      const command = DeductCreditsCommand.create({
        ...params,
        currency: params.currency || 'EUR'
      });
      
      // Convertir command a input para el use case
      const input = {
        userId: command.userId.value,
        amount: command.amount.value,
        currency: command.amount.currency,
        reason: command.reason,
        referenceId: command.referenceId,
        metadata: command.metadata,
        idempotencyKey: command.idempotencyKey
      };
      
      const transaction = await this.deductCreditsUseCase.execute(input);
      
      // Obtener balance actualizado
      const balance = await this.creditRepository.findBalanceByUserId(
        new UserId(params.userId)
      );

      return {
        success: true,
        transaction,
        balance: balance || undefined
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  /**
   * Obtener balance de un usuario
   */
  async getBalance(userId: string): Promise<CreditBalance | null> {
    return await this.creditRepository.findBalanceByUserId(new UserId(userId));
  }

  /**
   * Verificar si un usuario puede permitirse una cantidad
   */
  async canAfford(userId: string, amount: number, currency: string = 'EUR'): Promise<boolean> {
    const balance = await this.getBalance(userId);
    if (!balance) {
      return false;
    }

    const requestedAmount = new CreditAmount(amount, currency);
    return balance.canAfford(requestedAmount);
  }

  /**
   * Obtener historial de transacciones
   */
  async getTransactionHistory(userId: string, options?: {
    limit?: number;
    offset?: number;
    fromDate?: Date;
    toDate?: Date;
  }): Promise<CreditTransaction[]> {
    return await this.creditRepository.findTransactionsByUserId(
      new UserId(userId),
      options
    );
  }

  /**
   * Reembolsar créditos (alias para addCredits con razón REFUND)
   */
  async refundCredits(params: {
    userId: string;
    amount: number;
    currency?: string;
    referenceId?: string;
    metadata?: Record<string, any>;
    idempotencyKey?: string;
  }): Promise<CreditOperationResult> {
    return await this.addCredits({
      ...params,
      reason: 'REFUND'
    });
  }

  /**
   * Ajustar balance manualmente (para administradores)
   */
  async adjustBalance(params: {
    userId: string;
    amount: number;
    currency?: string;
    reason: 'ADMIN_ADJUSTMENT';
    referenceId?: string;
    metadata?: Record<string, any>;
    idempotencyKey?: string;
  }): Promise<CreditOperationResult> {
    if (params.amount > 0) {
      return await this.addCredits(params);
    } else if (params.amount < 0) {
      return await this.deductCredits({
        ...params,
        amount: Math.abs(params.amount)
      });
    } else {
      return {
        success: false,
        error: 'El monto no puede ser cero'
      };
    }
  }
}
