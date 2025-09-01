import { NextRequest } from 'next/server';
import { z } from 'zod';
import { withAuthMiddleware, ApiResponse } from '@/lib/middleware';
import { orderService } from '../../../../lib/services/order.service';

const CheckoutSchema = z.object({
  items: z.array(z.object({ productId: z.string().min(1), qty: z.number().int().positive() })).min(1),
  paymentMethod: z.enum(['credits', 'card']),
});

export async function POST(request: NextRequest) {
  return withAuthMiddleware(async (req) => {
    try {
      const user = (req as any).user;
      const body = await req.json();
      const data = CheckoutSchema.parse(body);
      const idem = req.headers.get('Idempotency-Key') || undefined;

      const result = await orderService.checkout({
        userId: user.id,
        items: data.items,
        paymentMethod: data.paymentMethod,
        idempotencyKey: idem,
      });

      return ApiResponse.success(result, 201);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return ApiResponse.validation(error.errors.map(err => ({ field: err.path.join('.'), message: err.message })));
      }
      if (error instanceof Error) {
        const msg = (error.message || '').toLowerCase();
        if (msg.includes('stock') || msg.includes('saldo')) {
          return ApiResponse.conflict(error.message);
        }
      }
      console.error('Error en checkout:', error);
      return ApiResponse.internalError('Error en checkout');
    }
  })(request);
}

export async function OPTIONS() {
  return ApiResponse.success(null);
}








