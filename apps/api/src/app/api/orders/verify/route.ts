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

    return ApiResponse.success({
      ok: order.status === 'PAID',
      order: {
        id: order.id,
        status: order.status,
        user: { id: order.userId, name: order.user?.name, email: order.user?.email },
        items: (order.items || []).map((it: any) => ({ name: it.product?.name || 'Producto', qty: it.qty })),
        createdAt: order.createdAt,
      },
    }, order.status === 'PAID' ? 200 : 409);
  } catch (e) {
    return ApiResponse.internalError('Error verificando pase');
  }
}

export async function OPTIONS() { return ApiResponse.success(null); }



















