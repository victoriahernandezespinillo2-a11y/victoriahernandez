import { NextRequest } from 'next/server';
import { withAuthMiddleware, ApiResponse } from '@/lib/middleware';
import { db } from '@repo/db';

export async function GET(request: NextRequest) {
  return withAuthMiddleware(async (req, context: any) => {
    try {
      const user = (context as any)?.user;
      const { searchParams } = req.nextUrl;
      const page = Math.max(1, Number(searchParams.get('page') || '1'));
      const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') || '20')));
      const skip = (page - 1) * limit;

      const where: any = {};
      // Si es USER, solo sus pedidos; STAFF/ADMIN podrían ver todos (futuro: filtros por center)
      if (user.role === 'USER') where.userId = user.id;
      else if (searchParams.get('userId')) where.userId = searchParams.get('userId');

      const [items, total] = await Promise.all([
        (db as any).order.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
          include: {
            items: {
              include: {
                product: { select: { id: true, name: true, category: true } },
              },
            },
          },
        }),
        (db as any).order.count({ where }),
      ]);

      return ApiResponse.success({
        items,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      });
    } catch (error) {
      console.error('Error listando pedidos:', error);
      return ApiResponse.internalError('Error interno del servidor');
    }
  })(request);
}

export async function OPTIONS() {
  return ApiResponse.success(null);
}






