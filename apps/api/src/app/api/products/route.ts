import { NextRequest } from 'next/server';
import { z } from 'zod';
import { withPublicMiddleware, ApiResponse } from '@/lib/middleware';
import { productService } from '../../../lib/services/product.service';

const QuerySchema = z.object({
  centerId: z.string().optional(),
  search: z.string().optional(),
  category: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export async function GET(request: NextRequest) {
  return withPublicMiddleware(async (req) => {
    try {
      console.log('🔍 [PRODUCTS] Iniciando GET /api/products');
      const params = Object.fromEntries(req.nextUrl.searchParams.entries());
      console.log('🔍 [PRODUCTS] Params recibidos:', params);
      
      const q = QuerySchema.parse(params);
      console.log('🔍 [PRODUCTS] Params validados:', q);
      
      const data = await productService.listActive(q);
      console.log('🔍 [PRODUCTS] Datos obtenidos:', { 
        itemsCount: data.items?.length || 0, 
        pagination: data.pagination 
      });
      
      return ApiResponse.success(data);
    } catch (error) {
      console.error('❌ [PRODUCTS] Error listando productos:', error);
      if (error instanceof z.ZodError) {
        return ApiResponse.validation(error.errors.map(err => ({ field: err.path.join('.'), message: err.message })));
      }
      return ApiResponse.internalError('Error interno del servidor');
    }
  })(request);
}

export async function OPTIONS() {
  return ApiResponse.success(null);
}


