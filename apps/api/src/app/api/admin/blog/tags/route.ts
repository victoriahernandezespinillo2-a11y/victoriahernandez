import { NextRequest } from 'next/server';
import { withAdminMiddleware, ApiResponse } from '@/lib/middleware';
import { db } from '@repo/db';
import { z } from 'zod';

const ListQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  search: z.string().optional(),
});

const Create = z.object({ name: z.string().min(2), slug: z.string().min(2), color: z.string().optional() });

export const GET = (request: NextRequest) => withAdminMiddleware(async (req) => {
  const q = ListQuery.parse(Object.fromEntries(req.nextUrl.searchParams.entries()));
  const skip = (q.page - 1) * q.limit;
  const where: any = q.search ? { name: { contains: q.search, mode: 'insensitive' } } : {};
  const [items, total] = await Promise.all([
    db.tag.findMany({ where, skip, take: q.limit, orderBy: { name: 'asc' }, select: { id: true, name: true, slug: true, color: true } }),
    db.tag.count({ where }),
  ]);
  return ApiResponse.success({ items, pagination: { page: q.page, limit: q.limit, total, pages: Math.ceil(total / q.limit) } });
})(request);

export const POST = (request: NextRequest) => withAdminMiddleware(async (req) => {
  const data = Create.parse(await req.json());
  const exists = await db.tag.findUnique({ where: { slug: data.slug } });
  if (exists) return ApiResponse.conflict('Slug de tag ya existe');
  const created = await db.tag.create({ data, select: { id: true, name: true, slug: true, color: true } });
  return ApiResponse.success(created, 201);
})(request);
