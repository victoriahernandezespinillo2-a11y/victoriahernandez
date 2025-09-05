import { NextRequest } from 'next/server';
import { withAdminMiddleware, ApiResponse } from '@/lib/middleware';
import { db } from '@repo/db';
import { z } from 'zod';

const ListQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  status: z.enum(['DRAFT', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED']).optional(),
});

const CreatePost = z.object({
  title: z.string().min(3),
  slug: z.string().min(3),
  content: z.string().min(1),
  excerpt: z.string().optional(),
  status: z.enum(['DRAFT', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED']).default('DRAFT'),
  publishedAt: z.string().datetime().nullable().optional(),
});

export const GET = (request: NextRequest) => withAdminMiddleware(async (req) => {
  const { searchParams } = req.nextUrl;
  const q = ListQuery.parse(Object.fromEntries(searchParams.entries()));
  const skip = (q.page - 1) * q.limit;

  const where: any = {};
  if (q.search) {
    where.OR = [
      { title: { contains: q.search, mode: 'insensitive' } },
      { excerpt: { contains: q.search, mode: 'insensitive' } },
    ];
  }
  if (q.status) where.status = q.status;

  const [items, total] = await Promise.all([
    db.post.findMany({
      where,
      skip,
      take: q.limit,
      orderBy: { createdAt: 'desc' },
      select: { id: true, title: true, slug: true, status: true, publishedAt: true, createdAt: true },
    }),
    db.post.count({ where }),
  ]);

  return ApiResponse.success({ items, pagination: { page: q.page, limit: q.limit, total, pages: Math.ceil(total / q.limit) } });
})(request);

export const POST = (request: NextRequest) => withAdminMiddleware(async (req) => {
  const body = await req.json();
  const data = CreatePost.parse(body);

  // slug único
  const exists = await db.post.findUnique({ where: { slug: data.slug } });
  if (exists) return ApiResponse.conflict('Slug ya existe');

  const created = await db.post.create({
    data: {
      title: data.title,
      slug: data.slug,
      content: data.content,
      excerpt: data.excerpt,
      status: data.status,
      publishedAt: data.publishedAt ? new Date(data.publishedAt) : null,
      authorId: (req as any).user?.id,
    },
    select: { id: true, title: true, slug: true, status: true, publishedAt: true, createdAt: true },
  });

  return ApiResponse.success(created, 201);
})(request);
