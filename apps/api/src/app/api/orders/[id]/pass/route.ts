export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { withAuthMiddleware, ApiResponse } from '@/lib/middleware';
import { db } from '@repo/db';

/**
 * GET /api/orders/[id]/pass
 * Genera un QR (Data URL) para mostrar dentro de la app, sin enviar por email
 * Auth: usuario propietario o STAFF/ADMIN
 */
export async function GET(request: NextRequest) {
  return withAuthMiddleware(async (req) => {
    try {
      const user = (req as any).user;
      const parts = req.nextUrl.pathname.split('/');
      const orderId = parts[parts.indexOf('orders') + 1];
      if (!orderId) return ApiResponse.badRequest('ID de pedido requerido');

      const order = await (db as any).order.findUnique({
        where: { id: orderId },
        include: { items: { include: { product: { select: { name: true } } } } },
      });
      if (!order) return ApiResponse.notFound('Pedido');

      // Autorización: dueño o staff/admin
      const isStaff = user.role === 'STAFF' || user.role === 'ADMIN';
      if (!isStaff && order.userId !== user.id) {
        return ApiResponse.forbidden('No puedes acceder al pase de este pedido');
      }

      if (order.status !== 'PAID') {
        return ApiResponse.conflict('El pedido no está pagado o ya fue canjeado');
      }

      const jwt = (await import('jsonwebtoken')) as unknown as typeof import('jsonwebtoken');
      const QRCode = (await import('qrcode')) as unknown as { toDataURL: (text: string, opts?: any) => Promise<string> };

      const ttlMin = Math.max(5, Number(process.env.ORDER_PASS_TTL_MIN || '240')); // 4h por defecto
      const expSeconds = Math.floor(Date.now() / 1000) + ttlMin * 60;
      const payload = { type: 'order-pass', orderId, uid: user.id, exp: expSeconds } as any;
      const token = jwt.sign(payload, (process.env.JWT_SECRET || ''));

      const apiBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002').replace(/\/$/, '');
      const verifyUrl = `${apiBase}/api/orders/verify?token=${encodeURIComponent(token)}`;
      const qrCodeDataUrl = await QRCode.toDataURL(verifyUrl, { width: 220, margin: 1 });

      return ApiResponse.success({
        orderId,
        qrCodeDataUrl,
        verifyUrl,
        expiresAt: new Date(expSeconds * 1000).toISOString(),
        items: (order.items || []).map((it: any) => ({ name: it.product?.name || 'Producto', qty: it.qty })),
      });
    } catch (e) {
      return ApiResponse.internalError('No se pudo generar el pase');
    }
  })(request);
}

export async function OPTIONS() { return ApiResponse.success(null); }



