/**
 * GET /api/reservations/[id]/payment-methods
 * Obtener métodos de pago disponibles para una reserva
 */

import { NextRequest } from 'next/server';
import { db } from '@repo/db';
import { getCreditSystemService } from '@/lib/services/credit-system.service';
import { ApiResponse } from '@/lib/utils/api-response';
import { withReservationMiddleware } from '@/lib/middleware';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withReservationMiddleware(async (req) => {
    try {
      // 1. Autenticación
      const user = (req as any).user;
      if (!user?.id) {
        return ApiResponse.unauthorized('Usuario no autenticado');
      }

    // 2. Validar parámetros
    const { id: reservationId } = await params;
    if (!reservationId) {
      return ApiResponse.badRequest('ID de reserva requerido');
    }

    // 3. Verificar que la reserva existe y pertenece al usuario
    const reservation = await db.reservation.findUnique({
      where: { id: reservationId },
      include: { user: true, court: true }
    });

    if (!reservation) {
      return ApiResponse.notFound('Reserva no encontrada');
    }

    if (reservation.userId !== user.id) {
      return ApiResponse.forbidden('No tienes permisos para acceder a esta reserva');
    }

    if (reservation.status !== 'PENDING') {
      return ApiResponse.badRequest(`La reserva no está pendiente. Estado actual: ${reservation.status}`);
    }

    if (reservation.paymentStatus === 'PAID') {
      return ApiResponse.badRequest('La reserva ya está pagada');
    }

    // 4. Obtener información de métodos de pago
    const reservationTotal = Number(reservation.totalPrice || 0);
    
    // Obtener balance de créditos del usuario
    const creditBalance = await getCreditSystemService(db).getBalance(user.id);
    
    // Calcular créditos necesarios (asumiendo 1 crédito = 1 euro por ahora)
    const creditsNeeded = reservationTotal;
    
    // Determinar métodos de pago disponibles
    const paymentMethods: any[] = [
      {
        method: 'CARD',
        name: 'Tarjeta de crédito/débito',
        description: 'Pago seguro con tarjeta a través de Redsys',
        available: true,
        icon: '💳',
        redirectRequired: true
      }
    ];

    // Agregar método de créditos si el usuario tiene suficiente saldo
    if (creditBalance >= creditsNeeded) {
      paymentMethods.unshift({
        method: 'CREDITS',
        name: 'Créditos de billetera',
        description: `Pagar con ${creditsNeeded} créditos de tu billetera`,
        available: true,
        icon: '🪙',
        redirectRequired: false,
        creditsAvailable: creditBalance,
        creditsNeeded: creditsNeeded,
        balanceAfter: creditBalance - creditsNeeded
      });
    } else {
      paymentMethods.push({
        method: 'CREDITS',
        name: 'Créditos de billetera',
        description: `Saldo insuficiente. Necesitas ${creditsNeeded} créditos, tienes ${creditBalance}`,
        available: false,
        icon: '🪙',
        redirectRequired: false,
        creditsAvailable: creditBalance,
        creditsNeeded: creditsNeeded,
        balanceAfter: creditBalance - creditsNeeded,
        disabledReason: 'SALDO_INSUFICIENTE'
      });
    }

    // 5. Respuesta exitosa
    const response = {
      reservationId,
      totalAmount: reservationTotal,
      currency: 'EUR',
      paymentMethods,
      metadata: {
        reservation: {
          id: reservation.id,
          courtName: reservation.court?.name,
          startTime: reservation.startTime,
          endTime: reservation.endTime
        },
        user: {
          id: user.id,
          creditBalance,
          creditsNeeded
        }
      }
    };

      return ApiResponse.success(response);

    } catch (error) {
      console.error('Error en GET /api/reservations/[id]/payment-methods:', error);
      return ApiResponse.internalError('Error interno del servidor');
    }
  })(request);
}
