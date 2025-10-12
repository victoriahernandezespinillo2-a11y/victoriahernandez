/**
 * Integration Service: CreditSystemService
 * Integración del sistema de créditos enterprise con el sistema existente
 */

import { PrismaClient } from '@prisma/client';
import {
  CreditManagementService,
  PrismaCreditRepository,
  UserId,
  CreditAmount
} from '@repo/credit-system';

export class CreditSystemService {
  private creditManagementService: CreditManagementService;

  constructor(private prisma: PrismaClient) {
    const creditRepository = new PrismaCreditRepository(prisma);
    this.creditManagementService = new CreditManagementService(
      creditRepository
    );
  }

  /**
   * Agregar créditos (compatible con WalletService existente)
   */
  async addCredits(params: {
    userId: string;
    credits: number;
    reason: string;
    metadata?: Record<string, any>;
    idempotencyKey?: string;
  }): Promise<{ balanceAfter: number }> {
    const result = await this.creditManagementService.addCredits({
      userId: params.userId,
      amount: params.credits,
      currency: 'EUR',
      reason: params.reason,
      metadata: params.metadata,
      idempotencyKey: params.idempotencyKey
    });

    if (!result.success) {
      throw new Error(result.error || 'Error al agregar créditos');
    }

    return {
      balanceAfter: result.balance?.amount.value || 0
    };
  }

  /**
   * Deducir créditos (compatible con WalletService existente)
   */
  async deductCredits(params: {
    userId: string;
    credits: number;
    reason: string;
    metadata?: Record<string, any>;
    idempotencyKey?: string;
  }): Promise<{ balanceAfter: number }> {
    const result = await this.creditManagementService.deductCredits({
      userId: params.userId,
      amount: params.credits,
      currency: 'EUR',
      reason: params.reason,
      metadata: params.metadata,
      idempotencyKey: params.idempotencyKey
    });

    if (!result.success) {
      throw new Error(result.error || 'Error al deducir créditos');
    }

    return {
      balanceAfter: result.balance?.amount.value || 0
    };
  }

  /**
   * Reembolsar créditos (compatible con WalletService existente)
   */
  async refundCredits(params: {
    userId: string;
    credits: number;
    reason: string;
    metadata?: Record<string, any>;
    idempotencyKey?: string;
  }): Promise<{ balanceAfter: number }> {
    const result = await this.creditManagementService.refundCredits({
      userId: params.userId,
      amount: params.credits,
      currency: 'EUR',
      referenceId: params.metadata?.orderId || params.metadata?.reservationId,
      metadata: params.metadata,
      idempotencyKey: params.idempotencyKey
    });

    if (!result.success) {
      throw new Error(result.error || 'Error al reembolsar créditos');
    }

    return {
      balanceAfter: result.balance?.amount.value || 0
    };
  }

  /**
   * Obtener balance de usuario
   */
  async getBalance(userId: string): Promise<number> {
    const balance = await this.creditManagementService.getBalance(userId);
    return balance?.amount.value || 0;
  }

  /**
   * Verificar si el usuario puede permitirse una cantidad
   */
  async canAfford(userId: string, amount: number): Promise<boolean> {
    return await this.creditManagementService.canAfford(userId, amount, 'EUR');
  }

  /**
   * Obtener historial de transacciones
   */
  async getTransactionHistory(userId: string, options?: {
    limit?: number;
    offset?: number;
    fromDate?: Date;
    toDate?: Date;
  }) {
    return await this.creditManagementService.getTransactionHistory(userId, options);
  }

  /**
   * Ajustar balance manualmente (para administradores)
   */
  async adjustBalance(params: {
    userId: string;
    amount: number;
    reason: 'ADMIN_ADJUSTMENT';
    referenceId?: string;
    metadata?: Record<string, any>;
    idempotencyKey?: string;
  }): Promise<{ balanceAfter: number }> {
    const result = await this.creditManagementService.adjustBalance({
      userId: params.userId,
      amount: params.amount,
      currency: 'EUR',
      reason: params.reason,
      referenceId: params.referenceId,
      metadata: params.metadata,
      idempotencyKey: params.idempotencyKey
    });

    if (!result.success) {
      throw new Error(result.error || 'Error al ajustar balance');
    }

    return {
      balanceAfter: result.balance?.amount.value || 0
    };
  }

  /**
   * Obtener el servicio de gestión de créditos completo
   */
  getCreditManagementService(): CreditManagementService {
    return this.creditManagementService;
  }
}

// Singleton instance
let creditSystemServiceInstance: CreditSystemService | null = null;

export function getCreditSystemService(prisma?: PrismaClient): CreditSystemService {
  if (!creditSystemServiceInstance && prisma) {
    creditSystemServiceInstance = new CreditSystemService(prisma);
  }
  
  if (!creditSystemServiceInstance) {
    throw new Error('CreditSystemService no inicializado. Proporciona una instancia de Prisma.');
  }
  
  return creditSystemServiceInstance;
}
