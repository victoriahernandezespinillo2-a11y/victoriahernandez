import { NextRequest } from 'next/server';
import { withAdminMiddleware, ApiResponse } from '@/lib/middleware';
import { db } from '@repo/db';
import { z } from 'zod';

const IdParam = z.object({ id: z.string().min(1) });
const UpdatePost = z.object({
  title: z.string().min(3).optional(),
  slug: z.string().min(3).optional(),
  content: z.string().min(1).optional(),
  excerpt: z.string().optional(),
  status: z.enum(['DRAFT', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED']).optional(),
  publishedAt: z.string().datetime().nullable().optional(),
});

export const GET = (request: NextRequest, context: { params: Promise<{ id: string }> }) => withAdminMiddleware(async () => {
  const { id } = IdParam.parse(await context.params);
  const post = await db.post.findUnique({ where: { id }, select: { id: true, title: true, slug: true, content: true, excerpt: true, status: true, publishedAt: true, createdAt: true } });
  if (!post) return ApiResponse.notFound('Post');
  return ApiResponse.success(post);
})(request);

export const PUT = (request: NextRequest, context: { params: Promise<{ id: string }> }) => withAdminMiddleware(async (req) => {
  const { id } = IdParam.parse(await context.params);
  const body = await req.json();
  const data = UpdatePost.parse(body);
  if (data.slug) {
    const exists = await db.post.findFirst({ where: { slug: data.slug, NOT: { id } } });
    if (exists) return ApiResponse.conflict('Slug ya existe');
  }
  const updated = await db.post.update({
    where: { id },
    data: {
      ...data,
      publishedAt: data.publishedAt === undefined ? undefined : (data.publishedAt ? new Date(data.publishedAt) : null),
    },
    select: { id: true, title: true, slug: true, status: true, publishedAt: true, updatedAt: true },
  });
  return ApiResponse.success(updated);
})(request);

export const DELETE = (request: NextRequest, context: { params: Promise<{ id: string }> }) => withAdminMiddleware(async () => {
  const { id } = IdParam.parse(await context.params);
  await db.post.delete({ where: { id } });
  return ApiResponse.success({ id });
})(request);
