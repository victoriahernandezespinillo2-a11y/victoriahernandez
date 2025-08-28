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
        const existing = await tx.walletLedger.findUnique({ where: { idempotency_key: idempotencyKey } }).catch(() => null);
        if (existing) {
          return { balanceAfter: existing.balanceAfter as number };
        }
      }

      const user = await tx.user.findUnique({ where: { id: userId }, select: { creditsBalance: true } });
      if (!user) throw new Error('Usuario no encontrado');

      const updated = await tx.user.update({
        where: { id: userId },
        data: { creditsBalance: { increment: Math.floor(credits) } },
        select: { creditsBalance: true },
      });

      await tx.walletLedger.create({
        data: {
          userId,
          type: 'CREDIT',
          reason,
          credits: Math.floor(credits),
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
        const existing = await tx.walletLedger.findUnique({ where: { idempotency_key: idempotencyKey } }).catch(() => null);
        if (existing) {
          return { balanceAfter: existing.balanceAfter as number };
        }
      }

      const user = await tx.user.findUnique({ where: { id: userId }, select: { creditsBalance: true } });
      if (!user) throw new Error('Usuario no encontrado');

      const current = Number(user.creditsBalance || 0);
      const needed = Math.floor(credits);
      if (current < needed) {
        throw new Error('Saldo de créditos insuficiente');
      }

      const updated = await tx.user.update({
        where: { id: userId },
        data: { creditsBalance: { decrement: needed } },
        select: { creditsBalance: true },
      });

      await tx.walletLedger.create({
        data: {
          userId,
          type: 'DEBIT',
          reason,
          credits: needed,
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








