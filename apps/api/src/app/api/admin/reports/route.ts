/**
 * API Routes para reportes de administración
 * GET /api/admin/reports - Generar reportes del sistema
 * POST /api/admin/reports - Crear reporte personalizado
 */

import { NextRequest } from 'next/server';
import { withAdminMiddleware, ApiResponse } from '@/lib/middleware';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

const GetReportsQuerySchema = z.object({
  type: z.enum([
    'revenue',
    'usage',
    'users',
    'courts',
    'maintenance',
    'memberships',
    'tournaments',
    'payments'
  ]),
  period: z.enum(['7d', '30d', '90d', '1y', 'custom']).default('30d'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  centerId: z.string().optional(),
  format: z.enum(['json', 'csv', 'pdf']).default('json'),
  groupBy: z.enum(['day', 'week', 'month']).default('day')
});

const CreateReportSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  description: z.string().optional(),
  type: z.enum([
    'revenue',
    'usage',
    'users',
    'courts',
    'maintenance',
    'memberships',
    'tournaments',
    'payments'
  ]),
  filters: z.object({
    period: z.enum(['7d', '30d', '90d', '1y', 'custom']).default('30d'),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    centerId: z.string().optional(),
    groupBy: z.enum(['day', 'week', 'month']).default('day')
  }),
  schedule: z.object({
    frequency: z.enum(['once', 'daily', 'weekly', 'monthly']).default('once'),
    time: z.string().optional(),
    dayOfWeek: z.number().int().min(0).max(6).optional(),
    dayOfMonth: z.number().int().min(1).max(31).optional()
  }).optional(),
  recipients: z.array(z.string().email()).optional().default([])
});

/**
 * GET /api/admin/reports
 * Generar reportes del sistema
 * Acceso: ADMIN únicamente
 */
