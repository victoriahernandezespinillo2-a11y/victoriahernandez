import { NextRequest } from 'next/server';
import { z } from 'zod';
import { withAdminMiddleware, ApiResponse } from '@/lib/middleware';
import { db } from '@repo/db';

const MovementSchema = z.object({
  productId: z.string().min(1),
  type: z.enum(['IN','OUT','ADJUST','WASTE']),
  qty: z.number().int().positive(),
  reason: z.string().optional(),
});

export async function POST(request: NextRequest) {
  return withAdminMiddleware(async (req) => {
    try {
      const body = await req.json();
      const data = MovementSchema.parse(body);
      const created = await (db as any).$transaction(async (tx: any) => {
        const product = await tx.product.findUnique({ where: { id: data.productId } });
        if (!product) throw new Error('Producto no encontrado');
        const delta = (data.type === 'IN') ? data.qty : (data.type === 'OUT' || data.type === 'WASTE') ? -data.qty : 0;
        if (delta !== 0) {
          const newStock = (product.stockQty || 0) + delta;
          if (newStock < 0) throw new Error('Stock insuficiente para el movimiento');
          await tx.product.update({ where: { id: data.productId }, data: { stockQty: newStock } });
        }
        const mv = await tx.inventoryMovement.create({ data: { productId: data.productId, type: data.type, qty: data.qty, reason: data.reason } });
        return mv;
      });
      return ApiResponse.success(created, 201);
    } catch (error) {
      if (error instanceof z.ZodError) return ApiResponse.validation(error.errors.map(e => ({ field: e.path.join('.'), message: e.message })));
      return ApiResponse.internalError('Error creando movimiento de inventario');
    }
  })(request);
}

export async function OPTIONS() { return ApiResponse.success(null); }

export async function GET(request: NextRequest) {
  return withAdminMiddleware(async (req) => {
    try {
      const search = req.nextUrl.searchParams;
      const limitParam = search.get('limit');
      const productId = search.get('productId') || undefined;
      const centerId = search.get('centerId') || undefined;
      const limit = Math.min(Math.max(Number(limitParam) || 50, 1), 200);

      const where: any = {};
      if (productId) where.productId = productId;
      if (centerId) where.product = { centerId };

      const items = await (db as any).inventoryMovement.findMany({
        where,
        include: { product: { select: { name: true, sku: true } } },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      return ApiResponse.success(items);
    } catch (error) {
      return ApiResponse.internalError('Error listando movimientos de inventario');
    }
  })(request);
}






