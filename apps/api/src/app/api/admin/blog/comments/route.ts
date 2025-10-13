import { NextRequest } from 'next/server';
import { withAdminMiddleware, ApiResponse } from '@/lib/middleware';
import { db } from '@repo/db';
import { z } from 'zod';

const ListQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['PENDING', 'APPROVED', 'HIDDEN', 'SPAM']).optional(),
  postId: z.string().optional(),
});

export const GET = (request: NextRequest) => withAdminMiddleware(async (req) => {
  const q = ListQuery.parse(Object.fromEntries(req.nextUrl.searchParams.entries()));
  const skip = (q.page - 1) * q.limit;
  const where: any = {};
  if (q.status) where.status = q.status;
  if (q.postId) where.postId = q.postId;

  const [items, total] = await Promise.all([
    db.comment.findMany({
      where,
      skip,
      take: q.limit,
      orderBy: { createdAt: 'desc' },
      select: { id: true, postId: true, authorName: true, authorEmail: true, content: true, status: true, createdAt: true },
    }),
    db.comment.count({ where }),
  ]);

  return ApiResponse.success({ items, pagination: { page: q.page, limit: q.limit, total, pages: Math.ceil(total / q.limit) } });
})(request);








































