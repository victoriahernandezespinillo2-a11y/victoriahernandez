import { NextRequest } from 'next/server';
import { z } from 'zod';
import { withAuthMiddleware, ApiResponse } from '@/lib/middleware';
import { PaymentService } from '../../../../lib/services/payment.service';
import { paymentService } from '@repo/payments';
import { db } from '@repo/db';

const paymentServiceLocal = new PaymentService();

const TopupSchema = z.object({
  credits: z.number().int().positive(),
  currency: z.string().optional().default('EUR'),
  description: z.string().optional().default('Recarga de créditos'),
  checkout: z.boolean().optional().default(true),
  paymentMethod: z.enum(['card','bizum']).optional().default('card'),
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
        // Usar Redsys para la recarga del monedero
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001';
        
        // Crear un ID único para la transacción de recarga
        const topupId = `TOPUP_${user.id}_${Date.now()}`;
        
        // Generar número de pedido para Redsys
        const orderNumber = paymentService.generateRedsysOrderNumber();
        const paymentMethodEnum = data.paymentMethod === 'bizum' ? 'CARD' : 'CARD';
        // Crear orden especial para la recarga del monedero (sin items)
        const order = await db.order.create({
          data: {
            id: topupId,
            userId: user.id,
            status: 'PENDING',
            totalEuro: amount,
            paymentMethod: paymentMethodEnum,
            creditsUsed: data.credits, // Guardamos los créditos aquí para referencia
            paymentIntentId: orderNumber, // Usamos este campo para almacenar el número de Redsys
            // No creamos items para las recargas - es un tipo especial de orden
          }
        });
        
        // Crear URL de redirección que generará el formulario de Redsys
        const redirectUrl = `${apiUrl}/api/payments/redsys/redirect?oid=${encodeURIComponent(order.id)}`;
        
        return ApiResponse.success({ 
          checkoutUrl: redirectUrl,
          topupId: topupId,
          orderNumber: orderNumber
        }, 201);
      }

      // Para pagos sin checkout, también usar Redsys
      const intent = await paymentServiceLocal.createPaymentIntent({
        amount,
        currency: data.currency,
        description: data.description,
        userId: user.id,
        paymentMethod: 'CARD',
        provider: 'REDSYS',
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


