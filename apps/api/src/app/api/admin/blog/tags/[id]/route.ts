import { NextRequest } from 'next/server';
import { withAdminMiddleware, ApiResponse } from '@/lib/middleware';
import { db } from '@repo/db';
import { z } from 'zod';

const Id = z.object({ id: z.string().min(1) });
const Update = z.object({ name: z.string().min(2).optional(), slug: z.string().min(2).optional(), color: z.string().optional() });

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAdminMiddleware(async () => {
    const { id } = Id.parse(await params);
    const tag = await db.tag.findUnique({ where: { id }, select: { id: true, name: true, slug: true, color: true } });
    if (!tag) return ApiResponse.notFound('Tag');
    return ApiResponse.success(tag);
  })(request);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAdminMiddleware(async (req) => {
    const { id } = Id.parse(await params);
    const data = Update.parse(await req.json());
    if (data.slug) {
      const exists = await db.tag.findFirst({ where: { slug: data.slug, NOT: { id } } });
      if (exists) return ApiResponse.conflict('Slug de tag ya existe');
    }
    const updated = await db.tag.update({ where: { id }, data, select: { id: true, name: true, slug: true, color: true } });
    return ApiResponse.success(updated);
  })(request);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAdminMiddleware(async () => {
    const { id } = Id.parse(await params);
    await db.tag.delete({ where: { id } });
    return ApiResponse.success({ id });
  })(request);
}
