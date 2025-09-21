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
      if (!id) return ApiResponse.badRequest('ID de orden requerido');

      const body = await req.json().catch(() => ({}));
      const input = Schema.parse(body);

      const order = await (db as any).order.findUnique({ where: { id }, select: { id: true, totalEuro: true } });
      if (!order) return ApiResponse.notFound('Orden no encontrada');

      const amount = Number(input.amount || order.totalEuro || 0);
      if (!(amount > 0)) return ApiResponse.badRequest('Monto de reembolso inválido');

      // Registrar reembolso en ledger (DEBIT)
      await ledgerService.recordRefund({
        sourceType: 'ORDER',
        sourceId: order.id,
        amountEuro: amount,
        currency: 'EUR',
        method: 'CARD',
        paidAt: new Date(),
        idempotencyKey: `REFUND:ORD:${order.id}:${amount}`,
        metadata: { reason: input.reason },
      });

      // Mantener paymentStatus si parcial; si total, marcar REFUNDED
      if (amount >= Number(order.totalEuro || 0)) {
        await (db as any).order.update({ where: { id: order.id }, data: { paymentStatus: 'REFUNDED' as any } });
      }

      await (db as any).outboxEvent.create({ data: { eventType: 'ORDER_REFUNDED', eventData: { orderId: order.id, amount, reason: input.reason } as any } });

      return ApiResponse.success({ success: true, orderId: order.id, amount });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return ApiResponse.validation(error.errors.map(er => ({ field: er.path.join('.'), message: er.message })));
      }
      console.error('Error reembolsando orden:', error);
      return ApiResponse.internalError('No se pudo procesar el reembolso de la orden');
    }
  })(request);
}

export async function OPTIONS() { 
  return ApiResponse.success(null); 
}