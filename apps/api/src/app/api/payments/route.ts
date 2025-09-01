/**
 * API Routes para gestiÃ³n de pagos
 * GET /api/payments - Obtener lista de pagos
 * POST /api/payments - Crear nueva intenciÃ³n de pago
 */

import { NextRequest } from 'next/server';
import { PaymentService, CreatePaymentSchema, GetPaymentsSchema } from '@/lib/services/payment.service';
import { withAuthMiddleware, withStaffMiddleware, ApiResponse } from '@/lib/middleware';
import { z } from 'zod';

const paymentService = new PaymentService();

/**
 * GET /api/payments
 * Obtener lista de pagos
 * Acceso: STAFF o superior (usuarios pueden ver solo sus pagos)
 */
export async function GET(request: NextRequest) {
  return withAuthMiddleware(async (req) => {
    try {
      const user = (req as any).user;
      const { searchParams } = req.nextUrl;
      const params = Object.fromEntries(searchParams.entries());
      
      // Si no es STAFF o ADMIN, solo puede ver sus propios pagos
      if (user.role === 'USER') {
        params.userId = user.id;
      }
      
      const result = await paymentService.getPayments(params as any);
      
      return ApiResponse.success(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return ApiResponse.validation(
          error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          }))
        );
      }
      
      console.error('Error obteniendo pagos:', error);
      return ApiResponse.internalError('Error interno del servidor');
    }
  })(request);
}

/**
 * POST /api/payments
 * Crear nueva intenciÃ³n de pago
 * Acceso: Usuario autenticado
 */
export async function POST(request: NextRequest) {
  return withAuthMiddleware(async (req) => {
    try {
      const user = (req as any).user;
      const body = await req.json();
      
      // Asegurar que el pago es para el usuario autenticado (excepto ADMIN)
      if (user.role !== 'ADMIN') {
        body.userId = user.id;
      }
      
      const paymentIntent = await paymentService.createPaymentIntent(body as any);
      
      return ApiResponse.success(paymentIntent);
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
          return ApiResponse.notFound(error.message);
        }
        if (error.message.includes('no disponible')) {
          return ApiResponse.badRequest(error.message);
        }
      }
      
      console.error('Error creando intenciÃ³n de pago:', error);
      return ApiResponse.internalError('Error interno del servidor');
    }
  })(request);
}

/**
 * OPTIONS /api/payments
 * Manejar preflight requests
 */
export async function OPTIONS() {
  return ApiResponse.success(null);
}
