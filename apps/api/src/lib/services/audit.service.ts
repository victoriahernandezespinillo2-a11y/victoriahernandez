/**
 * Servicio de Auditoría Enterprise
 * Maneja el registro, consulta y análisis de logs de auditoría
 */

import { db } from '@repo/db';
import { z } from 'zod';

// Esquemas de validación
export const CreateAuditLogSchema = z.object({
  userId: z.string().optional(),
  userName: z.string().min(1, 'El nombre de usuario es requerido'),
  userEmail: z.string().email().optional(),
  userRole: z.string().optional(),
  action: z.string().min(1, 'La acción es requerida'),
  resource: z.string().optional(),
  resourceId: z.string().optional(),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  details: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  sessionId: z.string().optional(),
  status: z.enum(['SUCCESS', 'WARNING', 'ERROR', 'FAILED']).default('SUCCESS'),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('LOW'),
  category: z.enum([
    'AUTHENTICATION', 'AUTHORIZATION', 'DATA_ACCESS', 'DATA_MODIFICATION',
    'SYSTEM', 'SECURITY', 'PAYMENT', 'RESERVATION', 'USER_MANAGEMENT',
    'CONFIGURATION', 'MAINTENANCE', 'API', 'EXTERNAL'
  ]).default('SYSTEM'),
  tags: z.array(z.string()).default([]),
  duration: z.number().int().positive().optional(),
  errorCode: z.string().optional(),
  errorMessage: z.string().optional()
});

export const GetAuditLogsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(1000).default(50),
  userId: z.string().optional(),
  action: z.string().optional(),
  resource: z.string().optional(),
  status: z.enum(['SUCCESS', 'WARNING', 'ERROR', 'FAILED']).optional(),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  category: z.enum([
    'AUTHENTICATION', 'AUTHORIZATION', 'DATA_ACCESS', 'DATA_MODIFICATION',
    'SYSTEM', 'SECURITY', 'PAYMENT', 'RESERVATION', 'USER_MANAGEMENT',
    'CONFIGURATION', 'MAINTENANCE', 'API', 'EXTERNAL'
  ]).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  search: z.string().optional(),
  tags: z.array(z.string()).optional(),
  sortBy: z.enum(['timestamp', 'action', 'resource', 'userId', 'status', 'severity']).default('timestamp'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});

export type CreateAuditLogData = z.infer<typeof CreateAuditLogSchema>;
export type GetAuditLogsQuery = z.infer<typeof GetAuditLogsQuerySchema>;

