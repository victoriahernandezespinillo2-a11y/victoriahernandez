import { NextRequest } from 'next/server';
import { withStaffMiddleware, ApiResponse } from '@/lib/middleware';
import { db } from '@repo/db';

export async function GET(request: NextRequest) {
  return withStaffMiddleware(async (req) => {
    try {
      const { searchParams } = req.nextUrl;
      const page = Math.max(1, Number(searchParams.get('page') || '1'));
      const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') || '20')));
      const skip = (page - 1) * limit;
      const [items, total] = await Promise.all([
        (db as any).order.findMany({
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
          include: { user: { select: { id: true, email: true } }, items: { include: { product: { select: { name: true } } } } },
        }),
        (db as any).order.count(),
      ]);
      return ApiResponse.success({ items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
    } catch (error) {
      return ApiResponse.internalError('Error listando pedidos');
    }
  })(request);
}

export async function OPTIONS() { return ApiResponse.success(null); }






