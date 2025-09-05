import { NextRequest } from 'next/server';
import { withAdminMiddleware, ApiResponse } from '@/lib/middleware';
import { db } from '@repo/db';
import { z } from 'zod';

const Id = z.object({ id: z.string().min(1) });
const Update = z.object({
  name: z.string().min(2).optional(),
  slug: z.string().min(2).optional(),
  description: z.string().optional(),
  color: z.string().optional(),
  icon: z.string().optional(),
  sortOrder: z.number().int().optional(),
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAdminMiddleware(async (_req) => {
    const { id } = Id.parse(await params);
    const cat = await db.category.findUnique({ where: { id }, select: { id: true, name: true, slug: true, description: true, color: true, icon: true, sortOrder: true } });
    if (!cat) return ApiResponse.notFound('Categoría');
    return ApiResponse.success(cat);
  })(request);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAdminMiddleware(async (req) => {
    const { id } = Id.parse(await params);
    const data = Update.parse(await req.json());
    if (data.slug) {
      const exists = await db.category.findFirst({ where: { slug: data.slug, NOT: { id } } });
      if (exists) return ApiResponse.conflict('Slug de categoría ya existe');
    }
    const updated = await db.category.update({ where: { id }, data, select: { id: true, name: true, slug: true, color: true, icon: true, sortOrder: true } });
    return ApiResponse.success(updated);
  })(request);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAdminMiddleware(async () => {
    const { id } = Id.parse(await params);
    await db.category.delete({ where: { id } });
    return ApiResponse.success({ id });
  })(request);
}
