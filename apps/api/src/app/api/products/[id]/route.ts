import { NextRequest } from 'next/server';
import { withPublicMiddleware, ApiResponse } from '@/lib/middleware';
import { productService } from '../../../../lib/services/product.service';

export async function GET(request: NextRequest) {
  return withPublicMiddleware(async (req) => {
    try {
      const id = req.nextUrl.pathname.split('/').pop() as string;
      const product = await productService.detail(id);
      return ApiResponse.success(product);
    } catch (error) {
      return ApiResponse.notFound('Producto');
    }
  })(request);
}

export async function OPTIONS() {
  return ApiResponse.success(null);
}


