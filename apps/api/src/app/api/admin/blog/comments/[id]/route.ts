import { NextRequest } from 'next/server';
import { withAdminMiddleware, ApiResponse } from '@/lib/middleware';
import { db } from '@repo/db';
import { z } from 'zod';

const Id = z.object({ id: z.string().min(1) });
const Update = z.object({ status: z.enum(['PENDING', 'APPROVED', 'HIDDEN', 'SPAM']) });

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAdminMiddleware(async (req) => {
    const { id } = Id.parse(await params);
    const data = Update.parse(await req.json());
    const updated = await db.comment.update({ where: { id }, data: { status: data.status }, select: { id: true, status: true } });
    return ApiResponse.success(updated);
  })(request);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAdminMiddleware(async () => {
    const { id } = Id.parse(await params);
    await db.comment.delete({ where: { id } });
    return ApiResponse.success({ id });
  })(request);
}



