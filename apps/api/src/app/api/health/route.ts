/**
 * API Routes para verificación de salud del sistema
 * GET /api/health - Verificar estado del sistema
 */

import { NextRequest } from 'next/server';
import { ApiResponse } from '../../../lib/middleware';
import { db } from '../../../../../../packages/db/src';

/**
 * GET /api/health
 * Verificar estado del sistema y servicios
 * Acceso: Público
 */
export async function GET(request: NextRequest) {
  try {
    const startTime = Date.now();
    
    // Verificar conexión a la base de datos
    const dbHealth = await checkDatabaseHealth();
    
    // Verificar servicios externos
    const externalServices = await checkExternalServices();
    
    // Verificar recursos del sistema
    const systemResources = await checkSystemResources();
    
    // Verificar servicios internos
    const internalServices = await checkInternalServices();
    
    const responseTime = Date.now() - startTime;
    
    // Determinar estado general
    const overallStatus = determineOverallStatus([
      dbHealth.status,
      ...Object.values(externalServices).map((service: any) => service.status),
      systemResources.status,
      ...Object.values(internalServices).map((service: any) => service.status)
    ]);
    
    const healthData = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`,
      version: process.env.APP_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      checks: {
        database: dbHealth,
        externalServices,
        systemResources,
        internalServices
      }
    };
    
    // Retornar código de estado HTTP apropiado
    const statusCode = overallStatus === 'healthy' ? 200 : 
                      overallStatus === 'degraded' ? 200 : 503;
    
    return new Response(JSON.stringify({
      success: true,
      data: healthData
    }), {
      status: statusCode,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
  } catch (error) {
    console.error('Error en health check:', error);
    
    return new Response(JSON.stringify({
      success: false,
      data: {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Health check failed',
        checks: {
          database: { status: 'unknown', error: 'Health check failed' },
          externalServices: {},
          systemResources: { status: 'unknown' },
          internalServices: {}
        }
      }
    }), {
      status: 503,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
  }
}

/**
 * Verificar salud de la base de datos
 */
async function checkDatabaseHealth() {
  try {
    const startTime = Date.now();
    
    // Realizar una consulta simple para verificar conectividad
    await db.$queryRaw`SELECT 1`;
    
    const responseTime = Date.now() - startTime;
    
    // Verificar estadísticas de conexión
    const stats = await getDatabaseStats();
    
    return {
      status: responseTime < 1000 ? 'healthy' : 'degraded',
      responseTime: `${responseTime}ms`,
      ...stats
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Database connection failed'
    };
  }
}

/**
 * Obtener estadísticas de la base de datos
 */
async function getDatabaseStats() {
  try {
    const [userCount, centerCount, courtCount, reservationCount] = await Promise.all([
      db.user.count(),
    db.center.count(),
    db.court.count(),
    db.reservation.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Últimas 24 horas
          }
        }
      })
    ]);
    
    return {
      totalUsers: userCount,
      totalCenters: centerCount,
      totalCourts: courtCount,
      recentReservations: reservationCount
    };
  } catch (error) {
    return {
      error: 'Could not retrieve database stats'
    };
  }
}

/**
 * Verificar servicios externos
 */
async function checkExternalServices() {
  const services: Record<string, any> = {};
  
  // Verificar Stripe (si está configurado)
  if (process.env.STRIPE_SECRET_KEY) {
    services.stripe = await checkStripeHealth();
  }
  
  // Verificar servicio de email (si está configurado)
  if (process.env.EMAIL_PROVIDER) {
    services.email = await checkEmailHealth();
  }
  
  // Verificar servicio de SMS (si está configurado)
  if (process.env.SMS_PROVIDER) {
    services.sms = await checkSMSHealth();
  }
  
  return services;
}

/**
 * Verificar salud de Stripe
 */
async function checkStripeHealth() {
  try {
    // En un entorno real, harías una llamada a la API de Stripe
    // Por ahora, solo verificamos que las credenciales estén configuradas
    const hasCredentials = !!(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PUBLISHABLE_KEY);
    
    return {
      status: hasCredentials ? 'healthy' : 'degraded',
      configured: hasCredentials,
      message: hasCredentials ? 'Stripe configured' : 'Stripe credentials missing'
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: 'Stripe health check failed'
    };
  }
}

/**
 * Verificar salud del servicio de email
 */
async function checkEmailHealth() {
  try {
    const provider = process.env.EMAIL_PROVIDER;
    const hasCredentials = !!(process.env.EMAIL_HOST && process.env.EMAIL_USER);
    
    return {
      status: hasCredentials ? 'healthy' : 'degraded',
      provider,
      configured: hasCredentials,
      message: hasCredentials ? 'Email service configured' : 'Email credentials missing'
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: 'Email service health check failed'
    };
  }
}

/**
 * Verificar salud del servicio de SMS
 */
async function checkSMSHealth() {
  try {
    const provider = process.env.SMS_PROVIDER;
    const hasCredentials = !!(process.env.SMS_API_KEY && process.env.SMS_API_SECRET);
    
    return {
      status: hasCredentials ? 'healthy' : 'degraded',
      provider,
      configured: hasCredentials,
      message: hasCredentials ? 'SMS service configured' : 'SMS credentials missing'
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: 'SMS service health check failed'
    };
  }
}

/**
 * Verificar recursos del sistema
 */
async function checkSystemResources() {
  try {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    // Convertir bytes a MB
    const memoryUsageMB = {
      rss: Math.round(memoryUsage.rss / 1024 / 1024),
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      external: Math.round(memoryUsage.external / 1024 / 1024)
    };
    
    // Determinar estado basado en uso de memoria
    const heapUsagePercent = (memoryUsageMB.heapUsed / memoryUsageMB.heapTotal) * 100;
    const status = heapUsagePercent > 90 ? 'unhealthy' : 
                  heapUsagePercent > 70 ? 'degraded' : 'healthy';
    
    return {
      status,
      memory: memoryUsageMB,
      heapUsagePercent: Math.round(heapUsagePercent),
      uptime: Math.round(process.uptime()),
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: 'Could not retrieve system resources'
    };
  }
}

/**
 * Verificar servicios internos
 */
async function checkInternalServices() {
  const services: Record<string, any> = {};
  
  // Verificar servicio de notificaciones
  services.notifications = await checkNotificationService();
  
  // Verificar servicio de pagos
  services.payments = await checkPaymentService();
  
  // Verificar servicio de reservas
  services.reservations = await checkReservationService();
  
  return services;
}

/**
 * Verificar servicio de notificaciones
 */
async function checkNotificationService() {
  try {
    // Verificar que las tablas de eventos del sistema existan y sean accesibles
    const recentEvents = await db.outboxEvent.count({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 60 * 60 * 1000) // Última hora
        }
      }
    });
    
    return {
      status: 'healthy',
      recentEvents
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: 'Notification service check failed'
    };
  }
}

/**
 * Verificar servicio de pagos
 */
async function checkPaymentService() {
  try {
    const recentMemberships = await db.membership.count({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 60 * 60 * 1000) // Última hora
        }
      }
    });
    
    return {
      status: 'healthy',
      recentMemberships
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: 'Payment service check failed'
    };
  }
}

/**
 * Verificar servicio de reservas
 */
async function checkReservationService() {
  try {
    const [activeReservations, recentReservations] = await Promise.all([
      db.reservation.count({
      where: {
        status: { in: ['PAID', 'IN_PROGRESS', 'COMPLETED'] },
        startTime: { gte: new Date() }
      }
    }),
    db.reservation.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 60 * 60 * 1000) // Última hora
          }
        }
      })
    ]);
    
    return {
      status: 'healthy',
      activeReservations,
      recentReservations
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: 'Reservation service check failed'
    };
  }
}

/**
 * Determinar estado general del sistema
 */
function determineOverallStatus(statuses: string[]): 'healthy' | 'degraded' | 'unhealthy' {
  if (statuses.some(status => status === 'unhealthy')) {
    return 'unhealthy';
  }
  if (statuses.some(status => status === 'degraded')) {
    return 'degraded';
  }
  return 'healthy';
}

/**
 * OPTIONS /api/health
 * Manejar preflight requests
 */
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}