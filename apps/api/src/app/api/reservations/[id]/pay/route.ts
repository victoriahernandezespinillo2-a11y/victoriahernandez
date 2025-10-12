/**
 * POST /api/reservations/[id]/pay
 * Procesar pago de una reserva
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@repo/db';
import { getReservationPaymentService } from '@/lib/services/reservation-payment.service';
import { ApiResponse } from '@/lib/utils/api-response';
import { getAuthUser } from '@/lib/auth';

const PayReservationSchema = z.object({
  paymentMethod: z.enum(['CREDITS', 'CARD', 'FREE']),
  amount: z.number().min(0, 'El monto debe ser mayor o igual a 0'),
  idempotencyKey: z.string().optional(),
  appliedPromo: z.object({
    code: z.string(),
    finalAmount: z.number(),
    savings: z.number(),
    rewardAmount: z.number()
  }).optional()
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('🚀 [PAY-RESERVATION] Iniciando endpoint de pago...');
    
    // 1. Autenticación
    const user = await getAuthUser(request);
    console.log('🔐 [PAY-RESERVATION] Usuario autenticado:', user ? user.email : 'No autenticado');
    if (!user) {
      return ApiResponse.unauthorized('Usuario no autenticado');
    }

    // 2. Validar parámetros
    const { id: reservationId } = await params;
    console.log('📋 [PAY-RESERVATION] Reservation ID:', reservationId);
    if (!reservationId) {
      return ApiResponse.badRequest('ID de reserva requerido');
    }

    const body = await request.json();
    console.log('📥 [PAY-RESERVATION] Body recibido:', JSON.stringify(body, null, 2));
    
    let validatedData;
    try {
      validatedData = PayReservationSchema.parse(body);
      console.log('✅ [PAY-RESERVATION] Datos validados:', validatedData);
    } catch (validationError) {
      console.error('❌ [PAY-RESERVATION] Error de validación:', validationError);
      console.error('❌ [PAY-RESERVATION] Datos que fallaron:', body);
      if (validationError instanceof z.ZodError) {
        console.error('❌ [PAY-RESERVATION] Errores específicos:', validationError.errors);
      }
      throw validationError;
    }

    // 3. Verificar que la reserva existe y pertenece al usuario
    console.log('🔍 [PAY-RESERVATION] Buscando reserva...');
    const reservation = await db.reservation.findUnique({
      where: { id: reservationId },
      include: { user: true, court: true }
    });

    if (!reservation) {
      console.error('❌ [PAY-RESERVATION] Reserva no encontrada');
      return ApiResponse.notFound('Reserva no encontrada');
    }

    console.log('✅ [PAY-RESERVATION] Reserva encontrada:', {
      id: reservation.id,
      status: reservation.status,
      paymentStatus: reservation.paymentStatus,
      totalPrice: reservation.totalPrice,
      userId: reservation.userId
    });

    if (reservation.userId !== user.id) {
      console.error('❌ [PAY-RESERVATION] Usuario no autorizado');
      return ApiResponse.forbidden('No tienes permisos para pagar esta reserva');
    }

    if (reservation.status !== 'PENDING') {
      console.error('❌ [PAY-RESERVATION] Reserva no está pendiente:', reservation.status);
      return ApiResponse.badRequest(`La reserva no está pendiente. Estado actual: ${reservation.status}`);
    }

    if (reservation.paymentStatus === 'PAID') {
      console.error('❌ [PAY-RESERVATION] Reserva ya pagada');
      return ApiResponse.badRequest('La reserva ya está pagada');
    }

    // 4. Validar que el monto coincide con el total de la reserva (o es 0 para pagos gratis)
    const reservationTotal = Number(reservation.totalPrice || 0);
    console.log('💰 [PAY-RESERVATION] Validando monto:', {
      reservationTotal,
      requestedAmount: validatedData.amount,
      paymentMethod: validatedData.paymentMethod,
      appliedPromo: validatedData.appliedPromo,
      difference: Math.abs(validatedData.amount - reservationTotal)
    });
    
    // Para pagos gratis (FREE), el monto debe ser 0
    if (validatedData.paymentMethod === 'FREE') {
      if (validatedData.amount !== 0) {
        console.error('❌ [PAY-RESERVATION] Pago gratis debe tener monto 0');
        return ApiResponse.badRequest('El pago gratis debe tener monto 0');
      }
      console.log('✅ [PAY-RESERVATION] Pago gratis validado correctamente');
    } else {
      // Para otros métodos, validar que el monto coincide con el total o es el monto final con descuento
      const expectedAmount = validatedData.appliedPromo?.finalAmount || reservationTotal;
      
      if (Math.abs(validatedData.amount - expectedAmount) > 0.01) {
        console.error('❌ [PAY-RESERVATION] Monto no coincide');
        console.log('💰 [PAY-RESERVATION] Detalles de validación:', {
          reservationTotal,
          appliedPromo: validatedData.appliedPromo,
          expectedAmount,
          providedAmount: validatedData.amount,
          difference: Math.abs(validatedData.amount - expectedAmount)
        });
        return ApiResponse.badRequest(
          `El monto no coincide. Esperado: €${expectedAmount.toFixed(2)}, Proporcionado: €${validatedData.amount.toFixed(2)}`
        );
      }
      
      console.log('✅ [PAY-RESERVATION] Monto validado correctamente:', {
        reservationTotal,
        expectedAmount,
        providedAmount: validatedData.amount,
        hasDiscount: !!validatedData.appliedPromo
      });
    }

    // 5. Procesar el pago
    console.log('🔄 [PAY-RESERVATION] Iniciando procesamiento de pago...');
    const paymentService = getReservationPaymentService(db);
    const result = await paymentService.processPayment({
      reservationId,
      paymentMethod: validatedData.paymentMethod,
      userId: user.id,
      amount: validatedData.amount,
      idempotencyKey: validatedData.idempotencyKey,
      appliedPromo: validatedData.appliedPromo
    });

    console.log('📊 [PAY-RESERVATION] Resultado del procesamiento:', result);

    if (!result.success) {
      console.error('❌ [PAY-RESERVATION] Error en procesamiento:', result.error);
      return ApiResponse.badRequest(result.error || 'Error procesando el pago');
    }

    // 6. Respuesta exitosa
    console.log('✅ [PAY-RESERVATION] Construyendo respuesta exitosa...');
    const response: any = {
      success: true,
      reservationId: result.reservationId,
      paymentMethod: result.paymentMethod,
      amount: result.amount,
      message: result.paymentMethod === 'CREDITS' 
        ? 'Pago procesado exitosamente con créditos'
        : result.paymentMethod === 'FREE'
        ? 'Reserva confirmada gratis con promoción aplicada'
        : 'Redirigiendo a procesador de pagos'
    };

    // Agregar información específica según el método de pago
    if (result.paymentMethod === 'CREDITS') {
      response.creditsUsed = result.creditsUsed;
      response.balanceAfter = result.balanceAfter;
      console.log('💰 [PAY-RESERVATION] Información de créditos:', {
        creditsUsed: result.creditsUsed,
        balanceAfter: result.balanceAfter
      });
    } else if (result.paymentMethod === 'CARD' && result.redirectUrl) {
      response.redirectUrl = result.redirectUrl;
    }

    console.log('📤 [PAY-RESERVATION] Enviando respuesta:', response);
    return ApiResponse.success(response);

  } catch (error) {
    console.error('Error en POST /api/reservations/[id]/pay:', error);
    
    if (error instanceof z.ZodError) {
      return ApiResponse.badRequest('Datos de entrada inválidos');
    }

    return ApiResponse.internalError('Error interno del servidor');
  }
}
