import { NextRequest, NextResponse } from 'next/server';
import { withAdminMiddleware, ApiResponse } from '@/lib/middleware';
import { db } from '@repo/db';
import jwt from 'jsonwebtoken';
import { AutoCompleteService } from '@/lib/services/auto-complete.service';

export async function POST(request: NextRequest) {
  return withAdminMiddleware(async (req) => {
    try {
      const id = req.nextUrl.pathname.split('/').slice(-3, -2)[0];
      if (!id) return ApiResponse.badRequest('ID requerido');
      const { token } = await req.json();
      if (!token) return ApiResponse.badRequest('Token requerido');

      const secret = process.env.JWT_SECRET;
      if (!secret) {
        console.error('❌ [CHECK-IN] JWT_SECRET no está configurado');
        return NextResponse.json({ error: 'Error de configuración del servidor' }, { status: 500 });
      }
      let payload: any;
      try {
        payload = jwt.verify(token, secret);
      } catch {
        return ApiResponse.unauthorized('Token inválido');
      }

      if (payload?.reservationId !== id) {
        return ApiResponse.unauthorized('Token no corresponde');
      }

      const reservation = await db.reservation.findUnique({ 
        where: { id },
        include: { court: { include: { center: true } } }
      });
      if (!reservation) return ApiResponse.notFound('Reserva');

      // ✅ VALIDACIÓN: Verificar si ya está en curso o completada
      if (reservation.status === 'IN_PROGRESS' || reservation.status === 'COMPLETED') {
        return ApiResponse.badRequest('La reserva ya está en curso o completada');
      }

      const now = new Date();
      const start = new Date(reservation.startTime);
      const end = new Date(reservation.endTime);
      const toleranceMin = 30;
      const earliest = new Date(start.getTime() - toleranceMin * 60000);
      const latest = new Date(end.getTime());
      
      if (now < earliest || now > latest) {
        return ApiResponse.forbidden('Fuera de ventana de check-in');
      }

      const updated = await db.reservation.update({
        where: { id },
        data: { status: 'IN_PROGRESS', checkInTime: new Date() },
      });
      
      // ✅ REGISTRAR EVENTO DE CHECK-IN
      await db.outboxEvent.create({ 
        data: { 
          eventType: 'RESERVATION_CHECKED_IN', 
          eventData: { reservationId: reservation.id, at: now.toISOString() } as any 
        } 
      });

      // ✅ AUTO-COMPLETAR: Verificar si hay reservas expiradas que completar
      try {
        await AutoCompleteService.autoCompleteExpiredReservations();
      } catch (error) {
        console.warn('Auto-complete error (non-critical):', error);
      }
      
      return ApiResponse.success(updated);
    } catch (e) {
      return ApiResponse.internalError('Error interno del servidor');
    }
  })(request);
}

export async function OPTIONS() { return ApiResponse.success(null); }




