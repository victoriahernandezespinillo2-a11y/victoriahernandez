/**
 * API Routes para estadísticas de pagos
 * GET /api/payments/stats - Obtener estadísticas de pagos
 */

import { NextRequest } from 'next/server';
import { PaymentService } from '@/lib/services/payment.service';
import { withStaffMiddleware, ApiResponse } from '@/lib/middleware';
import { z } from 'zod';

const paymentService = new PaymentService();

/**
 * GET /api/payments/stats
 * Obtener estadísticas de pagos
 * Acceso: STAFF o superior
 */
export async function GET(request: NextRequest) {
  return withStaffMiddleware(async (req) => {
    try {
      const { searchParams } = req.nextUrl;
      const params = Object.fromEntries(searchParams.entries());
      
      const stats = await paymentService.getPaymentStats(params);
      
      return ApiResponse.success(stats);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return ApiResponse.validation(
          error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          }))
        );
      }
      
      console.error('Error obteniendo estadísticas de pagos:', error);
      return ApiResponse.internalError('Error interno del servidor');
    }
  })(request);
}

/**
 * OPTIONS /api/payments/stats
 * Manejar preflight requests
 */
export async function OPTIONS() {
  return ApiResponse.success(null);
}