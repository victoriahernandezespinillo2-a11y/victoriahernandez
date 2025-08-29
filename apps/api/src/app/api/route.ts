/**
 * API Principal del Polideportivo
 * GET /api - Documentación y estado de la API
 */

import { NextRequest } from 'next/server';
import { ApiResponse } from '@/lib/middleware';

/**
 * GET /api
 * Obtener información general de la API y documentación
 * Acceso: Público
 */
export async function GET(request: NextRequest) {
  try {
    const apiInfo = {
      name: 'Polideportivo API',
      version: process.env.APP_VERSION || '1.0.0',
      description: 'API REST para la gestión integral del polideportivo',
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
      
      endpoints: {
        // Autenticación
        auth: {
          signin: 'POST /api/auth/signin',
          signup: 'POST /api/auth/signup',
          signout: 'POST /api/auth/signout',
          session: 'GET /api/auth/session',
          providers: 'GET /api/auth/providers'
        },
        
        // Usuarios
        users: {
          list: 'GET /api/users',
          create: 'POST /api/users',
          getById: 'GET /api/users/[id]',
          update: 'PUT /api/users/[id]',
          delete: 'DELETE /api/users/[id]',
          profile: 'GET /api/users/profile',
          memberships: 'GET /api/users/memberships',
          reservations: 'GET /api/users/reservations',
          waitingList: 'GET /api/users/waiting-list'
        },
        
        // Centros
        centers: {
          list: 'GET /api/centers',
          create: 'POST /api/centers',
          getById: 'GET /api/centers/[id]',
          update: 'PUT /api/centers/[id]',
          delete: 'DELETE /api/centers/[id]',
          courts: 'GET /api/centers/[id]/courts',
          stats: 'GET /api/centers/[id]/stats'
        },
        
        // Canchas
        courts: {
          list: 'GET /api/courts',
          create: 'POST /api/courts',
          getById: 'GET /api/courts/[id]',
          update: 'PUT /api/courts/[id]',
          delete: 'DELETE /api/courts/[id]',
          availability: 'GET /api/courts/[id]/availability',
          reservations: 'GET /api/courts/[id]/reservations'
        },
        
        // Reservas
        reservations: {
          list: 'GET /api/reservations',
          create: 'POST /api/reservations',
          getById: 'GET /api/reservations/[id]',
          update: 'PUT /api/reservations/[id]',
          cancel: 'DELETE /api/reservations/[id]',
          checkIn: 'POST /api/reservations/[id]/check-in',
          checkOut: 'POST /api/reservations/[id]/check-out'
        },
        
        // Lista de espera
        waitingList: {
          list: 'GET /api/waiting-list',
          create: 'POST /api/waiting-list',
          getById: 'GET /api/waiting-list/[id]',
          claim: 'POST /api/waiting-list/[id]/claim',
          notify: 'POST /api/waiting-list/[id]/notify'
        },
        
        // Precios
        pricing: {
          calculate: 'GET|POST /api/pricing/calculate',
          rules: {
            list: 'GET /api/pricing/rules',
            create: 'POST /api/pricing/rules',
            getById: 'GET /api/pricing/rules/[id]',
            update: 'PUT /api/pricing/rules/[id]',
            delete: 'DELETE /api/pricing/rules/[id]',
            test: 'POST /api/pricing/rules/[id]/test'
          },
          stats: 'GET /api/pricing/stats'
        },
        
        // Membresías
        memberships: {
          list: 'GET /api/memberships',
          create: 'POST /api/memberships',
          getById: 'GET /api/memberships/[id]',
          update: 'PUT /api/memberships/[id]',
          cancel: 'DELETE /api/memberships/[id]',
          activate: 'POST /api/memberships/[id]/activate',
          suspend: 'POST /api/memberships/[id]/suspend',
          renew: 'POST /api/memberships/[id]/renew',
          types: 'GET /api/memberships/types',
          stats: 'GET /api/memberships/stats'
        },
        
        // Torneos
        tournaments: {
          list: 'GET /api/tournaments',
          create: 'POST /api/tournaments',
          getById: 'GET /api/tournaments/[id]',
          update: 'PUT /api/tournaments/[id]',
          delete: 'DELETE /api/tournaments/[id]',
          join: 'POST /api/tournaments/[id]/join',
          leave: 'DELETE /api/tournaments/[id]/leave',
          matches: 'GET /api/tournaments/[id]/matches',
          stats: 'GET /api/tournaments/stats'
        },
        
        // Pagos
        payments: {
          list: 'GET /api/payments',
          create: 'POST /api/payments',
          getById: 'GET /api/payments/[id]',
          refund: 'POST /api/payments/[id]/refund',
          webhook: {
            stripe: 'POST /api/payments/webhook/stripe',
            redsys: 'POST /api/payments/webhook/redsys'
          },
          stats: 'GET /api/payments/stats'
        },
        
        // Notificaciones
        notifications: {
          list: 'GET /api/notifications',
          create: 'POST /api/notifications',
          getById: 'GET /api/notifications/[id]',
          markAsRead: 'PUT /api/notifications/[id]',
          send: 'POST /api/notifications/send',
          stats: 'GET /api/notifications/stats'
        },
        
        // Mantenimiento
        maintenance: {
          list: 'GET /api/maintenance',
          create: 'POST /api/maintenance',
          getById: 'GET /api/maintenance/[id]',
          update: 'PUT /api/maintenance/[id]',
          delete: 'DELETE /api/maintenance/[id]',
          start: 'POST /api/maintenance/[id]/start',
          complete: 'POST /api/maintenance/[id]/complete',
          upcoming: 'GET /api/maintenance/upcoming',
          stats: 'GET /api/maintenance/stats'
        },
        
        // Administración
        admin: {
          dashboard: 'GET /api/admin/dashboard',
          stats: 'GET /api/admin/stats',
          users: {
            list: 'GET /api/admin/users',
            create: 'POST /api/admin/users',
            getById: 'GET /api/admin/users/[id]',
            update: 'PUT /api/admin/users/[id]',
            delete: 'DELETE /api/admin/users/[id]'
          },
          centers: {
            list: 'GET /api/admin/centers',
            create: 'POST /api/admin/centers',
            getById: 'GET /api/admin/centers/[id]',
            update: 'PUT /api/admin/centers/[id]',
            delete: 'DELETE /api/admin/centers/[id]'
          },
          courts: {
            list: 'GET /api/admin/courts',
            create: 'POST /api/admin/courts',
            getById: 'GET /api/admin/courts/[id]',
            update: 'PUT /api/admin/courts/[id]',
            delete: 'DELETE /api/admin/courts/[id]'
          },
          reports: {
            generate: 'GET /api/admin/reports',
            schedule: 'POST /api/admin/reports'
          },
          settings: {
            get: 'GET /api/admin/settings',
            update: 'PUT /api/admin/settings'
          },
          audit: 'GET /api/admin/audit'
        },
        
        // Salud del sistema
        health: 'GET /api/health'
      },
      
      authentication: {
        type: 'Bearer Token',
        description: 'Usar NextAuth.js session token en el header Authorization',
        header: 'Authorization: Bearer <token>'
      },
      
      roles: {
        USER: 'Usuario básico con acceso a funcionalidades de reserva',
        STAFF: 'Personal con acceso a gestión operativa',
        ADMIN: 'Administrador con acceso completo al sistema'
      },
      
      responseFormat: {
        success: {
          success: true,
          data: 'object | array',
          message: 'string (opcional)'
        },
        error: {
          success: false,
          error: 'string',
          details: 'object (opcional)'
        }
      },
      
      statusCodes: {
        200: 'OK - Operación exitosa',
        201: 'Created - Recurso creado exitosamente',
        400: 'Bad Request - Datos inválidos',
        401: 'Unauthorized - No autenticado',
        403: 'Forbidden - Permisos insuficientes',
        404: 'Not Found - Recurso no encontrado',
        409: 'Conflict - Conflicto con el estado actual',
        422: 'Unprocessable Entity - Error de validación',
        500: 'Internal Server Error - Error interno del servidor',
        503: 'Service Unavailable - Servicio no disponible'
      },
      
      links: {
        documentation: '/api',
        health: '/api/health',
        admin: '/api/admin',
        repository: 'https://github.com/polideportivo/platform'
      }
    };
    
    return ApiResponse.success(apiInfo);
  } catch (error) {
    console.error('Error obteniendo información de la API:', error);
    
    return ApiResponse.internalError('Error interno del servidor');
  }
}

/**
 * OPTIONS /api
 * Manejar preflight requests
 */
export async function OPTIONS() {
  // Delegar CORS al middleware global (apps/api/middleware.ts)
  // Responder 204 sin cabeceras CORS personalizadas
  return new Response(null, { status: 204 });
}
