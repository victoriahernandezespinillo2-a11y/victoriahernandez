'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAdminNotifications } from '../hooks';
import { adminApi } from '../api';
import { BADGE_CONFIG } from '../config/badgeConfig';

interface BadgeCounts {
  notifications: number;
  maintenance: number;
  pendingReservations: number;
  pendingPayments: number;
  newUsers: number;
  pendingOrders: number;
  auditAlerts: number;
}

export function useSidebarBadges() {
  const [badgeCounts, setBadgeCounts] = useState<BadgeCounts>({
    notifications: 0,
    maintenance: 0,
    pendingReservations: 0,
    pendingPayments: 0,
    newUsers: 0,
    pendingOrders: 0,
    auditAlerts: 0,
  });

  const [loading, setLoading] = useState(true);
  const { notifications } = useAdminNotifications();

  // Contador de notificaciones no leídas
  const getNotificationCount = useCallback(() => {
    return (notifications || []).filter((n: any) => !n.readAt).length;
  }, [notifications]);

  // Contador de tareas de mantenimiento pendientes
  const getMaintenanceCount = useCallback(async () => {
    try {
      const { statuses, limit } = BADGE_CONFIG.maintenance;
      let totalCount = 0;
      
      // Obtener contadores para cada estado
      for (const status of statuses) {
        try {
          const records = await adminApi.maintenance.getAll({
            status,
            limit
          });
          const data = Array.isArray(records) ? records : [];
          totalCount += data.length;
        } catch (statusError) {
          console.warn(`Error obteniendo mantenimiento con estado ${status}:`, statusError);
        }
      }
      
      return totalCount;
    } catch (error) {
      console.warn('Error obteniendo mantenimiento:', error);
      return 0;
    }
  }, []);

  // Contador de reservas pendientes
  const getPendingReservationsCount = useCallback(async () => {
    try {
      const { status, limit } = BADGE_CONFIG.reservations;
      const reservations = await adminApi.reservations.getAll({
        status,
        limit
      });
      return Array.isArray(reservations) ? reservations.length : 0;
    } catch (error) {
      console.warn('Error obteniendo reservas pendientes:', error);
      return 0;
    }
  }, []);

  // Contador de pagos pendientes
  const getPendingPaymentsCount = useCallback(async () => {
    try {
      const { status, limit } = BADGE_CONFIG.payments;
      const payments = await adminApi.payments.getAll({
        status,
        limit
      });
      return Array.isArray(payments) ? payments.length : 0;
    } catch (error) {
      console.warn('Error obteniendo pagos pendientes:', error);
      return 0;
    }
  }, []);

  // Contador de usuarios nuevos (últimos 7 días)
  const getNewUsersCount = useCallback(async () => {
    try {
      const { daysBack, limit } = BADGE_CONFIG.users;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysBack);
      
      const users = await adminApi.users.getAll({
        limit
      });
      return Array.isArray(users) ? users.length : 0;
    } catch (error) {
      console.warn('Error obteniendo usuarios nuevos:', error);
      return 0;
    }
  }, []);

  // Contador de pedidos pendientes
  const getPendingOrdersCount = useCallback(async () => {
    try {
      const { statuses, limit } = BADGE_CONFIG.orders;
      let totalCount = 0;
      
      // Obtener contadores para cada estado
      for (const status of statuses) {
        try {
          const orders = await adminApi.orders.getAll({
            status,
            limit
          });
          const ordersData = (orders as any)?.items || (orders as any)?.data || orders || [];
          const data = Array.isArray(ordersData) ? ordersData : [];
          totalCount += data.length;
        } catch (statusError) {
          console.warn(`Error obteniendo pedidos con estado ${status}:`, statusError);
        }
      }
      
      return totalCount;
    } catch (error) {
      console.warn('Error obteniendo pedidos pendientes:', error);
      return 0;
    }
  }, []);

  // Contador de alertas de auditoría (errores y warnings)
  const getAuditAlertsCount = useCallback(async () => {
    try {
      const { highSeverity, criticalSeverity } = BADGE_CONFIG.audit;
      let totalCount = 0;
      
      // Obtener logs de alta severidad
      try {
        const highLogs = await adminApi.audit.getLogs(highSeverity);
        const highData = Array.isArray((highLogs as any)?.auditLogs || (highLogs as any)?.data || highLogs)
          ? ((highLogs as any)?.auditLogs || (highLogs as any)?.data || highLogs)
          : [];
        totalCount += highData.length;
      } catch (highError) {
        console.warn('Error obteniendo logs de alta severidad:', highError);
      }
      
      // Obtener logs críticos
      try {
        const criticalLogs = await adminApi.audit.getLogs(criticalSeverity);
        const criticalData = Array.isArray((criticalLogs as any)?.auditLogs || (criticalLogs as any)?.data || criticalLogs)
          ? ((criticalLogs as any)?.auditLogs || (criticalLogs as any)?.data || criticalLogs)
          : [];
        totalCount += criticalData.length;
      } catch (criticalError) {
        console.warn('Error obteniendo logs críticos:', criticalError);
      }
      
      return totalCount;
    } catch (error) {
      console.warn('Error obteniendo alertas de auditoría:', error);
      return 0;
    }
  }, []);

  // Función para actualizar todos los contadores
  const updateBadgeCounts = useCallback(async () => {
    setLoading(true);
    try {
      // Actualizar notificaciones primero (ya está en memoria)
      const notificationCount = getNotificationCount();
      
      // Actualizar el resto de contadores en paralelo
      const [
        maintenanceCount,
        pendingReservationsCount,
        pendingPaymentsCount,
        newUsersCount,
        pendingOrdersCount,
        auditAlertsCount
      ] = await Promise.allSettled([
        getMaintenanceCount(),
        getPendingReservationsCount(),
        getPendingPaymentsCount(),
        getNewUsersCount(),
        getPendingOrdersCount(),
        getAuditAlertsCount()
      ]);

      setBadgeCounts({
        notifications: notificationCount,
        maintenance: maintenanceCount.status === 'fulfilled' ? maintenanceCount.value : 0,
        pendingReservations: pendingReservationsCount.status === 'fulfilled' ? pendingReservationsCount.value : 0,
        pendingPayments: pendingPaymentsCount.status === 'fulfilled' ? pendingPaymentsCount.value : 0,
        newUsers: newUsersCount.status === 'fulfilled' ? newUsersCount.value : 0,
        pendingOrders: pendingOrdersCount.status === 'fulfilled' ? pendingOrdersCount.value : 0,
        auditAlerts: auditAlertsCount.status === 'fulfilled' ? auditAlertsCount.value : 0,
      });
    } catch (error) {
      console.error('Error actualizando badges:', error);
      // Mantener valores actuales en caso de error
    } finally {
      setLoading(false);
    }
  }, [
    getNotificationCount,
    getMaintenanceCount,
    getPendingReservationsCount,
    getPendingPaymentsCount,
    getNewUsersCount,
    getPendingOrdersCount,
    getAuditAlertsCount
  ]);

  // Actualizar contadores al montar el componente
  useEffect(() => {
    updateBadgeCounts();
  }, [updateBadgeCounts]);

  // Actualizar contadores según configuración
  useEffect(() => {
    const interval = setInterval(updateBadgeCounts, BADGE_CONFIG.general.updateInterval);
    return () => clearInterval(interval);
  }, [updateBadgeCounts]);

  return {
    badgeCounts,
    loading,
    updateBadgeCounts,
    // Funciones individuales para uso específico
    getNotificationCount,
    getMaintenanceCount,
    getPendingReservationsCount,
    getPendingPaymentsCount,
    getNewUsersCount,
    getPendingOrdersCount,
    getAuditAlertsCount,
  };
}
