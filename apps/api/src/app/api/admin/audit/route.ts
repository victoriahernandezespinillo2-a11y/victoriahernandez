/**
 * API Routes para logs de auditoría
 * GET /api/admin/audit - Obtener logs de auditoría del sistema
 */

import { NextRequest } from 'next/server';
import { withAdminMiddleware, ApiResponse } from '@/lib/middleware';
import { db } from '@repo/db';
import { z } from 'zod';

const GetAuditLogsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  action: z.string().optional(),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  userId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  search: z.string().optional(),
  sortBy: z.enum(['createdAt', 'action', 'entityType', 'userId']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});

/**
 * GET /api/admin/audit
 * Obtener logs de auditoría del sistema usando OutboxEvent como fuente
 * Acceso: ADMIN únicamente
 */
export async function GET(request: NextRequest) {
  return withAdminMiddleware(async (req) => {
    try {
      const { searchParams } = req.nextUrl;
      const queryParams = GetAuditLogsQuerySchema.parse(Object.fromEntries(searchParams.entries()));
      
      const skip = (queryParams.page - 1) * queryParams.limit;
      
      // Construir filtros para OutboxEvent
      const where: any = {};
      
      if (queryParams.action) {
        where.eventType = {
          contains: queryParams.action,
          mode: 'insensitive'
        };
      }
      
      if (queryParams.startDate || queryParams.endDate) {
        where.createdAt = {};
        if (queryParams.startDate) {
          where.createdAt.gte = new Date(queryParams.startDate);
        }
        if (queryParams.endDate) {
          where.createdAt.lte = new Date(queryParams.endDate);
        }
      }
      
      if (queryParams.search) {
        where.OR = [
          {
            eventType: {
              contains: queryParams.search,
              mode: 'insensitive'
            }
          }
        ];
      }
      
      // Obtener eventos del sistema como logs de auditoría
      const [auditLogs, total] = await Promise.all([
        db.outboxEvent.findMany({
          where,
          skip,
          take: queryParams.limit,
          orderBy: {
            createdAt: queryParams.sortOrder
          }
        }),
        db.outboxEvent.count({ where })
      ]);
      
      // Obtener estadísticas adicionales
      const stats = await getAuditStats(where);
      
      const totalPages = Math.ceil(total / queryParams.limit);
      
      return ApiResponse.success({
        auditLogs: auditLogs.map((event: any) => ({
          id: event.id,
          action: event.eventType,
          entityType: extractEntityType(event.eventData),
          entityId: extractEntityId(event.eventData),
          details: event.eventData,
          ipAddress: null, // No disponible en OutboxEvent
          userAgent: null, // No disponible en OutboxEvent
          createdAt: event.createdAt,
          user: extractUserInfo(event.eventData)
        })),
        pagination: {
          page: queryParams.page,
          limit: queryParams.limit,
          total,
          totalPages,
          hasNext: queryParams.page < totalPages,
          hasPrev: queryParams.page > 1
        },
        stats
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return ApiResponse.validation(
          error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          }))
        );
      }
      
      console.error('Error obteniendo logs de auditoría:', error);
      return ApiResponse.internalError('Error interno del servidor');
    }
  })(request, {} as any);
}

/**
 * Obtener estadísticas de auditoría usando OutboxEvent
 */
async function getAuditStats(baseWhere: any) {
  try {
    const [actionStats, recentActivity] = await Promise.all([
      // Estadísticas por tipo de evento
      db.outboxEvent.groupBy({
        by: ['eventType'],
        where: baseWhere,
        _count: {
          eventType: true
        },
        orderBy: {
          _count: {
            eventType: 'desc'
          }
        },
        take: 10
      }),
      // Actividad reciente (últimas 24 horas)
      db.outboxEvent.count({
        where: {
          ...baseWhere,
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        }
      })
    ]);
    
    return {
      byAction: actionStats.map((stat: any) => ({
        action: stat.eventType,
        count: stat._count.eventType
      })),
      byEntityType: [], // No disponible en OutboxEvent
      byUser: [], // No disponible en OutboxEvent
      recentActivity
    };
  } catch (error) {
    console.error('Error obteniendo estadísticas de auditoría:', error);
    return {
      byAction: [],
      byEntityType: [],
      byUser: [],
      recentActivity: 0
    };
  }
}

/**
 * Extrae el tipo de entidad del eventData
 */
function extractEntityType(eventData: any): string | null {
  if (typeof eventData === 'object' && eventData !== null) {
    // Intentar extraer el tipo de entidad basado en las claves del objeto
    if (eventData.userId) return 'user';
    if (eventData.courtId) return 'court';
    if (eventData.reservationId) return 'reservation';
    if (eventData.centerId) return 'center';
    if (eventData.tournamentId) return 'tournament';
  }
  return null;
}

/**
 * Extrae el ID de entidad del eventData
 */
function extractEntityId(eventData: any): string | null {
  if (typeof eventData === 'object' && eventData !== null) {
    return eventData.userId || eventData.courtId || eventData.reservationId || 
           eventData.centerId || eventData.tournamentId || null;
  }
  return null;
}

/**
 * Extrae información del usuario del eventData
 */
function extractUserInfo(eventData: any): any {
  if (typeof eventData === 'object' && eventData !== null) {
    if (eventData.userId && eventData.email) {
      return {
        id: eventData.userId,
        name: eventData.name || 'Usuario',
        email: eventData.email,
        role: eventData.role || 'user'
      };
    }
  }
  return null;
}

/**
 * OPTIONS /api/admin/audit
 * Manejar preflight requests
 */
export async function OPTIONS() {
  return ApiResponse.success(null);
}