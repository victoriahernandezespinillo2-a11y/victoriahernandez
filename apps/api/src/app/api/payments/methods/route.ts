import { NextRequest } from 'next/server';
import { z } from 'zod';
import { withAuthMiddleware, ApiResponse } from '@/lib/middleware';
import { PaymentService } from '../../../../lib/services/payment.service';

const paymentService = new PaymentService();

const AddMethodSchema = z.object({
  brand: z.string().min(1),
  last4: z.string().length(4),
  expMonth: z.coerce.number().min(1).max(12),
  expYear: z.coerce.number().min(2024).max(2100),
  holderName: z.string().optional(),
  setDefault: z.coerce.boolean().optional(),
});

export async function GET(req: NextRequest) {
  return withAuthMiddleware(async (_req, ctx: any) => {
    const user = (ctx as any).user;
    const methods = await paymentService.listPaymentMethods(user.id);
    return ApiResponse.success({ methods });
  })(req);
}

export async function POST(req: NextRequest) {
  return withAuthMiddleware(async (request: NextRequest, ctx: any) => {
    try {
      const user = (ctx as any).user;
      const body = await request.json();
      const data = AddMethodSchema.parse(body);
      const created = await paymentService.addPaymentMethod(user.id, data);
      return ApiResponse.success(created);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return ApiResponse.validation(
          error.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
        );
      }
      return ApiResponse.internalError('No se pudo agregar el método de pago');
    }
  })(req);
}

export async function DELETE(req: NextRequest) {
  return withAuthMiddleware(async (request: NextRequest, ctx: any) => {
    try {
      const user = (ctx as any).user;
      const id = request.nextUrl.searchParams.get('id') || '';
      if (!id) return ApiResponse.badRequest('id requerido');
      await paymentService.deletePaymentMethod(user.id, id);
      return ApiResponse.success({ ok: true });
    } catch {
      return ApiResponse.internalError('No se pudo eliminar el método');
    }
  })(req);
}


