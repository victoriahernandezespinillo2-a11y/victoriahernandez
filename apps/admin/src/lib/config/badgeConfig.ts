/**
 * Configuración para el sistema de badges
 * Define los parámetros y filtros para cada tipo de contador
 */

export const BADGE_CONFIG = {
  // Configuración de mantenimiento
  maintenance: {
    statuses: ['SCHEDULED', 'IN_PROGRESS'] as const,
    limit: 100,
    description: 'Tareas de mantenimiento pendientes'
  },
  
  // Configuración de reservas
  reservations: {
    status: 'PENDING' as const,
    limit: 100,
    description: 'Reservas pendientes de confirmación'
  },
  
  // Configuración de pagos
  payments: {
    status: 'PENDING' as const,
    limit: 100,
    description: 'Pagos pendientes de procesamiento'
  },
  
  // Configuración de usuarios
  users: {
    daysBack: 7,
    limit: 100,
    description: 'Usuarios nuevos (últimos 7 días)'
  },
  
  // Configuración de pedidos
  orders: {
    statuses: ['PENDING', 'PROCESSING'] as const,
    limit: 100,
    description: 'Pedidos pendientes de procesamiento'
  },
  
  // Configuración de auditoría
  audit: {
    highSeverity: {
      severity: 'HIGH' as const,
      status: 'ERROR' as const,
      limit: 100
    },
    criticalSeverity: {
      severity: 'CRITICAL' as const,
      status: 'FAILED' as const,
      limit: 100
    },
    description: 'Alertas críticas de auditoría'
  },
  
  // Configuración general
  general: {
    updateInterval: 30000, // 30 segundos
    retryAttempts: 3,
    retryDelay: 1000, // 1 segundo
    timeout: 10000 // 10 segundos
  }
} as const;

export type BadgeConfig = typeof BADGE_CONFIG;
