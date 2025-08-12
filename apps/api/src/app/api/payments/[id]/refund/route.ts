/**
 * API Routes para reembolsos de pagos
 * POST /api/payments/[id]/refund - Procesar reembolso
 */

import { NextRequest } from 'next/server';
import { PaymentService, RefundPaymentSchema } from '@/lib/services/payment.service';
import { withAuthMiddleware, withStaffMiddleware, ApiResponse } from '@/lib/middleware';
import { z } from 'zod';

const paymentService = new PaymentService();

/**
 * POST /api/payments/[id]/refund
 * Procesar reembolso de pago
 * Acceso: STAFF o superior
 */
export async function POST(
  request: NextRequest
) {
  return withStaffMiddleware(async (req, context: any) => {
    try {
      const user = (context as any)?.user;
      const pathname = req.nextUrl.pathname;
      const id = pathname.split('/').slice(-2, -1)[0] as string;
      const body = await req.json();
      
      if (!id) {
        return ApiResponse.badRequest('ID de pago requerido');
      }
      
      // Verificar que el pago existe
      const payment = await paymentService.getPaymentStatus(id);
      
      if (payment.status !== 'COMPLETED') {
        return ApiResponse.badRequest('Solo se pueden reembolsar pagos completados');
      }
      
      // Preparar datos del reembolso
      const refundData = {
        ...body,
        paymentId: id,
        processedBy: user.id
      };
      
      const result = await paymentService.refundPayment(refundData);
      
      return ApiResponse.success(result, 
        result.success ? 'Reembolso procesado exitosamente' : 'Error procesando el reembolso'
      );
    } catch (error) {
      if (error instanceof z.ZodError) {
        return ApiResponse.validation(
          error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          }))
        );
      }
      
      if (error instanceof Error) {
        if (error.message.includes('no encontrado')) {
          return ApiResponse.notFound('Pago no encontrado');
        }
        if (error.message.includes('reembolsado')) {
          return ApiResponse.badRequest(error.message);
        }
        if (error.message.includes('monto')) {
          return ApiResponse.badRequest(error.message);
        }
      }
      
      console.error('Error procesando reembolso:', error);
      return ApiResponse.internalError('Error interno del servidor');
    }
  })(request);
}

/**
 * OPTIONS /api/payments/[id]/refund
 * Manejar preflight requests
 */
export async function OPTIONS() {
  return ApiResponse.success(null);
}