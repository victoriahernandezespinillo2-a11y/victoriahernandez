import { NextRequest } from 'next/server';
import { withPublicMiddleware, ApiResponse } from '@/lib/middleware';
import { db } from '@repo/db';

export async function GET(request: NextRequest) {
  return withPublicMiddleware(async (req) => {
    try {
      console.log('🔍 [TEST-DB] Iniciando prueba de conexión a BD');
      
      // Probar conexión básica
      const result = await db.$queryRaw`SELECT 1 as test`;
      console.log('🔍 [TEST-DB] Query básica exitosa:', result);
      
      // Probar contar productos
      const productCount = await db.product.count();
      console.log('🔍 [TEST-DB] Total productos en BD:', productCount);
      
      // Probar obtener algunos productos
      const products = await db.product.findMany({
        take: 5,
        select: { id: true, name: true, isActive: true, stockQty: true }
      });
      console.log('🔍 [TEST-DB] Productos encontrados:', products.length);
      
      return ApiResponse.success({
        message: 'Conexión a base de datos exitosa',
        timestamp: new Date().toISOString(),
        productCount,
        sampleProducts: products,
        databaseUrl: process.env.DATABASE_URL ? 'Configurada' : 'No configurada'
      });
    } catch (error) {
      console.error('❌ [TEST-DB] Error en prueba de BD:', error);
      return ApiResponse.error('Error de conexión a base de datos', 500, {
        error: error instanceof Error ? error.message : 'Error desconocido',
        timestamp: new Date().toISOString()
      });
    }
  })(request);
}

export async function OPTIONS() {
  return ApiResponse.success(null);
}




