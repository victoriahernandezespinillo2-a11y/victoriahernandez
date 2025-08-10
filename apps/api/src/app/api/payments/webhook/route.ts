/**
 * API Routes para webhooks de Stripe
 * POST /api/payments/webhook - Manejar eventos de Stripe
 */

import { NextRequest } from 'next/server';
import { PaymentService } from '@/lib/services/payment.service';
import { ApiResponse } from '@/lib/middleware';
import { headers } from 'next/headers';

const paymentService = new PaymentService();

// Forzar runtime Node.js (no Edge) para poder leer body crudo y validar firmas
export const runtime = 'nodejs';

/**
 * POST /api/payments/webhook
 * Manejar webhooks de Stripe
 * Acceso: Público (pero verificado por Stripe signature)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const headersList = headers();
    const signature = headersList.get('stripe-signature');
    
    if (!signature) {
      return ApiResponse.badRequest('Signature de Stripe requerida');
    }
    
    if (!body) {
      return ApiResponse.badRequest('Cuerpo de la petición requerido');
    }
    
    // Procesar el webhook con el servicio (arroja si la firma no es válida)
    await paymentService.handleStripeWebhook(body, signature);
    return ApiResponse.success({ received: true });
  } catch (error) {
    if (error instanceof Error) {
      // Errores específicos de Stripe
      if (error.message.includes('signature')) {
        return ApiResponse.unauthorized('Signature de Stripe inválida');
      }
      if (error.message.includes('timestamp')) {
        return ApiResponse.badRequest('Timestamp del webhook inválido');
      }
    }
    
    console.error('Error en webhook de pagos:', error);
    return ApiResponse.internalError('Error interno del servidor');
  }
}

/**
 * OPTIONS /api/payments/webhook
 * Manejar preflight requests
 */
export async function OPTIONS() {
  return ApiResponse.success(null);
}