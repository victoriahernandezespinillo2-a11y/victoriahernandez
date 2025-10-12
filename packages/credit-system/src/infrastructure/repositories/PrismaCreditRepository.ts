/**
 * Repository Implementation: PrismaCreditRepository
 * Implementación de CreditRepository usando Prisma
 */

import { CreditRepository, TransactionContext } from '../../domain/repositories/CreditRepository';
import { CreditBalance } from '../../domain/entities/CreditBalance';
import { CreditTransaction } from '../../domain/entities/CreditTransaction';
import { UserId } from '../../domain/value-objects/UserId';
import { TransactionId } from '../../domain/value-objects/TransactionId';
import { CreditAmount } from '../../domain/value-objects/CreditAmount';
import { PrismaClient } from '@prisma/client';
import { PrismaCreditRepositoryMethods } from './PrismaCreditRepositoryMethods';

export class PrismaCreditRepository extends PrismaCreditRepositoryMethods implements CreditRepository {
  constructor(private prisma: PrismaClient) {
    super();
  }

  /**
   * Ejecutar operaciones en una transacción
   */
  override async transaction<T>(operation: (tx: TransactionContext) => Promise<T>): Promise<T> {
    return await this.prisma.$transaction(async (prismaTx) => {
      const context = new PrismaTransactionContext(prismaTx);
      return await operation(context);
    });
  }