// Tipo para los logs de auditoría
export interface AuditLog {
  id: string;
  timestamp: Date;
  userId?: string;
  userName: string;
  userEmail?: string;
  userRole?: string;
  action: string;
  resource?: string;
  resourceId?: string;
  entityType?: string;
  entityId?: string;
  status: string;
  severity: string;
  category: string;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  duration?: number;
  errorCode?: string;
  errorMessage?: string;
  details?: string;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export class AuditService {
  /**
   * Crear un nuevo log de auditoría
   */
  async createAuditLog(data: CreateAuditLogData) {
    try {
      const validatedData = CreateAuditLogSchema.parse(data);
      
      // TODO: Implementar creación real cuando el modelo AuditLog esté disponible en la base de datos
      // Por ahora, solo loggear y retornar un objeto simulado
      console.log('AuditService.createAuditLog called with data:', validatedData);
      
      return {
        id: 'temp-' + Date.now(),
        ...validatedData,
        timestamp: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };
    } catch (error) {
      console.error('Error creando log de auditoría:', error);
      throw new Error('Error interno del servidor al crear log de auditoría');
    }
  }

  /**
   * Obtener logs de auditoría con filtros avanzados
   */
  async getAuditLogs(query: GetAuditLogsQuery) {
    try {
      const validatedQuery = GetAuditLogsQuerySchema.parse(query);
      const skip = (validatedQuery.page - 1) * validatedQuery.limit;
      
      // Construir filtros
      const where: any = {};
      
      if (validatedQuery.userId) {
        where.userId = validatedQuery.userId;
      }
      
      if (validatedQuery.action) {
        where.action = {
          contains: validatedQuery.action,
          mode: 'insensitive'
        };
      }
      
      if (validatedQuery.resource) {
        where.resource = validatedQuery.resource;
      }
      
      if (validatedQuery.status) {
        where.status = validatedQuery.status;
      }
      
      if (validatedQuery.severity) {
        where.severity = validatedQuery.severity;
      }
      
      if (validatedQuery.category) {
        where.category = validatedQuery.category;
      }
      
      if (validatedQuery.startDate || validatedQuery.endDate) {
        where.timestamp = {};
        if (validatedQuery.startDate) {
          where.timestamp.gte = new Date(validatedQuery.startDate);
        }
        if (validatedQuery.endDate) {
          where.timestamp.lte = new Date(validatedQuery.endDate);
        }
      }
      
      if (validatedQuery.search) {
        where.OR = [
          { userName: { contains: validatedQuery.search, mode: 'insensitive' } },
          { action: { contains: validatedQuery.search, mode: 'insensitive' } },
          { resource: { contains: validatedQuery.search, mode: 'insensitive' } },
          { details: { contains: validatedQuery.search, mode: 'insensitive' } }
        ];
      }
      
      if (validatedQuery.tags && validatedQuery.tags.length > 0) {
        where.tags = {
          hasSome: validatedQuery.tags
        };
      }
      
      // TODO: Implementar consulta real cuando el modelo AuditLog esté disponible en la base de datos
      // Por ahora, retornar datos vacíos para evitar errores
      console.log('AuditService.getAuditLogs called with query:', validatedQuery);
      
      return {
        auditLogs: [] as AuditLog[],
        pagination: {
          page: validatedQuery.page,
          limit: validatedQuery.limit,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false
        }
      };
    } catch (error) {
      console.error('Error obteniendo logs de auditoría:', error);
      throw new Error('Error interno del servidor al obtener logs de auditoría');
    }
  }

  /**
   * Obtener estadísticas de auditoría
   */
  async getAuditStats(filters: Partial<GetAuditLogsQuery> = {}) {
    try {
      const where: any = {};
      
      if (filters.startDate || filters.endDate) {
        where.timestamp = {};
        if (filters.startDate) {
          where.timestamp.gte = new Date(filters.startDate);
        }
        if (filters.endDate) {
          where.timestamp.lte = new Date(filters.endDate);
        }
      }
      
      // TODO: Implementar consulta real cuando el modelo AuditLog esté disponible en la base de datos
      // Por ahora, retornar estadísticas vacías para evitar errores
      console.log('AuditService.getAuditStats called with filters:', filters);
      
      const totalLogs = 0;
      const statusStats: any[] = [];
      const severityStats: any[] = [];
      const categoryStats: any[] = [];
      const actionStats: any[] = [];
      const userStats: any[] = [];
      const recentActivity = 0;
      
      return {
        total: totalLogs,
        byStatus: statusStats.map(stat => ({
          status: stat.status,
          count: stat._count.status
        })),
        bySeverity: severityStats.map(stat => ({
          severity: stat.severity,
          count: stat._count.severity
        })),
        byCategory: categoryStats.map(stat => ({
          category: stat.category,
          count: stat._count.category
        })),
        byAction: actionStats.map(stat => ({
          action: stat.action,
          count: stat._count.action
        })),
        byUser: userStats.map(stat => ({
          userId: stat.userId,
          userName: stat.userName,
          count: stat._count.userId
        })),
        recentActivity
      };
    } catch (error) {
      console.error('Error obteniendo estadísticas de auditoría:', error);
      throw new Error('Error interno del servidor al obtener estadísticas');
    }
  }

  /**
   * Obtener un log de auditoría por ID
   */
  async getAuditLogById(id: string) {
    try {
      const auditLog = await db.auditLog.findUnique({
        where: { id }
      });
      
      if (!auditLog) {
        throw new Error('Log de auditoría no encontrado');
      }
      
      return auditLog;
    } catch (error) {
      console.error('Error obteniendo log de auditoría:', error);
      throw new Error('Error interno del servidor al obtener log de auditoría');
    }
  }

  /**
   * Eliminar logs de auditoría antiguos (retención de datos)
   */
  async cleanupOldLogs(retentionDays: number = 365) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
      
      const result = await db.auditLog.deleteMany({
        where: {
          timestamp: {
            lt: cutoffDate
          }
        }
      });
      
      return {
        deletedCount: result.count,
        cutoffDate
      };
    } catch (error) {
      console.error('Error limpiando logs antiguos:', error);
      throw new Error('Error interno del servidor al limpiar logs antiguos');
    }
  }

  /**
   * Exportar logs de auditoría para análisis
   */
  async exportAuditLogs(query: GetAuditLogsQuery, format: 'json' | 'csv' = 'json') {
    try {
      const result = await this.getAuditLogs({
        ...query,
        limit: 10000 // Límite para exportación
      });
      const auditLogs = result.auditLogs || [];
      
      if (format === 'csv') {
        const headers = [
          'ID', 'Timestamp', 'User ID', 'User Name', 'User Email', 'User Role',
          'Action', 'Resource', 'Resource ID', 'Entity Type', 'Entity ID',
          'Status', 'Severity', 'Category', 'IP Address', 'User Agent',
          'Session ID', 'Duration', 'Error Code', 'Error Message', 'Details'
        ];
        
        const csvRows = [
          headers.join(','),
          ...auditLogs.map(log => [
            log.id,
            log.timestamp.toISOString(),
            log.userId || '',
            log.userName,
            log.userEmail || '',
            log.userRole || '',
            log.action,
            log.resource || '',
            log.resourceId || '',
            log.entityType || '',
            log.entityId || '',
            log.status,
            log.severity,
            log.category,
            log.ipAddress || '',
            log.userAgent || '',
            log.sessionId || '',
            log.duration || '',
            log.errorCode || '',
            log.errorMessage || '',
            log.details || ''
          ].map(field => `"${field}"`).join(','))
        ];
        
        return csvRows.join('\n');
      }
      
      return auditLogs;
    } catch (error) {
      console.error('Error exportando logs de auditoría:', error);
      throw new Error('Error interno del servidor al exportar logs');
    }
  }
}
