/**
 * API Admin: Historial de emails enviados
 * GET /api/admin/emails/sent - Obtener lista de emails enviados con filtros
 */

import { NextRequest } from 'next/server';
import { withAdminMiddleware, ApiResponse } from '@/lib/middleware';
import { db } from '@repo/db';
import { z } from 'zod';

const GetSentEmailsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  eventType: z.enum(['EMAIL_SENT', 'EMAIL_FAILED']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  sortBy: z.enum(['createdAt', 'eventType']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export async function GET(request: NextRequest) {
  return withAdminMiddleware(async (req) => {
    try {
      const { searchParams } = req.nextUrl;
      const params = GetSentEmailsQuerySchema.parse(Object.fromEntries(searchParams.entries()));
      
      const skip = (params.page - 1) * params.limit;
      
      // Construir filtros
      const where: any = {
        eventType: { in: ['EMAIL_SENT', 'EMAIL_FAILED'] },
      };
      
      if (params.eventType) {
        where.eventType = params.eventType;
      }
      
      if (params.startDate || params.endDate) {
        where.createdAt = {};
        if (params.startDate) {
          where.createdAt.gte = new Date(params.startDate);
        }
        if (params.endDate) {
          where.createdAt.lte = new Date(params.endDate);
        }
      }
      
      // Obtener todos los emails (necesitamos filtrar por JSON después)
      const allEmails = await db.outboxEvent.findMany({
        where,
        orderBy: { [params.sortBy]: params.sortOrder },
      });
      
      // Filtrar por búsqueda en JSON si existe
      let filteredEmails = allEmails;
      if (params.search) {
        const searchTerm = params.search.trim().toLowerCase();
        filteredEmails = allEmails.filter((email: any) => {
          const eventData = email.eventData as any;
          const to = (eventData?.to || '').toLowerCase();
          const subject = (eventData?.subject || '').toLowerCase();
          return to.includes(searchTerm) || subject.includes(searchTerm);
        });
      }
      
      // Obtener total para paginación
      const total = filteredEmails.length;
      
      // Aplicar paginación
      const emails = filteredEmails.slice(skip, skip + params.limit);
      
      // Formatear respuesta
      const formatted = emails.map((email: any) => {
        const eventData = email.eventData as any;
        return {
          id: email.id,
          eventType: email.eventType,
          to: eventData?.to || 'N/A',
          subject: eventData?.subject || 'Sin asunto',
          messageId: eventData?.messageId || null,
          provider: eventData?.provider || 'smtp',
          error: eventData?.error || null,
          success: email.eventType === 'EMAIL_SENT',
          createdAt: email.createdAt,
          processed: email.processed,
          processedAt: email.processedAt,
        };
      });
      
      return ApiResponse.success({
        emails: formatted,
        pagination: {
          page: params.page,
          limit: params.limit,
          total,
          totalPages: Math.ceil(total / params.limit),
        },
      });
    } catch (error) {
      console.error('Admin GET sent emails error:', error);
      return ApiResponse.internalError('Error al obtener historial de emails');
    }
  })(request);
}

export async function OPTIONS() {
  return ApiResponse.success(null);
}

