import { NextRequest } from 'next/server';
import { withPublicMiddleware, ApiResponse } from '@/lib/middleware';

export async function GET(request: NextRequest) {
  return withPublicMiddleware(async (req) => {
    try {
      return ApiResponse.success({
        message: 'API de productos funcionando correctamente',
        timestamp: new Date().toISOString(),
        endpoint: '/api/test-products'
      });
    } catch (error) {
      console.error('Error en test-products:', error);
      return ApiResponse.internalError('Error interno del servidor');
    }
  })(request);
}

export async function OPTIONS() {
  return ApiResponse.success(null);
}




