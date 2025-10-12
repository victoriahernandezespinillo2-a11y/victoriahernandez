import { NextRequest } from 'next/server';
import { withAdminMiddleware, ApiResponse } from '@/lib/middleware';
import { db } from '@repo/db';
import { z } from 'zod';
import { ledgerService } from '@/lib/services/ledger.service';
import { walletService } from '@/lib/services/wallet.service';

const Schema = z.object({
  amount: z.number().positive().optional(),
  reason: z.string().min(3),
});

export async function POST(request: NextRequest) {
  return withAdminMiddleware(async (req) => {
    try {
      console.log('🔄 [REFUND] Iniciando proceso de reembolso...');
      
      const pathname = req.nextUrl.pathname;
      const id = pathname.split('/').slice(-2, -1)[0] as string;
      console.log('🔄 [REFUND] ID del pedido:', id);
      
      if (!id) return ApiResponse.badRequest('ID de orden requerido');

      const body = await req.json().catch(() => ({}));
      console.log('🔄 [REFUND] Body recibido:', body);
      
      const input = Schema.parse(body);
      console.log('🔄 [REFUND] Input validado:', input);

      const order = await (db as any).order.findUnique({ 
        where: { id }, 
        select: { 
          id: true, 
          totalEuro: true, 
          creditsUsed: true, 
          paymentMethod: true, 
          userId: true 
        } 
      });
      console.log('🔄 [REFUND] Pedido encontrado:', {
        id: order.id,
        totalEuro: order.totalEuro,
        creditsUsed: order.creditsUsed,
        paymentMethod: order.paymentMethod,
        userId: order.userId,
        creditsUsedType: typeof order.creditsUsed,
        creditsUsedIsNull: order.creditsUsed === null,
        creditsUsedIsUndefined: order.creditsUsed === undefined
      });
      
      if (!order) return ApiResponse.notFound('Orden no encontrada');

      const amount = Number(input.amount || order.totalEuro || 0);
      console.log('🔄 [REFUND] Monto calculado:', amount);
      
      if (!(amount > 0)) return ApiResponse.badRequest('Monto de reembolso inválido');

      // ✅ CORREGIDO: Reembolsar créditos si el pedido fue pagado con créditos
      if (order.paymentMethod === 'CREDITS' && order.creditsUsed && order.creditsUsed > 0) {
        console.log('🔄 [REFUND] Reembolsando créditos...', {
          userId: order.userId,
          credits: order.creditsUsed,
          orderId: order.id
        });
        
        await walletService.refundCredits({
          userId: order.userId,
          credits: Number(order.creditsUsed), // Convertir Decimal a Number
          reason: 'REFUND' as any,
          metadata: { orderId: order.id, refundReason: input.reason },
          idempotencyKey: `REFUND_CREDITS:ORD:${order.id}`
        });
        
        console.log('✅ [REFUND] Créditos reembolsados exitosamente');
      } else if (order.paymentMethod === 'CREDITS' && (!order.creditsUsed || order.creditsUsed <= 0)) {
        console.log('⚠️ [REFUND] Pedido pagado con créditos pero creditsUsed es 0 o null, saltando reembolso de créditos');
      }

      // Registrar reembolso en ledger (DEBIT)
      console.log('🔄 [REFUND] Registrando en ledger...');
      const ledgerMetadata: any = { reason: input.reason };
      
      // Solo incluir creditsRefunded si realmente se reembolsaron créditos
      if (order.paymentMethod === 'CREDITS' && order.creditsUsed && Number(order.creditsUsed) > 0) {
        ledgerMetadata.creditsRefunded = Number(order.creditsUsed);
      }
      
      await ledgerService.recordRefund({
        sourceType: 'ORDER',
        sourceId: order.id,
        amountEuro: amount,
        currency: 'EUR',
        method: order.paymentMethod === 'CREDITS' ? 'CREDITS' : 'CARD',
        paidAt: new Date(),
        idempotencyKey: `REFUND:ORD:${order.id}:${amount}`,
        metadata: ledgerMetadata,
      });
      console.log('✅ [REFUND] Registrado en ledger exitosamente');

      // Actualizar estado del pedido a REFUNDED si es reembolso total
      if (amount >= Number(order.totalEuro || 0)) {
        console.log('🔄 [REFUND] Actualizando estado del pedido a REFUNDED...');
        await (db as any).order.update({ 
          where: { id: order.id }, 
          data: { 
            status: 'REFUNDED' as any,
            paymentStatus: 'REFUNDED' as any 
          } 
        });
        console.log('✅ [REFUND] Estado del pedido actualizado a REFUNDED');
      }

      console.log('🔄 [REFUND] Creando evento de auditoría...');
      await (db as any).outboxEvent.create({ data: { eventType: 'ORDER_REFUNDED', eventData: { orderId: order.id, amount, reason: input.reason } as any } });
      console.log('✅ [REFUND] Evento de auditoría creado');

      console.log('✅ [REFUND] Reembolso completado exitosamente');
      return ApiResponse.success({ success: true, orderId: order.id, amount });
    } catch (error) {
      console.error('❌ [REFUND] Error en proceso de reembolso:', error);
      console.error('❌ [REFUND] Stack trace:', (error as Error)?.stack);
      
      if (error instanceof z.ZodError) {
        console.error('❌ [REFUND] Error de validación:', error.errors);
        return ApiResponse.validation(error.errors.map(er => ({ field: er.path.join('.'), message: er.message })));
      }
      
      return ApiResponse.internalError(`No se pudo procesar el reembolso de la orden: ${(error as Error)?.message || 'Error desconocido'}`);
    }
  })(request);
}

export async function OPTIONS() { 
  return ApiResponse.success(null); 
}