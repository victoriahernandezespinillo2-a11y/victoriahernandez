/**
 * Endpoint de diagnóstico específico para autenticación
 * GET /api/auth/diagnose - Diagnóstico completo de autenticación y base de datos
 */

import { NextRequest, NextResponse } from 'next/server';
import { withPublicMiddleware, ApiResponse } from '@/lib/middleware';
import { db } from '@repo/db';

export async function GET(request: NextRequest) {
  return withPublicMiddleware(async (req) => {
    const diagnostics = {
      timestamp: new Date().toISOString(),
      database: {
        connected: false,
        responseTime: 0,
        provider: null as string | null,
        error: null as any,
        canQueryUsers: false,
        userCount: 0
      },
      auth: {
        nextAuthConfigured: !!process.env.NEXTAUTH_SECRET,
        nextAuthUrl: process.env.NEXTAUTH_URL || null,
        canAccessUsers: false,
        hasAdminUser: false
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        hasDatabaseUrl: !!process.env.DATABASE_URL,
        hasDirectDatabaseUrl: !!process.env.DIRECT_DATABASE_URL
      }
    };

    try {
      // Detectar proveedor
      const dbUrl = process.env.DATABASE_URL || process.env.DIRECT_DATABASE_URL || '';
      if (dbUrl.includes('supabase.co')) {
        diagnostics.database.provider = 'Supabase';
      } else if (dbUrl.includes('neon.tech')) {
        diagnostics.database.provider = 'Neon';
      } else if (dbUrl) {
        diagnostics.database.provider = 'PostgreSQL';
      }

      // Test 1: Conexión básica
      const dbStartTime = Date.now();
      try {
        await db.$queryRaw`SELECT 1 as test`;
        diagnostics.database.connected = true;
        diagnostics.database.responseTime = Date.now() - dbStartTime;
      } catch (dbError: any) {
        diagnostics.database.error = {
          message: dbError.message,
          code: dbError.code,
          meta: dbError.meta
        };
        return ApiResponse.error('Error de conexión a base de datos', 503, diagnostics);
      }

      // Test 2: Acceso a tabla de usuarios
      try {
        diagnostics.database.userCount = await db.user.count();
        diagnostics.database.canQueryUsers = true;
        diagnostics.auth.canAccessUsers = true;
      } catch (userError: any) {
        diagnostics.database.canQueryUsers = false;
        diagnostics.auth.canAccessUsers = false;
        diagnostics.database.error = {
          ...diagnostics.database.error,
          userTableError: {
            message: userError.message,
            code: userError.code
          }
        };
      }

      // Test 3: Verificar usuario admin (para autenticación)
      try {
        const adminUser = await db.user.findFirst({
          where: { role: 'ADMIN' },
          select: { id: true, email: true, isActive: true }
        });
        if (adminUser) {
          diagnostics.auth.hasAdminUser = true;
        } else {
          diagnostics.auth.hasAdminUser = false;
        }
      } catch (error: any) {
        // No crítico, solo informativo
      }

      const status = diagnostics.database.connected && diagnostics.database.canQueryUsers 
        ? 'healthy' 
        : 'unhealthy';

      return ApiResponse.success({
        status,
        ...diagnostics
      });

    } catch (error: any) {
      console.error('❌ [AUTH-DIAGNOSE] Error en diagnóstico:', error);
      return ApiResponse.error('Error en diagnóstico', 500, {
        ...diagnostics,
        fatalError: {
          message: error.message,
          stack: error.stack
        }
      });
    }
  })(request);
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

