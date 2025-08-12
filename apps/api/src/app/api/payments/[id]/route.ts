/**
 * API Routes para pago específico
 * GET /api/payments/[id] - Obtener pago por ID
 * POST /api/payments/[id] - Procesar pago
 */

import { NextRequest } from 'next/server';
import { PaymentService, ProcessPaymentSchema } from '@/lib/services/payment.service';
import { withAuthMiddleware, ApiResponse } from '@/lib/middleware';
import { z } from 'zod';

const paymentService = new PaymentService();

/**
 * GET /api/payments/[id]
 * Obtener estado de pago por ID
 * Acceso: Usuario autenticado (propietario del pago o STAFF+)
 */
export async function GET(
  request: NextRequest
) {
  return withAuthMiddleware(async (req, { user }) => {
    try {
      const pathname = req.nextUrl.pathname;
      const id = pathname.split('/').pop() as string;
      
      if (!id) {
        return ApiResponse.badRequest('ID de pago requerido');
      }
      
      const payment = await paymentService.getPaymentStatus(id);
      
      // Verificar permisos: solo el propietario o STAFF+ pueden ver el pago
      if (user.role === 'USER' && payment.userId !== user.id) {
        return ApiResponse.forbidden('No tienes permisos para ver este pago');
      }
      
      return ApiResponse.success(payment);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('no encontrado')) {
          return ApiResponse.notFound('Pago no encontrado');
        }
      }
      
      console.error('Error obteniendo pago:', error);
      return ApiResponse.internalError('Error interno del servidor');
    }
  })(request);
}

/**
 * POST /api/payments/[id]
 * Procesar pago (confirmar Payment Intent)
 * Acceso: Usuario autenticado (propietario del pago)
 */
export async function POST(
  request: NextRequest
) {
  return withAuthMiddleware(async (req, { user }) => {
    try {
      const pathname = req.nextUrl.pathname;
      const id = pathname.split('/').pop() as string;
      const body = await req.json();
      
      if (!id) {
        return ApiResponse.badRequest('ID de pago requerido');
      }
      
      // Verificar que el pago existe y pertenece al usuario
      const payment = await paymentService.getPaymentStatus(id);
      
      if (user.role === 'USER' && payment.userId !== user.id) {
        return ApiResponse.forbidden('No tienes permisos para procesar este pago');
      }
      
      // Usar el externalId (Payment Intent ID) para procesar
      const processData = {
        ...body,
        paymentIntentId: payment.externalId || id
      };
      
      const result = await paymentService.processPayment(processData);
      
      return ApiResponse.success(result, 
        result.success ? 'Pago procesado exitosamente' : 'Error procesando el pago'
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
        if (error.message.includes('procesado')) {
          return ApiResponse.badRequest(error.message);
        }
      }
      
      console.error('Error procesando pago:', error);
      return ApiResponse.internalError('Error interno del servidor');
    }
  })(request);
}

/**
 * OPTIONS /api/payments/[id]
 * Manejar preflight requests
 */
export async function OPTIONS() {
  return ApiResponse.success(null);
}