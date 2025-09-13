import { NextRequest } from 'next/server';
import { z } from 'zod';
import { withAdminMiddleware, ApiResponse } from '@/lib/middleware';
import { db } from '@repo/db';

const CreateProductSchema = z.object({
  centerId: z.string().min(1),
  name: z.string().min(2),
  sku: z.string().min(1),
  category: z.string().min(1),
  priceEuro: z.number().positive(),
  taxRate: z.number().min(0).max(100).default(0),
  stockQty: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
  isPerishable: z.boolean().default(false),
  expiresAt: z.string().datetime().optional(),
  creditMultiplier: z.number().positive().optional(),
  media: z.array(z.any()).optional(),
});

const ListSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  centerId: z.string().optional(),
  active: z.coerce.boolean().optional(),
});

export async function GET(request: NextRequest) {
  return withAdminMiddleware(async (req) => {
    try {
      const params = ListSchema.parse(Object.fromEntries(req.nextUrl.searchParams.entries()));
      
      const where: any = {};
      if (params.centerId) where.centerId = params.centerId;
      if (params.active !== undefined) where.isActive = params.active;
      if (params.search) {
        where.OR = [
          { name: { contains: params.search, mode: 'insensitive' } },
          { sku: { contains: params.search, mode: 'insensitive' } },
          { category: { contains: params.search, mode: 'insensitive' } },
        ];
      }
      
      const skip = (params.page - 1) * params.limit;
      const [items, total] = await Promise.all([
        (db as any).product.findMany({ where, skip, take: params.limit, orderBy: { updatedAt: 'desc' } }),
        (db as any).product.count({ where }),
      ]);
      
      return ApiResponse.success({ items, pagination: { page: params.page, limit: params.limit, total, pages: Math.ceil(total / params.limit) } });
    } catch (error) {
      if (error instanceof z.ZodError) return ApiResponse.validation(error.errors.map(e => ({ field: e.path.join('.'), message: e.message })));
      return ApiResponse.internalError('Error listando productos');
    }
  })(request);
}

export async function POST(request: NextRequest) {
  return withAdminMiddleware(async (req) => {
    try {
      const body = await req.json();
      const data = CreateProductSchema.parse(body);
      
      // Verificar si ya existe un producto con el mismo SKU
      const existingProduct = await (db as any).product.findFirst({
        where: { sku: data.sku }
      });
      
      if (existingProduct) {
        return ApiResponse.error('Ya existe un producto con este SKU', 400);
      }
      
      const created = await (db as any).product.create({ data: {
        centerId: data.centerId,
        name: data.name,
        sku: data.sku,
        category: data.category,
        priceEuro: data.priceEuro,
        taxRate: data.taxRate,
        stockQty: data.stockQty,
        isActive: data.isActive,
        isPerishable: data.isPerishable,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        creditMultiplier: data.creditMultiplier ?? null,
        media: data.media ?? [],
      }});
      return ApiResponse.success(created, 201);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return ApiResponse.validation(error.errors.map(e => ({ field: e.path.join('.'), message: e.message })));
      }
      return ApiResponse.internalError('Error creando producto');
    }
  })(request);
}

export async function OPTIONS() { return ApiResponse.success(null); }








