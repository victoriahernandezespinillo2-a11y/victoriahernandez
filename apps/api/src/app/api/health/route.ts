/**
 * API Routes para verificación de salud del sistema
 * GET /api/health - Verificar estado del sistema
 */

import { NextRequest, NextResponse } from 'next/server';
import { withPublicMiddleware } from '../../../lib/middleware';
import { db } from '@repo/db';

export async function GET(request: NextRequest) {
  return withPublicMiddleware(async (req) => {
    const startTime = Date.now();
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
      database: {
        status: 'unknown',
        responseTime: 0,
        provider: null as string | null,
        error: null as any
      },
      auth: {
        status: 'unknown',
        nextAuthConfigured: !!process.env.NEXTAUTH_SECRET,
        nextAuthUrl: process.env.NEXTAUTH_URL || null
      },
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        external: Math.round(process.memoryUsage().external / 1024 / 1024)
      },
      version: process.env.npm_package_version || 'unknown'
    };

    try {
      // Detectar proveedor de base de datos
      const dbUrl = process.env.DATABASE_URL || process.env.DIRECT_DATABASE_URL || '';
      if (dbUrl.includes('supabase.co')) {
        health.database.provider = 'Supabase';
      } else if (dbUrl.includes('neon.tech')) {
        health.database.provider = 'Neon';
      } else if (dbUrl) {
        health.database.provider = 'PostgreSQL';
      }

      // Verificar conexión a base de datos
      const dbStartTime = Date.now();
      await db.$queryRaw`SELECT 1 as health_check`;
      const dbResponseTime = Date.now() - dbStartTime;
      
      health.database.status = 'connected';
      health.database.responseTime = dbResponseTime;
      
      // Si la respuesta es muy lenta, marcar como degradado
      if (dbResponseTime > 5000) {
        health.status = 'degraded';
        health.database.status = 'slow';
      }
      
      // Verificar que podemos acceder a usuarios (importante para autenticación)
      try {
        const userCount = await db.user.count();
        health.auth.status = 'operational';
      } catch (authError: any) {
        health.auth.status = 'error';
        health.status = 'degraded';
      }
      
    } catch (error: any) {
      health.status = 'unhealthy';
      health.database.status = 'error';
      health.database.error = {
        message: error.message,
        code: error.code,
        meta: error.meta
      };
      health.auth.status = 'error';
      
      console.error('❌ [HEALTH] Error de base de datos:', error);
    }

    // Verificar uso de memoria
    const memoryUsage = process.memoryUsage();
    if (memoryUsage.heapUsed > 500 * 1024 * 1024) { // Más de 500MB
      health.status = 'degraded';
    }

    const responseTime = Date.now() - startTime;
    const statusCode = health.status === 'healthy' ? 200 : 
                     health.status === 'degraded' ? 200 : 503;

    const response = NextResponse.json(health, { status: statusCode });
    
    // Headers para monitoreo
    response.headers.set('X-Response-Time', `${responseTime}ms`);
    response.headers.set('X-Health-Status', health.status);
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    
    return response;
  })(request);
}

export const OPTIONS = () => new NextResponse(null, { status: 204 });
