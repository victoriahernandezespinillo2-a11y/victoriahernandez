import { db } from '@repo/db';

type PrismaClientLike = typeof db;

export type WalletLedgerReason = 'ORDER' | 'TOPUP' | 'REFUND' | 'ADJUST';
export type WalletLedgerType = 'CREDIT' | 'DEBIT';

export interface WalletMovementInput {
  userId: string;
  credits: number;
  reason: WalletLedgerReason;
  metadata?: Record<string, unknown>;
  idempotencyKey?: string; // evitar movimientos duplicados
}

export class WalletService {
  /**
   * Acreditar créditos al usuario (transaccional e idempotente)
   */
  async credit(input: WalletMovementInput): Promise<{ balanceAfter: number }>
  {
    const { userId, credits, reason, metadata, idempotencyKey } = input;
    if (!userId) throw new Error('userId requerido');
    if (!Number.isFinite(credits) || credits <= 0) throw new Error('credits debe ser > 0');
    if (!reason) throw new Error('reason requerido');

    const result = await (db as any).$transaction(async (tx: any) => {
      // Idempotencia: si existe un registro con la misma llave, devolver balanceAfter
      if (idempotencyKey) {
        const existing = await tx.walletLedger.findUnique({ where: { idempotencyKey } }).catch(() => null);
        if (existing) {
          return { balanceAfter: existing.balanceAfter as number };
        }
      }

      const user = await tx.user.findUnique({ where: { id: userId }, select: { creditsBalance: true } });
      if (!user) throw new Error('Usuario no encontrado');

      const updated = await tx.user.update({
        where: { id: userId },
        data: { creditsBalance: { increment: credits } },
        select: { creditsBalance: true },
      });

      await tx.walletLedger.create({
        data: {
          userId,
          type: 'CREDIT',
          reason,
          credits: credits,
          balanceAfter: updated.creditsBalance,
          metadata: metadata || {},
          idempotencyKey: idempotencyKey || null,
        }
      });

      return { balanceAfter: updated.creditsBalance as number };
    });

    return result;
  }

  /**
   * Debitar créditos del usuario (transaccional e idempotente)
   */
  async debit(input: WalletMovementInput): Promise<{ balanceAfter: number }>
  {
    const { userId, credits, reason, metadata, idempotencyKey } = input;
    if (!userId) throw new Error('userId requerido');
    if (!Number.isFinite(credits) || credits <= 0) throw new Error('credits debe ser > 0');
    if (!reason) throw new Error('reason requerido');

    const result = await (db as any).$transaction(async (tx: any) => {
      // Idempotencia
      if (idempotencyKey) {
        const existing = await tx.walletLedger.findUnique({ where: { idempotencyKey } }).catch(() => null);
        if (existing) {
          return { balanceAfter: existing.balanceAfter as number };
        }
      }

      const user = await tx.user.findUnique({ where: { id: userId }, select: { creditsBalance: true } });
      if (!user) throw new Error('Usuario no encontrado');

      const current = Number(user.creditsBalance || 0);
      if (current < credits) {
        throw new Error('Saldo de créditos insuficiente');
      }

      const updated = await tx.user.update({
        where: { id: userId },
        data: { creditsBalance: { decrement: credits } },
        select: { creditsBalance: true },
      });

      await tx.walletLedger.create({
        data: {
          userId,
          type: 'DEBIT',
          reason,
          credits: credits,
          balanceAfter: updated.creditsBalance,
          metadata: metadata || {},
          idempotencyKey: idempotencyKey || null,
        }
      });

      return { balanceAfter: updated.creditsBalance as number };
    });

    return result;
  }

  /**
   * Reembolsar créditos al usuario (transaccional e idempotente)
   */
  async refundCredits(input: WalletMovementInput): Promise<{ balanceAfter: number }> {
    const { userId, credits, reason, metadata, idempotencyKey } = input;
    
    console.log('🔄 [WALLET-SERVICE] refundCredits recibido:', {
      userId,
      credits,
      creditsType: typeof credits,
      creditsIsFinite: Number.isFinite(credits),
      creditsIsNull: credits === null,
      creditsIsUndefined: credits === undefined,
      reason,
      idempotencyKey
    });
    
    if (!userId) throw new Error('userId requerido');
    if (!Number.isFinite(credits) || credits <= 0) {
      console.error('❌ [WALLET-SERVICE] Error de validación de créditos:', {
        credits,
        creditsType: typeof credits,
        isFinite: Number.isFinite(credits),
        isGreaterThanZero: credits > 0
      });
      throw new Error('credits debe ser > 0');
    }
    if (!reason) throw new Error('reason requerido');

    const result = await (db as any).$transaction(async (tx: any) => {
      // Idempotencia: si existe un registro con la misma llave, devolver balanceAfter
      if (idempotencyKey) {
        const existing = await tx.walletLedger.findUnique({ where: { idempotencyKey } }).catch(() => null);
        if (existing) {
          return { balanceAfter: existing.balanceAfter as number };
        }
      }

      const user = await tx.user.findUnique({ where: { id: userId }, select: { creditsBalance: true } });
      if (!user) throw new Error('Usuario no encontrado');

      const updated = await tx.user.update({
        where: { id: userId },
        data: { creditsBalance: { increment: credits } },
        select: { creditsBalance: true },
      });

      await tx.walletLedger.create({
        data: {
          userId,
          type: 'CREDIT',
          reason: 'REFUND',
          credits: credits,
          balanceAfter: updated.creditsBalance,
          metadata: metadata || {},
          idempotencyKey: idempotencyKey || null,
        }
      });

      return { balanceAfter: updated.creditsBalance as number };
    });

    return result;
  }
}

export const walletService = new WalletService();








