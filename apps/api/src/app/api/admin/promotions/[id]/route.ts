import { NextRequest } from 'next/server';
import { withAdminMiddleware } from '@/lib/middleware';
import { ApiResponse } from '@/lib/utils/api-response';
import { db } from '@repo/db';

/**
 * DELETE - Eliminar promoción
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log('🔄 [DELETE-PROMOTION] Endpoint DELETE llamado');
  console.log('🔄 [DELETE-PROMOTION] Request URL:', request.url);
  console.log('🔄 [DELETE-PROMOTION] Params:', params);
  
  return withAdminMiddleware(async (req) => {
    try {
      const { id } = await params;
      console.log('🔄 [DELETE-PROMOTION] ID recibido:', id);
      console.log('🔄 [DELETE-PROMOTION] Tipo de ID:', typeof id);

      // Verificar que la promoción existe
      console.log('🔄 [DELETE-PROMOTION] Buscando promoción en base de datos...');
      const promotion = await db.promotion.findUnique({
        where: { id },
        select: { id: true, name: true, usageCount: true }
      });

      console.log('🔄 [DELETE-PROMOTION] Resultado de búsqueda:', promotion);

      if (!promotion) {
        console.log('❌ [DELETE-PROMOTION] Promoción no encontrada');
        return ApiResponse.notFound('Promoción no encontrada');
      }

      // Verificar si la promoción ha sido usada
      console.log('🔄 [DELETE-PROMOTION] Verificando uso de promoción:', promotion.usageCount);
      if (promotion.usageCount > 0) {
        console.log('❌ [DELETE-PROMOTION] Promoción ya ha sido usada');
        return ApiResponse.badRequest(
          `No se puede eliminar la promoción "${promotion.name}" porque ya ha sido utilizada ${promotion.usageCount} veces`
        );
      }

      // Eliminar la promoción
      console.log('🔄 [DELETE-PROMOTION] Procediendo a eliminar...');
      await db.promotion.delete({
        where: { id }
      });

      console.log('✅ [DELETE-PROMOTION] Promoción eliminada exitosamente:', promotion.name);

      return ApiResponse.success({ deleted: true, id: promotion.id }, 'Promoción eliminada exitosamente');

    } catch (error) {
      console.error('❌ [DELETE-PROMOTION] Error capturado:', error);
      
      if (error instanceof Error) {
        console.error('❌ [DELETE-PROMOTION] Stack trace:', error.stack);
        console.error('❌ [DELETE-PROMOTION] Error name:', error.name);
        console.error('❌ [DELETE-PROMOTION] Error message:', error.message);
      }

      return ApiResponse.internalError('Error interno del servidor');
    }
  })(request);
}

/**
 * PUT - Actualizar promoción
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log('🔄 [UPDATE-PROMOTION] Endpoint PUT llamado');
  console.log('🔄 [UPDATE-PROMOTION] Request URL:', request.url);
  console.log('🔄 [UPDATE-PROMOTION] Params:', params);
  
  return withAdminMiddleware(async (req) => {
    try {
      const { id } = await params;
      const body = await req.json();
      
      console.log('🔄 [UPDATE-PROMOTION] Actualizando promoción:', id);
      console.log('🔄 [UPDATE-PROMOTION] Datos recibidos:', body);

      // Verificar que la promoción existe
      const existingPromotion = await db.promotion.findUnique({
        where: { id },
        select: { id: true, name: true }
      });

      if (!existingPromotion) {
        console.log('❌ [UPDATE-PROMOTION] Promoción no encontrada');
        return ApiResponse.notFound('Promoción no encontrada');
      }

      // Preparar datos para actualización (solo campos que existen)
      const updateData: any = {
        updatedAt: new Date()
      };

      // Solo actualizar campos que se envían
      if (body.name !== undefined) updateData.name = body.name;
      if (body.code !== undefined) updateData.code = body.code?.toUpperCase();
      if (body.type !== undefined) updateData.type = body.type;
      if (body.status !== undefined) updateData.status = body.status;
      if (body.conditions !== undefined) updateData.conditions = body.conditions;
      if (body.rewards !== undefined) updateData.rewards = body.rewards;
      if (body.validFrom !== undefined) updateData.validFrom = body.validFrom ? new Date(body.validFrom) : undefined;
      if (body.validTo !== undefined) updateData.validTo = body.validTo ? new Date(body.validTo) : undefined;
      if (body.usageLimit !== undefined) updateData.usageLimit = body.usageLimit;

      console.log('🔄 [UPDATE-PROMOTION] Datos a actualizar:', updateData);

      // Actualizar la promoción
      const updatedPromotion = await db.promotion.update({
        where: { id },
        data: updateData
      });

      console.log('✅ [UPDATE-PROMOTION] Promoción actualizada:', updatedPromotion.name);

      return ApiResponse.success(updatedPromotion, 'Promoción actualizada exitosamente');

    } catch (error) {
      console.error('❌ [UPDATE-PROMOTION] Error capturado:', error);
      
      if (error instanceof Error) {
        console.error('❌ [UPDATE-PROMOTION] Stack trace:', error.stack);
        console.error('❌ [UPDATE-PROMOTION] Error name:', error.name);
        console.error('❌ [UPDATE-PROMOTION] Error message:', error.message);
      }

      return ApiResponse.internalError('Error interno del servidor');
    }
  })(request);
}