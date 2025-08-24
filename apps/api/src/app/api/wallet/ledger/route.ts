import { NextRequest } from 'next/server';
import { z } from 'zod';
import { withAuthMiddleware, ApiResponse } from '@/lib/middleware';
import { db } from '@repo/db';

const QuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export async function GET(request: NextRequest) {
  return withAuthMiddleware(async (req, context: any) => {
    try {
      const user = (context as any)?.user;
      const params = Object.fromEntries(req.nextUrl.searchParams.entries());
      const { page, limit } = QuerySchema.parse(params);

      const skip = (page - 1) * limit;
      const [items, total] = await Promise.all([
        (db as any).walletLedger.findMany({
          where: { userId: user.id },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }).catch(() => []),
        (db as any).walletLedger.count({ where: { userId: user.id } }).catch(() => 0),
      ]);

      return ApiResponse.success({
        items,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil((total || 0) / limit),
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return ApiResponse.validation(error.errors.map(err => ({ field: err.path.join('.'), message: err.message })));
      }
      console.error('Error leyendo ledger:', error);
      return ApiResponse.internalError('Error interno');
    }
  })(request);
}

export async function OPTIONS() {
  return ApiResponse.success(null);
}



