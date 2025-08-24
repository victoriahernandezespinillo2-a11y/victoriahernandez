import { NextRequest } from 'next/server';
import { withReservationMiddleware, ApiResponse } from '@/lib/middleware';
import { db } from '@repo/db';
import { PaymentService } from '@/lib/services/payment.service';

const paymentService = new PaymentService();

/**
 * POST /api/reservations/:id/pay-demo
 * Simula un pago exitoso y marca la reserva como pagada (uso en QA/demo)
 * Acceso: usuario autenticado propietario de la reserva
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withReservationMiddleware(async (_req, context: any) => {
    const user = (context as any)?.user;
    const { id: reservationId } = await params;

    // Validar existencia y propiedad de la reserva
    const reservation = await db.reservation.findUnique({ where: { id: reservationId } });
    if (!reservation) {
      return ApiResponse.notFound('Reserva no encontrada');
    }
    if (reservation.userId !== user.id && user.role !== 'ADMIN') {
      return ApiResponse.unauthorized('No autorizado');
    }

    const amount = Number(reservation.totalPrice || 0);

    const result = await paymentService.simulateManualPayment({
      amount,
      currency: 'EUR',
      description: `Pago demo de reserva ${reservation.id}`,
      reservationId,
      userId: user.id,
      paymentMethod: 'CARD',
    });

    return ApiResponse.success(result);
  })(request);
}



