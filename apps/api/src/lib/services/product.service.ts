import { db } from '@repo/db';
import type { Prisma } from '@prisma/client';

export class ProductService {
  async listActive(params: { centerId?: string; search?: string; category?: string; page?: number; limit?: number }) {
    try {
      console.log('🔍 [ProductService] Iniciando listActive con params:', params);
      
      const { centerId, search, category } = params;
      const page = Math.max(1, Number(params.page || 1));
      const limit = Math.min(100, Math.max(1, Number(params.limit || 20)));
      const skip = (page - 1) * limit;

      let where: Prisma.ProductWhereInput = { isActive: true, stockQty: { gt: 0 } };
      if (centerId) where.centerId = centerId;
      if (category) where.category = { contains: category, mode: 'insensitive' };
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { sku: { contains: search, mode: 'insensitive' } },
          { category: { contains: search, mode: 'insensitive' } },
        ];
      }

      console.log('🔍 [ProductService] Query where:', JSON.stringify(where, null, 2));
      console.log('🔍 [ProductService] Pagination:', { page, limit, skip });

      const [items, total] = await Promise.all([
        db.product.findMany({ where, skip, take: limit, orderBy: { updatedAt: 'desc' } }),
        db.product.count({ where }),
      ]);

      console.log('🔍 [ProductService] Resultados:', { itemsCount: items.length, total });

      return { items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
    } catch (error) {
      console.error('❌ [ProductService] Error en listActive:', error);
      throw error;
    }
  }

  async detail(id: string) {
    try {
      console.log('🔍 [ProductService] Iniciando detail para id:', id);
      
      const product = await db.product.findUnique({ where: { id } });
      console.log('🔍 [ProductService] Producto encontrado:', product ? 'Sí' : 'No');
      
      if (!product || !product.isActive || (product.stockQty || 0) <= 0) {
        throw new Error('Producto no disponible');
      }
      return product;
    } catch (error) {
      console.error('❌ [ProductService] Error en detail:', error);
      throw error;
    }
  }
}

export const productService = new ProductService();


