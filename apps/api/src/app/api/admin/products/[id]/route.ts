import { NextRequest } from 'next/server';
import { z } from 'zod';
import { withAdminMiddleware, ApiResponse } from '@/lib/middleware';
import { db } from '@repo/db';

const UpdateSchema = z.object({
  name: z.string().min(2).optional(),
  sku: z.string().min(1).optional(),
  category: z.string().min(1).optional(),
  priceEuro: z.number().positive().optional(),
  taxRate: z.number().min(0).max(100).optional(),
  stockQty: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
  isPerishable: z.boolean().optional(),
  expiresAt: z.string().datetime().optional(),
  creditMultiplier: z.number().positive().optional(),
  media: z.array(z.any()).optional(),
});

export async function PUT(request: NextRequest) {
  return withAdminMiddleware(async (req) => {
    try {
      const id = req.nextUrl.pathname.split('/').pop() as string;
      const body = await req.json();
      const data = UpdateSchema.parse(body);
      
      // Si se está actualizando el SKU, verificar que no exista otro producto con el mismo SKU
      if (data.sku) {
        const existingProduct = await (db as any).product.findFirst({
          where: { 
            sku: data.sku,
            id: { not: id } // Excluir el producto actual
          }
        });
        
        if (existingProduct) {
          return ApiResponse.error('Ya existe un producto con este SKU', 400);
        }
      }
      
      const updated = await (db as any).product.update({
        where: { id },
        data: {
          ...data,
          expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
        },
      });
      return ApiResponse.success(updated);
    } catch (error) {
      if (error instanceof z.ZodError) return ApiResponse.validation(error.errors.map(e => ({ field: e.path.join('.'), message: e.message })));
      return ApiResponse.internalError('Error actualizando producto');
    }
  })(request);
}

export async function DELETE(request: NextRequest) {
  return withAdminMiddleware(async (req) => {
    try {
      const id = req.nextUrl.pathname.split('/').pop() as string;
      await (db as any).product.delete({ where: { id } });
      return ApiResponse.success({ success: true });
    } catch (error) {
      return ApiResponse.internalError('Error eliminando producto');
    }
  })(request);
}

export async function OPTIONS() { return ApiResponse.success(null); }



