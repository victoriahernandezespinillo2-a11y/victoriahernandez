import { NextRequest } from 'next/server';
import { withAdminMiddleware, ApiResponse } from '@/lib/middleware';
import { db } from '@repo/db';
import { z } from 'zod';
import { ledgerService } from '@/lib/services/ledger.service';

const Schema = z.object({
  amount: z.number().positive().optional(),
  reason: z.string().min(3),
});

export async function POST(request: NextRequest) {
  return withAdminMiddleware(async (req) => {
    try {
      const pathname = req.nextUrl.pathname;
      const id = pathname.split('/').slice(-2, -1)[0] as string;
      if (!id) return ApiResponse.badRequest('ID de membresía requerido');

      const body = await req.json().catch(() => ({}));
      const input = Schema.parse(body);

      const membership = await (db as any).membership.findUnique({ where: { id }, select: { id: true, priceEuro: true, status: true } });
      if (!membership) return ApiResponse.notFound('Membresía no encontrada');

      const amount = Number(input.amount || membership.priceEuro || 0);
      if (!(amount > 0)) return ApiResponse.badRequest('Monto de reembolso inválido');

      // Registrar reembolso en ledger (DEBIT)
      await ledgerService.recordRefund({
        sourceType: 'MEMBERSHIP',
        sourceId: membership.id,
        amountEuro: amount,
        currency: 'EUR',
        method: 'CARD',
        paidAt: new Date(),
        idempotencyKey: `REFUND:MEM:${membership.id}:${amount}`,
        metadata: { reason: input.reason },
      });

      // Si es total, marcar como REFUNDED (paymentStatus lógico)
      if (amount >= Number(membership.priceEuro || 0)) {
        try { await (db as any).membership.update({ where: { id: membership.id }, data: { paymentStatus: 'REFUNDED' as any } }); } catch {}
      }

      await (db as any).outboxEvent.create({ data: { eventType: 'MEMBERSHIP_REFUNDED', eventData: { membershipId: membership.id, amount, reason: input.reason } as any } });

      return ApiResponse.success({ success: true, membershipId: membership.id, amount });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return ApiResponse.validation(error.errors.map(er => ({ field: er.path.join('.'), message: er.message })));
      }
      console.error('Error reembolsando membresía:', error);
      return ApiResponse.internalError('No se pudo procesar el reembolso de la membresía');
    }
  })(request);
}

export async function OPTIONS() { return ApiResponse.success(null); }