export async function GET(request: NextRequest) {
  return withAdminMiddleware(async (req) => {
    try {
      const { searchParams } = req.nextUrl;
      const params = GetReportsQuerySchema.parse(Object.fromEntries(searchParams.entries()));
      
      // Calcular fechas
      const { startDate, endDate } = calculateDateRange(params);
      
      let reportData = {};
      
      switch (params.type) {
        case 'revenue':
          reportData = await generateRevenueReport(startDate, endDate, params.centerId, params.groupBy);
          break;
        case 'usage':
          reportData = await generateUsageReport(startDate, endDate, params.centerId, params.groupBy);
          break;
        case 'users':
          reportData = await generateUsersReport(startDate, endDate, params.groupBy);
          break;
        case 'courts':
          reportData = await generateCourtsReport(startDate, endDate, params.centerId);
          break;
        case 'maintenance':
          reportData = await generateMaintenanceReport(startDate, endDate, params.centerId);
          break;
        case 'memberships':
          reportData = await generateMembershipsReport(startDate, endDate, params.centerId);
          break;
        case 'tournaments':
          reportData = await generateTournamentsReport(startDate, endDate, params.centerId);
          break;
        case 'payments':
          reportData = await generatePaymentsReport(startDate, endDate, params.centerId, params.groupBy);
          break;
      }
      
      const report = {
        type: params.type,
        period: params.period,
        dateRange: {
          start: startDate.toISOString(),
          end: endDate.toISOString()
        },
        centerId: params.centerId,
        groupBy: params.groupBy,
        data: reportData,
        generatedAt: new Date().toISOString(),
        format: params.format
      };
      
      // TODO: Implementar conversión a CSV/PDF si se solicita
      if (params.format === 'csv') {
        // Convertir a CSV
        return new Response(convertToCSV(reportData), {
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="${params.type}_report_${new Date().toISOString().split('T')[0]}.csv"`
          }
        });
      }
      
      return ApiResponse.success(report);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return ApiResponse.validation(
          error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          }))
        );
      }
      
      console.error('Error generando reporte:', error);
      return ApiResponse.internalError('Error interno del servidor');
    }
  })(request);
}

/**
 * POST /api/admin/reports
 * Crear reporte personalizado programado
 * Acceso: ADMIN únicamente
 */
export async function POST(request: NextRequest) {
  return withAdminMiddleware(async (req, { user }) => {
    try {
      const body = await req.json();
      const reportData = CreateReportSchema.parse(body);
      
      // Crear reporte programado
      const newReport = await prisma.scheduledReport.create({
        data: {
          ...reportData,
          createdBy: user.id,
          status: 'ACTIVE'
        },
        select: {
          id: true,
          name: true,
          description: true,
          type: true,
          filters: true,
          schedule: true,
          recipients: true,
          status: true,
          createdAt: true,
          createdBy: true
        }
      });
      
      return ApiResponse.success(newReport);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return ApiResponse.validation(
          error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          }))
        );
      }
      
      console.error('Error creando reporte programado:', error);
      return ApiResponse.internalError('Error interno del servidor');
    }
  })(request);
}

// Funciones auxiliares para generar diferentes tipos de reportes

function calculateDateRange(params: any) {
  const now = new Date();
  let startDate = new Date();
  let endDate = now;
  
  if (params.period === 'custom' && params.startDate && params.endDate) {
    startDate = new Date(params.startDate);
    endDate = new Date(params.endDate);
  } else {
    switch (params.period) {
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
    }
  }
  
  return { startDate, endDate };
}

async function generateRevenueReport(startDate: Date, endDate: Date, centerId?: string, groupBy: string = 'day') {
  const baseFilter = {
    createdAt: { gte: startDate, lte: endDate },
    status: 'COMPLETED' as const,
    ...(centerId && { centerId })
  };
  
  const [totalRevenue, revenueByType, revenueByPeriod] = await Promise.all([
    prisma.payment.aggregate({
      where: baseFilter,
      _sum: { amount: true },
      _count: { id: true }
    }),
    
    prisma.payment.groupBy({
      by: ['type'],
      where: baseFilter,
      _sum: { amount: true },
      _count: { id: true }
    }),
    
    prisma.payment.groupBy({
      by: ['createdAt'],
      where: baseFilter,
      _sum: { amount: true },
      _count: { id: true }
    })
  ]);
  
  return {
    summary: {
      totalRevenue: totalRevenue._sum.amount || 0,
      totalTransactions: totalRevenue._count.id
    },
    byType: revenueByType,
    byPeriod: revenueByPeriod
  };
}

async function generateUsageReport(startDate: Date, endDate: Date, centerId?: string, groupBy: string = 'day') {
  const baseFilter = {
    createdAt: { gte: startDate, lte: endDate },
    ...(centerId && { centerId })
  };
  
  const [totalReservations, reservationsBySport, reservationsByStatus] = await Promise.all([
    prisma.reservation.count({ where: baseFilter }),
    
    prisma.reservation.groupBy({
      by: ['court'],
      where: baseFilter,
      _count: { id: true }
    }),
    
    prisma.reservation.groupBy({
      by: ['status'],
      where: baseFilter,
      _count: { id: true }
    })
  ]);
  
  return {
    summary: {
      totalReservations
    },
    bySport: reservationsBySport,
    byStatus: reservationsByStatus
  };
}

async function generateUsersReport(startDate: Date, endDate: Date, groupBy: string = 'day') {
  const baseFilter = {
    createdAt: { gte: startDate, lte: endDate }
  };
  
  const [totalUsers, usersByRole, usersByStatus] = await Promise.all([
    prisma.user.count({ where: baseFilter }),
    
    prisma.user.groupBy({
      by: ['role'],
      where: baseFilter,
      _count: { id: true }
    }),
    
    prisma.user.groupBy({
      by: ['status'],
      where: baseFilter,
      _count: { id: true }
    })
  ]);
  
  return {
    summary: {
      totalUsers
    },
    byRole: usersByRole,
    byStatus: usersByStatus
  };
}

async function generateCourtsReport(startDate: Date, endDate: Date, centerId?: string) {
  const where = centerId ? { centerId } : {};
  
  const [totalCourts, courtsBySport, courtsByStatus] = await Promise.all([
    prisma.court.count({ where }),
    
    prisma.court.groupBy({
      by: ['sport'],
      where,
      _count: { id: true }
    }),
    
    prisma.court.groupBy({
      by: ['status'],
      where,
      _count: { id: true }
    })
  ]);
  
  return {
    summary: {
      totalCourts
    },
    bySport: courtsBySport,
    byStatus: courtsByStatus
  };
}

async function generateMaintenanceReport(startDate: Date, endDate: Date, centerId?: string) {
  const baseFilter = {
    createdAt: { gte: startDate, lte: endDate },
    ...(centerId && { court: { centerId } })
  };
  
  const [totalMaintenances, maintenancesByStatus, maintenancesByType] = await Promise.all([
    prisma.maintenance.count({ where: baseFilter }),
    
    prisma.maintenance.groupBy({
      by: ['status'],
      where: baseFilter,
      _count: { id: true }
    }),
    
    prisma.maintenance.groupBy({
      by: ['type'],
      where: baseFilter,
      _count: { id: true }
    })
  ]);
  
  return {
    summary: {
      totalMaintenances
    },
    byStatus: maintenancesByStatus,
    byType: maintenancesByType
  };
}

async function generateMembershipsReport(startDate: Date, endDate: Date, centerId?: string) {
  const baseFilter = {
    createdAt: { gte: startDate, lte: endDate },
    ...(centerId && { centerId })
  };
  
  const [totalMemberships, membershipsByStatus, membershipsByType] = await Promise.all([
    prisma.membership.count({ where: baseFilter }),
    
    prisma.membership.groupBy({
      by: ['status'],
      where: baseFilter,
      _count: { id: true }
    }),
    
    prisma.membership.groupBy({
      by: ['type'],
      where: baseFilter,
      _count: { id: true }
    })
  ]);
  
  return {
    summary: {
      totalMemberships
    },
    byStatus: membershipsByStatus,
    byType: membershipsByType
  };
}

async function generateTournamentsReport(startDate: Date, endDate: Date, centerId?: string) {
  const baseFilter = {
    createdAt: { gte: startDate, lte: endDate },
    ...(centerId && { centerId })
  };
  
  const [totalTournaments, tournamentsByStatus, tournamentsBySport] = await Promise.all([
    prisma.tournament.count({ where: baseFilter }),
    
    prisma.tournament.groupBy({
      by: ['status'],
      where: baseFilter,
      _count: { id: true }
    }),
    
    prisma.tournament.groupBy({
      by: ['sport'],
      where: baseFilter,
      _count: { id: true }
    })
  ]);
  
  return {
    summary: {
      totalTournaments
    },
    byStatus: tournamentsByStatus,
    bySport: tournamentsBySport
  };
}

async function generatePaymentsReport(startDate: Date, endDate: Date, centerId?: string, groupBy: string = 'day') {
  const baseFilter = {
    createdAt: { gte: startDate, lte: endDate },
    ...(centerId && { centerId })
  };
  
  const [totalPayments, paymentsByStatus, paymentsByMethod] = await Promise.all([
    prisma.payment.aggregate({
      where: baseFilter,
      _sum: { amount: true },
      _count: { id: true }
    }),
    
    prisma.payment.groupBy({
      by: ['status'],
      where: baseFilter,
      _sum: { amount: true },
      _count: { id: true }
    }),
    
    prisma.payment.groupBy({
      by: ['method'],
      where: baseFilter,
      _sum: { amount: true },
      _count: { id: true }
    })
  ]);
  
  return {
    summary: {
      totalAmount: totalPayments._sum.amount || 0,
      totalPayments: totalPayments._count.id
    },
    byStatus: paymentsByStatus,
    byMethod: paymentsByMethod
  };
}

function convertToCSV(data: any): string {
  // Implementación básica de conversión a CSV
  // En una implementación real, esto sería más sofisticado
  return JSON.stringify(data);
}

/**
 * OPTIONS /api/admin/reports
 * Manejar preflight requests
 */
export async function OPTIONS() {
  return ApiResponse.success(null);
}