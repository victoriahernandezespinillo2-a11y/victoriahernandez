import { NextRequest } from 'next/server';
import { z } from 'zod';
import { withStaffMiddleware, ApiResponse } from '@/lib/middleware';
import { db } from '@repo/db';

const RefundSchema = z.object({
  reason: z.string().min(3),
});

export async function POST(request: NextRequest) {
  return withStaffMiddleware(async (req) => {
    try {
      const id = req.nextUrl.pathname.split('/').slice(-2, -1)[0] as string;
      const body = await req.json();
      const { reason } = RefundSchema.parse(body);

      await (db as any).$transaction(async (tx: any) => {
        const order = await tx.order.findUnique({ where: { id }, include: { items: true } });
        if (!order) throw new Error('Pedido no encontrado');
        if (order.status === 'REFUNDED') return;

        // Reponer stock
        for (const it of (order.items || [])) {
          await tx.product.update({ where: { id: it.productId }, data: { stockQty: { increment: it.qty } } });
          await tx.inventoryMovement.create({ data: { productId: it.productId, type: 'IN', qty: it.qty, reason: `REFUND ${order.id}` } });
        }

        // Si fue pagado con créditos, reabonar
        if (order.paymentMethod === 'CREDITS' && order.creditsUsed > 0) {
          const user = await tx.user.findUnique({ where: { id: order.userId }, select: { creditsBalance: true } });
          await tx.user.update({ where: { id: order.userId }, data: { creditsBalance: { increment: order.creditsUsed } } });
          await tx.walletLedger.create({ data: { userId: order.userId, type: 'CREDIT', reason: 'REFUND', credits: order.creditsUsed, balanceAfter: (user.creditsBalance || 0) + order.creditsUsed, metadata: { orderId: order.id, reason } } });
        }

        await tx.order.update({ where: { id }, data: { status: 'REFUNDED' } });
        await tx.outboxEvent.create({ data: { eventType: 'ORDER_REFUNDED', eventData: { orderId: id, reason } as any } });
      });

      return ApiResponse.success({ success: true });
    } catch (error) {
      if (error instanceof z.ZodError) return ApiResponse.validation(error.errors.map(e => ({ field: e.path.join('.'), message: e.message })));
      return ApiResponse.internalError('Error procesando reembolso');
    }
  })(request);
}

export async function OPTIONS() { return ApiResponse.success(null); }








