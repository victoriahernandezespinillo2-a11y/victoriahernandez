import { NextRequest } from 'next/server';
import { withStaffMiddleware, ApiResponse } from '@/lib/middleware';
import { OrderQuerySchema, validateOrderStatus, VALID_ORDER_STATUSES } from '@/lib/validators/order.validator';
import { db } from '@repo/db';
import { z } from 'zod';

export async function GET(request: NextRequest) {
  return withStaffMiddleware(async (req) => {
    try {
      const { searchParams } = req.nextUrl;
      
      // Validar parámetros de consulta
      const query = OrderQuerySchema.parse(Object.fromEntries(searchParams.entries()));
      
      const skip = (query.page - 1) * query.limit;
      
      // Construir filtros dinámicamente
      const whereClause: any = {};
      
      if (query.status) {
        // Validar que el estado sea válido
        if (!validateOrderStatus(query.status)) {
          return ApiResponse.badRequest(`Estado de orden inválido: ${query.status}. Estados válidos: ${Object.values(VALID_ORDER_STATUSES).join(', ')}`);
        }
        whereClause.status = query.status;
      }
      
      if (query.userId) {
        whereClause.userId = query.userId;
      }
      
      // Filtros de fecha
      if (query.startDate || query.endDate) {
        whereClause.createdAt = {};
        if (query.startDate) {
          whereClause.createdAt.gte = new Date(query.startDate);
        }
        if (query.endDate) {
          whereClause.createdAt.lte = new Date(query.endDate);
        }
      }
      
      // Configurar ordenamiento
      const orderBy: any = {};
      if (query.sortBy) {
        orderBy[query.sortBy] = query.sortOrder;
      } else {
        orderBy.createdAt = 'desc';
      }
      
      const [items, total] = await Promise.all([
        db.order.findMany({
          where: whereClause,
          orderBy,
          skip,
          take: query.limit,
          select: {
            id: true,
            userId: true,
            status: true,
            totalEuro: true,
            creditsUsed: true,
            paymentMethod: true,
            createdAt: true,
            user: { select: { id: true, email: true, name: true } }, 
            items: { 
              include: { 
                product: { 
                  select: { 
                    id: true,
                    name: true, 
                    priceEuro: true,
                    sku: true,
                    category: true,
                    requiresCheckIn: true
                  } 
                } 
              } 
            } 
          },
        }),
        db.order.count({ where: whereClause }),
      ]);
      
      return ApiResponse.success({ 
        items, 
        pagination: { 
          page: query.page, 
          limit: query.limit, 
          total, 
          pages: Math.ceil(total / query.limit),
          hasNext: query.page * query.limit < total,
          hasPrev: query.page > 1
        } 
      });
    } catch (error) {
      console.error('Error en /api/admin/orders:', error);
      
      if (error instanceof z.ZodError) {
        return ApiResponse.validation(
          error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          }))
        );
      }
      
      return ApiResponse.internalError(`Error listando pedidos: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  })(request);
}

export async function OPTIONS() { return ApiResponse.success(null); }








