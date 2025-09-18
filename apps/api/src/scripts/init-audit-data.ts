/**
 * Script de inicialización de datos de auditoría
 * Crea algunos logs de ejemplo para demostrar el sistema
 */

import { AuditService } from '../lib/services/audit.service';

const auditService = new AuditService();

async function initAuditData() {
  console.log('🚀 Inicializando datos de auditoría...');
  
  try {
    // Crear logs de ejemplo
    const sampleLogs = [
      {
        userName: 'Sistema',
        action: 'SYSTEM_STARTUP',
        resource: 'system',
        details: 'Sistema de auditoría inicializado',
        category: 'SYSTEM' as const,
        severity: 'LOW' as const,
        status: 'SUCCESS' as const,
        tags: ['startup', 'system']
      },
      {
        userName: 'admin@polideportivo.com',
        action: 'LOGIN',
        resource: 'user',
        resourceId: 'admin-user-id',
        details: 'Inicio de sesión exitoso',
        category: 'AUTHENTICATION' as const,
        severity: 'MEDIUM' as const,
        status: 'SUCCESS' as const,
        tags: ['login', 'authentication'],
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      {
        userName: 'admin@polideportivo.com',
        action: 'CREATE',
        resource: 'user',
        resourceId: 'user-123',
        details: 'Usuario creado: juan.perez@email.com',
        category: 'USER_MANAGEMENT' as const,
        severity: 'HIGH' as const,
        status: 'SUCCESS' as const,
        tags: ['user', 'create', 'management'],
        ipAddress: '192.168.1.100'
      },
      {
        userName: 'admin@polideportivo.com',
        action: 'UPDATE',
        resource: 'reservation',
        resourceId: 'reservation-456',
        details: 'Reserva actualizada: Cancha 1 - 2024-01-15 10:00',
        category: 'RESERVATION' as const,
        severity: 'MEDIUM' as const,
        status: 'SUCCESS' as const,
        tags: ['reservation', 'update'],
        ipAddress: '192.168.1.100'
      },
      {
        userName: 'admin@polideportivo.com',
        action: 'PAYMENT_SUCCESS',
        resource: 'payment',
        resourceId: 'payment-789',
        details: 'Pago procesado exitosamente: €25.00',
        category: 'PAYMENT' as const,
        severity: 'HIGH' as const,
        status: 'SUCCESS' as const,
        tags: ['payment', 'success', 'financial'],
        ipAddress: '192.168.1.100'
      },
      {
        userName: 'Sistema',
        action: 'BACKUP_COMPLETED',
        resource: 'database',
        details: 'Backup de base de datos completado',
        category: 'SYSTEM' as const,
        severity: 'LOW' as const,
        status: 'SUCCESS' as const,
        tags: ['backup', 'database', 'maintenance']
      },
      {
        userName: 'admin@polideportivo.com',
        action: 'DELETE',
        resource: 'notification',
        resourceId: 'notification-101',
        details: 'Notificación eliminada: ID notification-101',
        category: 'DATA_MODIFICATION' as const,
        severity: 'MEDIUM' as const,
        status: 'SUCCESS' as const,
        tags: ['notification', 'delete'],
        ipAddress: '192.168.1.100'
      },
      {
        userName: 'user@email.com',
        action: 'LOGIN_FAILED',
        resource: 'user',
        details: 'Intento de inicio de sesión fallido',
        category: 'AUTHENTICATION' as const,
        severity: 'HIGH' as const,
        tags: ['login', 'failed', 'security'],
        ipAddress: '192.168.1.200',
        status: 'ERROR' as const
      },
      {
        userName: 'admin@polideportivo.com',
        action: 'CONFIG_UPDATE',
        resource: 'settings',
        details: 'Configuración del sistema actualizada',
        category: 'CONFIGURATION' as const,
        severity: 'MEDIUM' as const,
        status: 'SUCCESS' as const,
        tags: ['config', 'settings', 'update'],
        ipAddress: '192.168.1.100'
      },
      {
        userName: 'Sistema',
        action: 'MAINTENANCE_SCHEDULED',
        resource: 'system',
        details: 'Mantenimiento programado para 2024-01-20 02:00',
        category: 'MAINTENANCE' as const,
        severity: 'LOW' as const,
        status: 'SUCCESS' as const,
        tags: ['maintenance', 'scheduled', 'system']
      }
    ];
    
    // Crear logs de auditoría
    for (const logData of sampleLogs) {
      await auditService.createAuditLog(logData);
      console.log(`✅ Log creado: ${logData.action}`);
    }
    
    console.log('🎉 Datos de auditoría inicializados correctamente');
    console.log(`📊 Total de logs creados: ${sampleLogs.length}`);
    
  } catch (error) {
    console.error('❌ Error inicializando datos de auditoría:', error);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  initAuditData()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { initAuditData };