  /**
   * Verificar si un usuario existe
   */
  async userExists(userId: UserId): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId.value },
      select: { id: true }
    });
    return user !== null;
  }

  /**
   * Obtener balance de un usuario
   */
  override async findBalanceByUserId(userId: UserId): Promise<CreditBalance | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId.value },
      select: {
        id: true,
        creditsBalance: true
      }
    });

    if (!user) {
      return null;
    }

    return new CreditBalance({
      userId,
      amount: new CreditAmount(Number(user.creditsBalance), 'EUR'),
      version: 1 // TODO: Implementar versioning
    });
  }

  /**
   * Guardar balance
   */
  override async saveBalance(balance: CreditBalance): Promise<void> {
    await this.prisma.user.update({
      where: { id: balance.userId.value },
      data: {
        creditsBalance: balance.amount.value
      }
    });
  }

  /**
   * Obtener transacción por ID
   */
  async findTransactionById(id: TransactionId): Promise<CreditTransaction | null> {
    const transaction = await this.prisma.walletLedger.findUnique({
      where: { id: id.value }
    });

    if (!transaction) {
      return null;
    }

    return CreditTransaction.fromPersistence({
      id: transaction.id,
      userId: transaction.userId,
      type: transaction.type,
      amount: Number(transaction.credits),
      currency: 'EUR',
      reason: transaction.reason,
      balanceBefore: Number(transaction.balanceAfter) - Number(transaction.credits),
      balanceAfter: Number(transaction.balanceAfter),
      referenceId: (transaction.metadata as any)?.referenceId,
      metadata: (transaction.metadata as Record<string, any>) || {},
      idempotencyKey: transaction.idempotencyKey || undefined,
      createdAt: transaction.createdAt
    });
  }

  /**
   * Obtener transacción por clave de idempotencia
   */
  override async findTransactionByIdempotencyKey(key: string): Promise<CreditTransaction | null> {
    const transaction = await this.prisma.walletLedger.findUnique({
      where: { idempotencyKey: key }
    });

    if (!transaction) {
      return null;
    }

    return CreditTransaction.fromPersistence({
      id: transaction.id,
      userId: transaction.userId,
      type: transaction.type,
      amount: Number(transaction.credits),
      currency: 'EUR',
      reason: transaction.reason,
      balanceBefore: Number(transaction.balanceAfter) - Number(transaction.credits),
      balanceAfter: Number(transaction.balanceAfter),
      referenceId: (transaction.metadata as any)?.referenceId,
      metadata: (transaction.metadata as Record<string, any>) || {},
      idempotencyKey: transaction.idempotencyKey || undefined,
      createdAt: transaction.createdAt
    });
  }

  /**
   * Guardar transacción
   */
  async saveTransaction(transaction: CreditTransaction): Promise<void> {
    const data = transaction.toPersistence();
    
    await this.prisma.walletLedger.create({
      data: {
        id: data.id,
        userId: data.userId,
        type: data.type as any,
        reason: data.reason as any,
        credits: data.amount,
        balanceAfter: data.balanceAfter,
        metadata: data.metadata || {},
        idempotencyKey: data.idempotencyKey || null,
        createdAt: data.createdAt
      }
    });
  }

  /**
   * Obtener transacciones de un usuario
   */
  async findTransactionsByUserId(
    userId: UserId,
    options: {
      limit?: number;
      offset?: number;
      fromDate?: Date;
      toDate?: Date;
    } = {}
  ): Promise<CreditTransaction[]> {
    const { limit = 50, offset = 0, fromDate, toDate } = options;

    const transactions = await this.prisma.walletLedger.findMany({
      where: {
        userId: userId.value,
        ...(fromDate && { createdAt: { gte: fromDate } }),
        ...(toDate && { createdAt: { lte: toDate } })
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset
    });

    return transactions.map(tx => CreditTransaction.fromPersistence({
      id: tx.id,
      userId: tx.userId,
      type: tx.type,
      amount: Number(tx.credits),
      currency: 'EUR',
      reason: tx.reason,
      balanceBefore: Number(tx.balanceAfter) - Number(tx.credits),
      balanceAfter: Number(tx.balanceAfter),
      referenceId: (tx.metadata as any)?.referenceId,
      metadata: (tx.metadata as Record<string, any>) || {},
      idempotencyKey: tx.idempotencyKey || undefined,
      createdAt: tx.createdAt
    }));
  }

  /**
   * Obtener historial de transacciones
   */
  async findTransactionHistory(options: {
    userId?: UserId;
    limit?: number;
    offset?: number;
    fromDate?: Date;
    toDate?: Date;
    type?: string;
    reason?: string;
  } = {}): Promise<CreditTransaction[]> {
    const {
      userId,
      limit = 100,
      offset = 0,
      fromDate,
      toDate,
      type,
      reason
    } = options;

    const transactions = await this.prisma.walletLedger.findMany({
      where: {
        ...(userId && { userId: userId.value }),
        ...(fromDate && { createdAt: { gte: fromDate } }),
        ...(toDate && { createdAt: { lte: toDate } }),
        ...(type && { type: type as any }),
        ...(reason && { reason: reason as any })
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset
    });

    return transactions.map(tx => CreditTransaction.fromPersistence({
      id: tx.id,
      userId: tx.userId,
      type: tx.type,
      amount: Number(tx.credits),
      currency: 'EUR',
      reason: tx.reason,
      balanceBefore: Number(tx.balanceAfter) - Number(tx.credits),
      balanceAfter: Number(tx.balanceAfter),
      referenceId: (tx.metadata as any)?.referenceId,
      metadata: (tx.metadata as Record<string, any>) || {},
      idempotencyKey: tx.idempotencyKey || undefined,
      createdAt: tx.createdAt
    }));
  }
}

/**
 * Contexto de transacción para Prisma
 */
class PrismaTransactionContext implements TransactionContext {
  constructor(private prismaTx: any) {}

  async findBalanceByUserId(userId: UserId): Promise<CreditBalance | null> {
    const user = await this.prismaTx.user.findUnique({
      where: { id: userId.value },
      select: {
        id: true,
        creditsBalance: true
      }
    });

    if (!user) {
      return null;
    }

    return new CreditBalance({
      userId,
      amount: new CreditAmount(Number(user.creditsBalance), 'EUR'),
      version: 1 // TODO: Implementar versioning
    });
  }

  async findTransactionByIdempotencyKey(key: string): Promise<CreditTransaction | null> {
    const transaction = await this.prismaTx.walletLedger.findUnique({
      where: { idempotencyKey: key }
    });

    if (!transaction) {
      return null;
    }

    return CreditTransaction.fromPersistence({
      id: transaction.id,
      userId: transaction.userId,
      type: transaction.type,
      amount: Number(transaction.credits),
      currency: 'EUR',
      reason: transaction.reason,
      balanceBefore: Number(transaction.balanceAfter) - Number(transaction.credits),
      balanceAfter: Number(transaction.balanceAfter),
      referenceId: (transaction.metadata as any)?.referenceId,
      metadata: (transaction.metadata as Record<string, any>) || {},
      idempotencyKey: transaction.idempotencyKey || undefined,
      createdAt: transaction.createdAt
    });
  }

  async saveBalance(balance: CreditBalance): Promise<void> {
    await this.prismaTx.user.update({
      where: { id: balance.userId.value },
      data: {
        creditsBalance: balance.amount.value
      }
    });
  }

  async saveTransaction(transaction: CreditTransaction): Promise<void> {
    const data = transaction.toPersistence();
    
    await this.prismaTx.walletLedger.create({
      data: {
        id: data.id,
        userId: data.userId,
        type: data.type as any,
        reason: data.reason as any,
        credits: data.amount,
        balanceAfter: data.balanceAfter,
        metadata: data.metadata || {},
        idempotencyKey: data.idempotencyKey || null,
        createdAt: data.createdAt
      }
    });
  }

  async findTransactionsByUserId(userId: UserId, limit?: number): Promise<CreditTransaction[]> {
    const transactions = await this.prismaTx.walletLedger.findMany({
      where: { userId: userId.value },
      orderBy: { createdAt: 'desc' },
      take: limit || 50
    });

    return transactions.map((tx: any) => CreditTransaction.fromPersistence({
      id: tx.id,
      userId: tx.userId,
      type: tx.type,
      amount: Number(tx.credits),
      currency: 'EUR',
      reason: tx.reason,
      balanceBefore: Number(tx.balanceAfter) - Number(tx.credits),
      balanceAfter: Number(tx.balanceAfter),
      referenceId: (tx.metadata as any)?.referenceId,
      metadata: (tx.metadata as Record<string, any>) || {},
      idempotencyKey: tx.idempotencyKey || undefined,
      createdAt: tx.createdAt
    }));
  }
}
