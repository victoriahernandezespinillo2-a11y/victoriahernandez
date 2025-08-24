import { NextRequest } from 'next/server';
import { z } from 'zod';
import { withAuthMiddleware, ApiResponse } from '@/lib/middleware';
import { PaymentService } from '../../../../lib/services/payment.service';
import { stripeService } from '@repo/payments';

const paymentService = new PaymentService();

const TopupSchema = z.object({
  credits: z.number().int().positive(),
  currency: z.string().optional().default('EUR'),
  description: z.string().optional().default('Recarga de créditos'),
  checkout: z.boolean().optional().default(true),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});

export async function POST(request: NextRequest) {
  return withAuthMiddleware(async (req, context: any) => {
    try {
      const user = (context as any)?.user;
      const body = await req.json();
      const data = TopupSchema.parse(body);

      // Obtener euroPerCredit desde cualquier centro asociado a las reservas (fallback a 1)
      // Para Fase 1: simple -> 1 crédito = 1 EUR si no hay config
      const euroPerCredit = 1; // Fase 1: simple -> 1 crédito = 1 EUR (puede leerse de center.settings.credits en futuras mejoras)
      const amount = Math.ceil(data.credits * euroPerCredit);

      if (data.checkout) {
        const successUrl = data.successUrl || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'}/dashboard/wallet?topup=success`;
        const cancelUrl = data.cancelUrl || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'}/dashboard/wallet?topup=cancel`;
        const session = await stripeService.createCheckoutSession({
          amount,
          currency: 'eur',
          successUrl,
          cancelUrl,
          metadata: { type: 'wallet_topup', userId: user.id, credits: String(data.credits) },
          description: `Recarga de créditos (${data.credits})`,
        });
        return ApiResponse.success({ checkoutUrl: session.url }, 201);
      }

      const intent = await paymentService.createPaymentIntent({
        amount,
        currency: data.currency,
        description: data.description,
        userId: user.id,
        paymentMethod: 'CARD',
        provider: 'STRIPE',
        metadata: {
          type: 'wallet_topup',
          credits: String(data.credits),
          userId: user.id,
        },
      } as any);

      return ApiResponse.success({ paymentIntent: intent }, 201);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return ApiResponse.validation(error.errors.map(err => ({ field: err.path.join('.'), message: err.message })));
      }
      console.error('Error creando topup:', error);
      return ApiResponse.internalError('Error creando recarga');
    }
  })(request);
}

export async function OPTIONS() {
  return ApiResponse.success(null);
}


