/**
 * POST /api/admin/orders/[id]/check-in
 * Registrar check-in de pedido/producto
 * Acceso: ADMIN únicamente
 */

import { NextRequest } from 'next/server';
import { withAdminMiddleware, ApiResponse } from '@/lib/middleware';
import { db } from '@repo/db';

export async function POST(request: NextRequest) {
  return withAdminMiddleware(async (req) => {
    try {
      const segments = req.nextUrl.pathname.split('/');
      const orderId = segments[segments.indexOf('orders') + 1];
      
      if (!orderId) {
        return ApiResponse.badRequest('ID de pedido requerido');
      }

      // Buscar el pedido
      const order = await (db as any).order.findUnique({
        where: { id: orderId },
        include: { 
          user: true, 
          items: { 
            include: { 
              product: { 
                select: { 
                  name: true,
                  type: true,
                  requiresCheckIn: true
                } 
              } 
            } 
          } 
        },
      });

      if (!order) {
        return ApiResponse.notFound('Pedido no encontrado');
      }

      // Validar que el pedido esté pagado
      if (order.status !== 'PAID') {
        return ApiResponse.badRequest('El pedido no está pagado');
      }

      // Validar que no esté ya canjeado
      if (order.status === 'REDEEMED') {
        return ApiResponse.badRequest('El pedido ya fue canjeado');
      }

      // Verificar si hay productos que requieren check-in
      const itemsRequiringCheckIn = order.items.filter((item: any) => 
        item.product?.requiresCheckIn === true
      );

      if (itemsRequiringCheckIn.length === 0) {
        return ApiResponse.badRequest('Este pedido no contiene productos que requieran check-in');
      }

      // Actualizar estado del pedido
      await (db as any).order.update({
        where: { id: orderId },
        data: { 
          status: 'REDEEMED',
          redeemedAt: new Date()
        }
      });

      // Crear evento de auditoría
      await (db as any).outboxEvent.create({
        data: {
          eventType: 'ORDER_CHECKED_IN',
          eventData: {
            orderId: order.id,
            userId: order.userId,
            items: itemsRequiringCheckIn.map((item: any) => ({
              productId: item.productId,
              productName: item.product?.name,
              quantity: item.qty
            })),
            redeemedAt: new Date().toISOString()
          }
        }
      });

      return ApiResponse.success({
        ok: true,
        order: {
          id: order.id,
          status: 'REDEEMED',
          user: {
            id: order.user.id,
            name: order.user.name,
            email: order.user.email
          },
          items: itemsRequiringCheckIn.map((item: any) => ({
            name: item.product?.name,
            quantity: item.qty,
            type: item.product?.type
          })),
          redeemedAt: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Error en check-in de pedido:', error);
      return ApiResponse.internalError('Error realizando check-in del pedido');
    }
  })(request);
}

export async function OPTIONS() {
  return ApiResponse.success(null);
}




