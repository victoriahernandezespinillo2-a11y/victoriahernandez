import { NextRequest } from 'next/server';
import { z } from 'zod';
import { withStaffMiddleware, ApiResponse } from '@/lib/middleware';
import { db } from '@repo/db';

const AdjustSchema = z.object({
  userId: z.string().min(1),
  type: z.enum(['CREDIT','DEBIT']),
  credits: z.number().int().positive(),
  reason: z.string().min(3),
  idempotencyKey: z.string().optional(),
});

export async function POST(request: NextRequest) {
  return withStaffMiddleware(async (req) => {
    try {
      const body = await req.json();
      const data = AdjustSchema.parse(body);
      const result = await (db as any).$transaction(async (tx: any) => {
        if (data.idempotencyKey) {
          const existing = await tx.walletLedger.findUnique({ where: { idempotency_key: data.idempotencyKey } }).catch(() => null);
          if (existing) return existing;
        }
        const user = await tx.user.findUnique({ where: { id: data.userId }, select: { creditsBalance: true } });
        if (!user) throw new Error('Usuario no encontrado');
        if (data.type === 'DEBIT' && (user.creditsBalance || 0) < data.credits) throw new Error('Saldo insuficiente');
        const updated = await tx.user.update({ where: { id: data.userId }, data: { creditsBalance: { [data.type === 'CREDIT' ? 'increment' : 'decrement']: data.credits } }, select: { creditsBalance: true } });
        const wl = await tx.walletLedger.create({ data: { userId: data.userId, type: data.type, reason: 'ADJUST', credits: data.credits, balanceAfter: updated.creditsBalance, metadata: { reason: data.reason }, idempotencyKey: data.idempotencyKey || null } });
        return wl;
      });
      return ApiResponse.success({ success: true, ledger: result }, 201);
    } catch (error) {
      if (error instanceof z.ZodError) return ApiResponse.validation(error.errors.map(e => ({ field: e.path.join('.'), message: e.message })));
      return ApiResponse.internalError('Error ajustando créditos');
    }
  })(request);
}

export async function OPTIONS() { return ApiResponse.success(null); }








