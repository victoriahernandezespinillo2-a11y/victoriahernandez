export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { ApiResponse } from '@/lib/middleware';
import { db } from '@repo/db';

/**
 * GET /api/orders/verify?token=...
 * Verifica el token del pase y devuelve datos resumidos del pedido.
 * Público (el token firmado es la autenticación).
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token');
    if (!token) return ApiResponse.badRequest('Token requerido');

    const jwt = (await import('jsonwebtoken')) as unknown as typeof import('jsonwebtoken');
    let payload: any;
    try {
      payload = jwt.verify(token, (process.env.JWT_SECRET || '')) as any;
    } catch (e) {
      return ApiResponse.unauthorized('Token inválido o expirado');
    }

    if (payload?.type !== 'order-pass' || !payload?.orderId) {
      return ApiResponse.badRequest('Token no válido para pase de pedido');
    }

    const order = await (db as any).order.findUnique({
      where: { id: payload.orderId },
      include: { user: true, items: { include: { product: { select: { name: true } } } } },
    });
    if (!order) return ApiResponse.notFound('Pedido');

    // Verificar si hay productos que requieren check-in
    const itemsRequiringCheckIn = (order.items || []).filter((item: any) => 
      item.product?.requiresCheckIn === true
    );

    const canCheckIn = order.status === 'PAID' && itemsRequiringCheckIn.length > 0;
    const alreadyRedeemed = order.status === 'REDEEMED';

    return ApiResponse.success({
      ok: canCheckIn && !alreadyRedeemed,
      order: {
        id: order.id,
        status: order.status,
        user: { id: order.userId, name: order.user?.name, email: order.user?.email },
        items: (order.items || []).map((it: any) => ({ 
          name: it.product?.name || 'Producto', 
          qty: it.qty,
          type: it.product?.type,
          requiresCheckIn: it.product?.requiresCheckIn
        })),
        itemsRequiringCheckIn: itemsRequiringCheckIn.map((item: any) => ({
          name: item.product?.name,
          quantity: item.qty,
          type: item.product?.type
        })),
        canCheckIn,
        alreadyRedeemed,
        createdAt: order.createdAt,
      },
    }, canCheckIn && !alreadyRedeemed ? 200 : 409);
  } catch (e) {
    return ApiResponse.internalError('Error verificando pase');
  }
}

export async function OPTIONS() { return ApiResponse.success(null); }
























