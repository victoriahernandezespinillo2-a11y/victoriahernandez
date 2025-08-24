import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@repo/auth';
import { db } from '@repo/db';

// Types for diagnostics to avoid null vs object assignment errors and allow tables property
type DatabaseDiag = {
  status: 'unknown' | 'connected' | 'error';
  error: null | { message: string; code?: string; meta?: any };
  connection: null | 'success';
};

type AuthDiag = {
  status: 'unknown' | 'authenticated' | 'unauthenticated' | 'error';
  error: null | { message: string; name?: string };
  session: null | { userId: string; email?: string | null; name?: string | null };
};

// Extend ServicesDiag with counts for key tables
type ServicesDiag = {
  status: 'unknown' | 'operational' | 'database_unavailable' | 'error';
  error: null | { message: string; name?: string };
  tables: any[] | null;
  counts?: {
    users?: number;
    centers?: number;
    courts?: number;
    reservations?: number;
  };
};

type Diagnostics = {
  timestamp: string;
  environment?: string;
  database: DatabaseDiag;
  auth: AuthDiag;
  services: ServicesDiag;
};

/**
 * GET /api/debug
 * Endpoint de diagnóstico para identificar problemas del sistema
 */
export async function GET(request: NextRequest) {
  const diagnostics: Diagnostics = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    database: {
      status: 'unknown',
      error: null,
      connection: null
    },
    auth: {
      status: 'unknown',
      error: null,
      session: null
    },
    services: {
      status: 'unknown',
      error: null,
      tables: null,
      counts: {}
    }
  };

  try {
    // 🔍 DIAGNÓSTICO 1: CONEXIÓN A BASE DE DATOS
    try {
      console.log('🔍 [DEBUG] Probando conexión a base de datos...');
      await db.$queryRaw`SELECT 1`;
      diagnostics.database.status = 'connected';
      diagnostics.database.connection = 'success';
      console.log('✅ [DEBUG] Base de datos conectada exitosamente');
    } catch (dbError: any) {
      diagnostics.database.status = 'error';
      diagnostics.database.error = {
        message: dbError.message,
        code: dbError.code,
        meta: dbError.meta
      };
      console.error('❌ [DEBUG] Error de base de datos:', dbError);
    }

    // 🔍 DIAGNÓSTICO 2: AUTENTICACIÓN
    try {
      console.log('🔍 [DEBUG] Probando autenticación...');
      const session = await auth();
      if (session?.user?.id) {
        diagnostics.auth.status = 'authenticated';
        diagnostics.auth.session = {
          userId: session.user.id,
          email: session.user.email,
          name: (session.user as any).name
        };
        console.log('✅ [DEBUG] Usuario autenticado:', session.user.id);
      } else {
        diagnostics.auth.status = 'unauthenticated';
        console.log('⚠️ [DEBUG] Usuario no autenticado');
      }
    } catch (authError: any) {
      diagnostics.auth.status = 'error';
      diagnostics.auth.error = {
        message: authError.message,
        name: authError.name
      };
      console.error('❌ [DEBUG] Error de autenticación:', authError);
    }

    // 🔍 DIAGNÓSTICO 3: SERVICIOS BÁSICOS
    try {
      console.log('🔍 [DEBUG] Probando servicios básicos...');
      
      // Verificar que las tablas principales existen
      if (diagnostics.database.status === 'connected') {
        const tables = await db.$queryRaw`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name IN ('users', 'courts', 'reservations', 'centers')
          ORDER BY table_name
        ` as any;
        
        diagnostics.services.status = 'operational';
        diagnostics.services.tables = tables as any[];
        console.log('✅ [DEBUG] Tablas principales verificadas:', tables);

        // Obtener conteos básicos para diagnosticar datos mínimos
        try {
          const [users, centers, courts, reservations] = await Promise.all([
            db.$queryRaw`SELECT COUNT(*)::int as count FROM users`,
            db.$queryRaw`SELECT COUNT(*)::int as count FROM centers`,
            db.$queryRaw`SELECT COUNT(*)::int as count FROM courts`,
            db.$queryRaw`SELECT COUNT(*)::int as count FROM reservations`,
          ]) as any[];

          diagnostics.services.counts = {
            users: Number(users?.[0]?.count ?? 0),
            centers: Number(centers?.[0]?.count ?? 0),
            courts: Number(courts?.[0]?.count ?? 0),
            reservations: Number(reservations?.[0]?.count ?? 0),
          };
        } catch (countErr: any) {
          console.warn('⚠️ [DEBUG] No se pudieron obtener conteos:', countErr?.message || countErr);
        }
      } else {
        diagnostics.services.status = 'database_unavailable';
        console.log('⚠️ [DEBUG] No se pueden verificar servicios - DB no disponible');
      }
    } catch (serviceError: any) {
      diagnostics.services.status = 'error';
      diagnostics.services.error = {
        message: serviceError.message,
        name: serviceError.name
      };
      console.error('❌ [DEBUG] Error en servicios:', serviceError);
    }

    // 🔍 DIAGNÓSTICO 4: VARIABLES DE ENTORNO
    const envCheck = {
      DATABASE_URL: process.env.DATABASE_URL ? 'set' : 'missing',
      DIRECT_DATABASE_URL: process.env.DIRECT_DATABASE_URL ? 'set' : 'missing',
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? 'set' : 'missing',
      NEXTAUTH_URL: process.env.NEXTAUTH_URL ? 'set' : 'missing'
    };

    console.log('🔍 [DEBUG] Variables de entorno:', envCheck);

    return NextResponse.json({
      success: true,
      diagnostics,
      environment: envCheck,
      recommendations: getRecommendations(diagnostics)
    });

  } catch (error: any) {
    console.error('🚨 [DEBUG] Error general en diagnóstico:', error);
    
    return NextResponse.json({
      success: false,
      error: {
        message: error.message,
        name: error.name,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      diagnostics,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

/**
 * Función para generar recomendaciones basadas en el diagnóstico
 */
function getRecommendations(diagnostics: Diagnostics): string[] {
  const recommendations: string[] = [];

  if (diagnostics.database.status === 'error') {
    recommendations.push('🔌 Verificar conexión a base de datos y credenciales');
    recommendations.push('🔌 Verificar que la base de datos esté ejecutándose');
    recommendations.push('🔌 Verificar variables de entorno DATABASE_URL');
  }

  if (diagnostics.auth.status === 'error') {
    recommendations.push('🔐 Verificar configuración de NextAuth');
    recommendations.push('🔐 Verificar variables de entorno NEXTAUTH_SECRET y NEXTAUTH_URL');
  }

  if (diagnostics.services.status === 'error') {
    recommendations.push('🚨 Verificar esquema de base de datos');
    recommendations.push('🚨 Ejecutar migraciones de Prisma si es necesario');
  }

  if (recommendations.length === 0) {
    recommendations.push('✅ Sistema funcionando correctamente');
  }

  return recommendations;
}
