/**
 * GET /api/admin/credits/users
 * Listado paginado de usuarios de créditos con soporte de búsqueda.
 */

import { NextRequest } from 'next/server';
import { withAdminMiddleware, ApiResponse } from '@/lib/middleware';
import { db } from '@repo/db';
import type { Prisma } from '@prisma/client';

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

export async function GET(request: NextRequest) {
  return withAdminMiddleware(async (req) => {
    try {
      const { searchParams } = req.nextUrl;

      const pageParam = Number(searchParams.get('page') ?? '1');
      const limitParam = Number(searchParams.get('limit') ?? DEFAULT_LIMIT.toString());
      const orderParam = (searchParams.get('orderBy') ?? 'balance').toLowerCase();
      const directionParam = (searchParams.get('direction') ?? 'desc').toLowerCase();
      const search = (searchParams.get('search') ?? '').trim();
      const onlyWithBalance = searchParams.get('withBalance') === 'true';

      const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
      const limit = Number.isFinite(limitParam)
        ? Math.min(Math.max(1, limitParam), MAX_LIMIT)
        : DEFAULT_LIMIT;
      const skip = (page - 1) * limit;

      const where: Prisma.UserWhereInput = {};

      if (search.length > 0) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ];
      }

      if (onlyWithBalance) {
        where.creditsBalance = { gt: 0 };
      }

      const orderBy: Prisma.UserOrderByWithRelationInput[] =
        orderParam === 'name'
          ? [{ name: directionParam === 'asc' ? 'asc' : 'desc' }]
          : [
              { creditsBalance: directionParam === 'asc' ? 'asc' : 'desc' },
              { name: 'asc' },
            ];

      const [users, total] = await Promise.all([
        db.user.findMany({
          where,
          orderBy,
          skip,
          take: limit,
          select: {
            id: true,
            name: true,
            email: true,
            creditsBalance: true,
          },
        }),
        db.user.count({ where }),
      ]);

      const pages = Math.max(1, Math.ceil(total / limit));

      return ApiResponse.success({
        users: users.map((user) => ({
          id: user.id,
          name: user.name ?? user.email ?? 'Usuario sin nombre',
          email: user.email ?? '',
          balance: Number(user.creditsBalance ?? 0),
        })),
        pagination: {
          page,
          limit,
          total,
          pages,
        },
      });
    } catch (error) {
      console.error('💥 [API] Error en GET /api/admin/credits/users:', error);
      return ApiResponse.internalError(
        'No se pudo obtener el listado de usuarios con créditos. ' +
          ((error as Error)?.message ?? 'Error desconocido'),
      );
    }
  })(request);
}


