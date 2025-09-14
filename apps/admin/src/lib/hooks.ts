'use client';

/**
 * Hooks personalizados para la aplicación admin del polideportivo
 * Facilitan el uso de la API administrativa y el manejo de estado en los componentes
 */

import { useState, useCallback, useRef } from 'react';
import { adminApi } from './api';

// Tipos básicos para mejorar el tipado
interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'ADMIN' | 'USER' | 'STAFF';
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  createdAt: string;
  [key: string]: unknown;
}

interface Center {
  id: string;
  name: string;
  address: string;
  [key: string]: unknown;
}

interface Court {
  id: string;
  name: string;
  type: 'FOOTBALL7' | 'PADDLE' | 'FUTSAL' | 'BASKETBALL' | 'TENNIS' | 'VOLLEYBALL' | 'MULTIPURPOSE';
  centerId: string;
  centerName: string;
  description: string;
  hourlyRate: number;
  capacity: number;
  status: 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE' | 'INACTIVE';
  features: string[];
  dimensions: string;
  surface: string;
  lighting: boolean;
  covered: boolean;
  createdAt: string;
}

interface Reservation {
  id: string;
  userId: string;
  courtId: string;
  [key: string]: unknown;
}

interface Tournament {
  id: string;
  name: string;
  description: string;
  [key: string]: unknown;
}

interface Payment {
  id: string;
  amount: number;
  status: string;
  [key: string]: unknown;
}

interface MaintenanceRecord {
  id: string;
  courtId: string;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  type: string;
  description: string;
  scheduledDate: string;
  estimatedDuration?: number; // Opcional para compatibilidad
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'; // Opcional para compatibilidad
  assignedUser?: {
    id: string;
    firstName?: string;
    lastName?: string;
    email: string;
  };
  court?: {
    id: string;
    name: string;
    type: string;
  };
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
}

/**
 * Hook genérico para manejo de estado de API
 */
function useApiState<T>(initialData: T | null = null) {
  const [data, setData] = useState<T | null>(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Guard de re-entrada estable para evitar llamadas concurrentes/repetitivas
  const isExecutingRef = useRef(false);
  const currentPromiseRef = useRef<Promise<T> | null>(null);
  // Mantener una referencia estable al valor inicial
  const initialDataRef = useRef(initialData);

  const execute = useCallback(async (apiCall: () => Promise<T>) => {
    console.log('[useApiState] execute called.');
    if (isExecutingRef.current && currentPromiseRef.current) {
      console.log('[useApiState] API call already in progress, returning in-flight promise.');
      return currentPromiseRef.current;
    }
    isExecutingRef.current = true;
    setLoading(true);
    setError(null);
    const promise = (async () => {
      try {
        const result = await apiCall();
        setData(result);
        return result;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
        setError(errorMessage);
        // Mantener el valor inicial en caso de error para evitar problemas con arrays
        if (Array.isArray(initialDataRef.current)) {
          setData(initialDataRef.current);
        } else if (initialDataRef.current !== null) {
          setData(initialDataRef.current);
        }
        throw err;
      } finally {
        setLoading(false);
        isExecutingRef.current = false;
        currentPromiseRef.current = null;
      }
    })();
    currentPromiseRef.current = promise;
    return promise;
  }, []);

  const reset = useCallback(() => {
    setData(initialDataRef.current);
    setError(null);
    setLoading(false);
  }, []);

  return { data, loading, error, execute, reset, setData };
}

/**
 * Hook para gestión del dashboard administrativo
 */
export function useAdminDashboard() {
  const { data, loading, error, execute, reset } = useApiState<any>(null);

  const getDashboardStats = useCallback(() => {
    return execute(() => adminApi.dashboard.getStats());
  }, [execute]);

  const getGeneralStats = useCallback(() => {
    return execute(() => adminApi.dashboard.getGeneralStats());
  }, [execute]);

  return {
    dashboardData: data,
    loading,
    error,
    getDashboardStats,
    getGeneralStats,
    reset,
  };
}

/**
 * Hook para gestión administrativa de usuarios
 */
export function useAdminUsers() {
  const { data, loading, error, execute, reset, setData } = useApiState<User[]>([]);
  const [pagination, setPagination] = useState<{ page: number; limit: number; total: number; pages: number } | null>(null);

  const getUsers = useCallback(async (params?: { page?: number; limit?: number; search?: string; role?: string; status?: string }) => {
    // Mapear a lista simple usando users.getAll; si en el futuro se requiere meta, se ampliará aquí
    const list = await adminApi.users.getAll(params);
    setData(list as User[]);
    setPagination({ page: params?.page || 1, limit: params?.limit || list.length, total: list.length, pages: 1 });
    return list as User[];
  }, [setData]);

  const createUser = useCallback(async (userData: {
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    phone?: string;
    password: string;
  }) => {
    const newUser = await adminApi.users.create(userData) as User;
    setData(prev => prev ? [newUser, ...prev] : [newUser]);
    return newUser;
  }, [setData]);

  const getUser = useCallback(async (id: string) => {
    return await adminApi.users.getById(id) as User;
  }, []);

  const updateUser = useCallback(async (id: string, updateData: Partial<User>) => {
    const updatedUser = await adminApi.users.update(id, updateData) as User;
    setData(prev => 
      prev ? prev.map(user => user.id === id ? updatedUser : user) : [updatedUser]
    );
    return updatedUser;
  }, [setData]);

  const deleteUser = useCallback(async (id: string) => {
    await adminApi.users.delete(id);
    setData(prev => prev ? prev.filter(user => user.id !== id) : []);
  }, [setData]);

  return {
    users: data,
    loading,
    error,
    getUsers,
    createUser,
    getUser,
    updateUser,
    deleteUser,
    pagination,
    reset,
  };
}

/**
 * Hook para gestión administrativa de centros
 */
export function useAdminCenters() {
  const { data, loading, error, execute, reset, setData } = useApiState<Center[]>([]);

  const getCenters = useCallback((params?: { 
    search?: string; 
    status?: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE'; 
    page?: number; 
    limit?: number;
    sortBy?: 'name' | 'createdAt' | 'courtsCount' | 'reservationsCount';
    sortOrder?: 'asc' | 'desc';
    includeStats?: boolean;
  }) => {
    return execute(() => adminApi.centers.getAll(params) as unknown as Promise<Center[]>);
  }, [execute]);

  const createCenter = useCallback(async (centerData: {
    name: string;
    address?: string;
    phone?: string;
    email?: string;
    description?: string;
    website?: string;
  }) => {
    if (!centerData.name || centerData.name.trim().length < 2) {
      throw new Error('El nombre debe tener al menos 2 caracteres');
    }

    const payload: { 
      name: string; 
      address?: string; 
      phone?: string; 
      email?: string; 
      description?: string; 
      website?: string; 
    } = { name: centerData.name.trim() };
    if (centerData.address && centerData.address.trim().length > 0) payload.address = centerData.address.trim();
    if (centerData.phone && centerData.phone.trim().length > 0) payload.phone = centerData.phone.trim();
    if (centerData.email && centerData.email.trim().length > 0) {
      const email = centerData.email.trim();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (emailRegex.test(email)) payload.email = email; // si no es válido, omitimos
    }
    if (centerData.description && centerData.description.trim().length > 0) payload.description = centerData.description.trim();
    if (centerData.website && centerData.website.trim().length > 0) {
      let website = centerData.website.trim();
      if (!/^https?:\/\//i.test(website)) {
        website = `https://${website}`;
      }
      try {
        // validar URL
        new URL(website);
        payload.website = website;
      } catch {
        // omitir si es inválida
      }
    }

    const newCenter = await adminApi.centers.create(payload) as Center;
    setData(prev => prev ? [newCenter, ...prev] : [newCenter]);
    return newCenter;
  }, [setData]);

  const getCenter = useCallback(async (id: string) => {
    return await adminApi.centers.getById(id) as Center;
  }, []);

  const updateCenter = useCallback(async (id: string, updateData: Partial<Center>) => {
    const updatedCenter = await adminApi.centers.update(id, updateData) as Center;
    setData(prev => 
      prev ? prev.map(center => center.id === id ? updatedCenter : center) : [updatedCenter]
    );
    return updatedCenter;
  }, [setData]);

  const deleteCenter = useCallback(async (id: string) => {
    await adminApi.centers.delete(id);
    setData(prev => prev ? prev.filter(center => center.id !== id) : []);
  }, [setData]);

  return {
    centers: data as Center[],
    loading,
    error,
    getCenters,
    createCenter,
    getCenter,
    updateCenter,
    deleteCenter,
    reset,
  };
}

/**
 * Hook para gestión administrativa de canchas
 */
export function useAdminCourts() {
  const { data, loading, error, execute, reset, setData } = useApiState<Court[]>([]);

  // Normalizador robusto de Court desde cualquier shape de backend
  const normalizeCourt = (c: any): Court => {
    const toNum = (v: any) => (v == null ? 0 : Number(v));
    const statusBackend: string = (c?.status || '').toString().toUpperCase();
    const status: Court['status'] =
      statusBackend === 'ACTIVE' ? 'AVAILABLE'
      : statusBackend === 'INACTIVE' ? 'INACTIVE'
      : statusBackend === 'MAINTENANCE' ? 'MAINTENANCE'
      : (c?.maintenanceStatus && c.maintenanceStatus !== 'operational') ? 'MAINTENANCE'
      : (c?.isActive === false ? 'INACTIVE' : 'AVAILABLE');
    return {
      id: c.id,
      name: c.name,
      type: (c.type || c.sportType || 'MULTIPURPOSE') as Court['type'],
      centerId: c.centerId,
      centerName: c.center?.name || c.centerName || '',
      description: c.description || '',
      hourlyRate: toNum(c.hourlyRate ?? c.pricePerHour ?? c.basePricePerHour),
      capacity: toNum(c.capacity),
      status,
      features: Array.isArray(c.features) ? c.features : [],
      dimensions: c.dimensions || '',
      surface: c.surface || '',
      lighting: Boolean(c.lighting ?? c.hasLighting),
      lightingExtraPerHour: toNum(c.lightingExtraPerHour),
      covered: Boolean(c.covered ?? c.isIndoor),
      createdAt: c.createdAt,
      isMultiuse: Boolean(c.isMultiuse),
      allowedSports: Array.isArray(c.allowedSports) ? c.allowedSports : [],
    } as Court;
  };

  const getCourts = useCallback((params?: any) => {
    return execute(() => adminApi.courts.getAll(params) as Promise<Court[]>);
  }, [execute]);

  const createCourt = useCallback(async (courtData: {
    name: string;
    centerId: string;
    sport: string;
    surface: string;
    isIndoor: boolean;
    hasLighting: boolean;
    lightingExtraPerHour?: number;
    maxPlayers: number;
    hourlyRate: number;
    isMultiuse?: boolean;
    allowedSports?: string[];
  }) => {
    // Mapear al esquema que espera el backend (CreateCourtSchema)
    const payload: any = {
      name: courtData.name.trim(),
      centerId: courtData.centerId,
      // Normalizar deportes al enum del backend
      sport: (() => {
        const map: Record<string, string> = {
          FOOTBALL7: 'FOOTBALL',
          FUTSAL: 'FOOTBALL',
          MULTIPURPOSE: 'FOOTBALL',
        };
        const s = (courtData.sport || '').toUpperCase();
        return map[s] || s;
      })(),
      // Mapas
      capacity: Math.max(1, Number.isFinite(courtData.maxPlayers) ? Math.floor(courtData.maxPlayers) : 1),
      pricePerHour: Number(courtData.hourlyRate) || 0,
      surface: courtData.surface || undefined,
      lighting: !!courtData.hasLighting,
      lightingExtraPerHour: Number(courtData.lightingExtraPerHour ?? 0) || 0,
      covered: !!courtData.isIndoor,
      status: 'ACTIVE',
      ...(courtData.isMultiuse ? { isMultiuse: true, allowedSports: Array.isArray(courtData.allowedSports) ? courtData.allowedSports : [] } : { isMultiuse: false, allowedSports: [] }),
    };

    const newCourt = await adminApi.courts.create(payload) as Court;
    setData(prev => prev ? [newCourt, ...prev] : [newCourt]);
    return newCourt;
  }, [setData]);

  const getCourt = useCallback(async (id: string) => {
    return await adminApi.courts.getById(id) as Court;
  }, []);

  const updateCourt = useCallback(async (id: string, updateData: Partial<Court>) => {
    // Adaptar campos a payload backend
    const payload: any = { ...updateData };
    if (payload.hourlyRate !== undefined) {
      payload.pricePerHour = payload.hourlyRate;
      delete payload.hourlyRate;
    }
    if (payload.capacity !== undefined) {
      payload.capacity = Math.max(1, Math.floor(payload.capacity));
    }
    // Mapear estado UI -> backend
    if (payload.status) {
      const map: Record<string, string> = {
        AVAILABLE: 'ACTIVE',
        INACTIVE: 'INACTIVE',
        MAINTENANCE: 'MAINTENANCE',
      };
      payload.status = map[payload.status as string] || payload.status;
    }
    if (payload.isMultiuse === false) {
      payload.allowedSports = [];
    }
    const updatedRaw = await adminApi.courts.update(id, payload);
    const updatedCourt = normalizeCourt(updatedRaw);
    setData(prev => prev ? prev.map(court => court.id === id ? updatedCourt : court) : [updatedCourt]);
    return updatedCourt as any;
  }, [setData]);

  const deleteCourt = useCallback(async (id: string) => {
    await adminApi.courts.delete(id);
    setData(prev => prev ? prev.filter(court => court.id !== id) : []);
  }, [setData]);

  return {
    courts: data,
    loading,
    error,
    getCourts,
    createCourt,
    getCourt,
    updateCourt,
    deleteCourt,
    reset,
  };
}

/**
 * Hook para gestión administrativa de reservas
 */
export function useAdminReservations() {
  const { data, loading, error, execute, reset, setData } = useApiState<Reservation[]>([]);

  const getReservations = useCallback((params?: any) => {
    return execute(() => adminApi.reservations.getAll(params) as Promise<Reservation[]>);
  }, [execute]);

  const getReservation = useCallback(async (id: string) => {
    return await adminApi.reservations.getById(id) as Reservation;
  }, []);

  const updateReservation = useCallback(async (id: string, updateData: Partial<{
    status: string;
    startTime: string;
    endTime: string;
    notes: string;
  }>) => {
    const updatedReservation = await adminApi.reservations.update(id, updateData) as Reservation;
    setData(prev => 
      prev ? prev.map(res => res.id === id ? updatedReservation : res) : [updatedReservation]
    );
    return updatedReservation;
  }, [setData]);

  const cancelReservation = useCallback(async (id: string) => {
    await adminApi.reservations.cancel(id);
    setData(prev => prev ? prev.filter(res => res.id !== id) : []);
  }, [setData]);

  return {
    reservations: data,
    loading,
    error,
    getReservations,
    getReservation,
    updateReservation,
    cancelReservation,
    reset,
  };
}

/**
 * Hook para gestión administrativa de torneos
 */
export function useAdminTournaments() {
  const { data, loading, error, execute, reset, setData } = useApiState<Tournament[]>([]);

  const getTournaments = useCallback((params?: any) => {
    return execute(() => adminApi.tournaments.getAll(params) as Promise<Tournament[]>);
  }, [execute]);

  const createTournament = useCallback(async (tournamentData: {
    name: string;
    description?: string;
    sport: string;
    centerId: string;
    startDate: string;
    endDate: string;
    maxParticipants: number;
    entryFee: number;
    rules?: string;
  }) => {
    const newTournament = await adminApi.tournaments.create(tournamentData) as Tournament;
    setData(prev => prev ? [newTournament, ...prev] : [newTournament]);
    return newTournament;
  }, [setData]);

  const getTournament = useCallback(async (id: string) => {
    return await adminApi.tournaments.getById(id) as Tournament;
  }, []);

  const updateTournament = useCallback(async (id: string, updateData: Partial<Tournament>) => {
    const updatedTournament = await adminApi.tournaments.update(id, updateData) as Tournament;
    setData(prev => 
      prev ? prev.map(tournament => tournament.id === id ? updatedTournament : tournament) : [updatedTournament]
    );
    return updatedTournament;
  }, [setData]);

  const deleteTournament = useCallback(async (id: string) => {
    await adminApi.tournaments.delete(id);
    setData(prev => prev ? prev.filter(tournament => tournament.id !== id) : []);
  }, [setData]);

  return {
    tournaments: data,
    loading,
    error,
    getTournaments,
    createTournament,
    getTournament,
    updateTournament,
    deleteTournament,
    reset,
  };
}

/**
 * Hook para gestión de pagos
 */
export function useAdminPayments() {
  const { data, loading, error, execute, reset, setData } = useApiState<Payment[]>([]);

  const getPayments = useCallback(async (params?: any) => {
    const result = await adminApi.payments.getAll(params);
    console.log('🔍 [HOOK PAYMENTS] Resultado de API:', result);
    
    // Extraer items del resultado paginado
    if (result && typeof result === 'object' && 'items' in result) {
      console.log('✅ [HOOK PAYMENTS] Extrayendo items:', (result.items as any[])?.length || 0);
      setData(result.items as Payment[]);
      return result.items as Payment[];
    } else if (Array.isArray(result)) {
      console.log('✅ [HOOK PAYMENTS] Resultado es array directo:', result.length);
      setData(result as Payment[]);
      return result as Payment[];
    } else {
      console.log('❌ [HOOK PAYMENTS] Formato de resultado no reconocido:', result);
      setData([]);
      return [];
    }
  }, [execute, setData]);

  const getPayment = useCallback(async (id: string) => {
    return await adminApi.payments.getById(id) as Payment;
  }, []);

  const refundPayment = useCallback(async (id: string, refundData: any) => {
    const result = await adminApi.payments.refund(id, refundData);
    // Actualizar el estado local si es necesario
    setData(prev => 
      prev ? prev.map(payment => payment.id === id ? { ...payment, status: 'REFUNDED' } : payment) : []
    );
    return result;
  }, [setData]);

  const getPaymentStats = useCallback(async () => {
    return await adminApi.payments.getStats();
  }, []);

  return {
    payments: data,
    loading,
    error,
    getPayments,
    getPayment,
    refundPayment,
    getPaymentStats,
    reset,
  };
}

/**
 * Hook para gestión de reportes
 */
export function useAdminReports() {
  // Estado genérico (compatibilidad con usos existentes)
  const { data, loading, error, execute, reset } = useApiState<any>(null);

  // Estados independientes para permitir llamadas concurrentes sin colisiones
  const {
    data: revenueData,
    loading: revenueLoading,
    error: revenueError,
    execute: executeRevenue,
    reset: resetRevenue,
  } = useApiState<any>(null);

  const {
    data: usageData,
    loading: usageLoading,
    error: usageError,
    execute: executeUsage,
    reset: resetUsage,
  } = useApiState<any>(null);

  const {
    data: customersData,
    loading: customersLoading,
    error: customersError,
    execute: executeCustomers,
    reset: resetCustomers,
  } = useApiState<any>(null);

  const getRevenueReport = useCallback((params?: any) => {
    return executeRevenue(() => adminApi.reports.getRevenue(params));
  }, [executeRevenue]);

  const getUsageReport = useCallback((params?: any) => {
    return executeUsage(() => adminApi.reports.getUsage(params));
  }, [executeUsage]);

  const getCustomersReport = useCallback((params?: any) => {
    return executeCustomers(() => adminApi.reports.getCustomers(params));
  }, [executeCustomers]);

  const getGeneralReport = useCallback((params?: {
    type: 'revenue' | 'usage' | 'users' | 'courts' | 'maintenance' | 'memberships' | 'tournaments' | 'payments';
    period?: '7d' | '30d' | '90d' | '1y' | 'custom';
    startDate?: string;
    endDate?: string;
    centerId?: string;
    groupBy?: 'day' | 'week' | 'month';
  }) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, String(value));
        }
      });
    }
    const query = searchParams.toString();
    return execute(async () => {
      const response = await fetch(`/api/admin/reports${query ? `?${query}` : ''}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const json = await response.json();
      const report = json?.data || json;
      // Devolver directamente el contenido del reporte (report.data) si existe
      return report?.data ?? report;
    });
  }, [execute]);

  return {
    // Compatibilidad previa
    reportData: data,
    loading: loading || revenueLoading || usageLoading || customersLoading,
    error: error || revenueError || usageError || customersError,
    getRevenueReport,
    getUsageReport,
    getCustomersReport,
    getGeneralReport,
    reset: () => {
      reset();
      resetRevenue();
      resetUsage();
      resetCustomers();
    },
    // Estados individuales por si se requieren en otras vistas
    revenueData,
    usageData,
    customersData,
  };
}

/**
 * Hook para notificaciones (Admin)
 */
export function useAdminNotifications() {
  const { data, loading, error, execute, setData, reset } = useApiState<any[]>([]);

  const getNotifications = useCallback((params?: any) => {
    return execute(() => adminApi.notifications.getAll(params) as Promise<any[]>);
  }, [execute]);

  const markAsRead = useCallback(async (id: string) => {
    await adminApi.notifications.markAsRead(id);
    setData(prev => prev ? prev.map(n => n.id === id ? { ...n, readAt: new Date().toISOString() } : n) : prev);
  }, [setData]);

  const markAllAsRead = useCallback(async () => {
    await adminApi.notifications.markAllAsRead();
    setData(prev => prev ? prev.map(n => ({ ...n, readAt: new Date().toISOString() })) : prev);
  }, [setData]);

  const getStats = useCallback((params?: any) => {
    return adminApi.notifications.stats(params) as Promise<any>;
  }, []);

  // Nuevas funcionalidades para crear y enviar notificaciones
  const createNotification = useCallback(async (notificationData: {
    userId?: string;
    type: 'EMAIL' | 'SMS' | 'PUSH' | 'IN_APP';
    title: string;
    message: string;
    category?: 'RESERVATION' | 'PAYMENT' | 'TOURNAMENT' | 'MAINTENANCE' | 'MEMBERSHIP' | 'SYSTEM' | 'MARKETING' | 'REMINDER';
    priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    scheduledFor?: string;
    data?: Record<string, any>;
    actionUrl?: string;
  }) => {
    const newNotification = await adminApi.notifications.create(notificationData);
    // Actualizar la lista local si es una notificación IN_APP
    if (notificationData.type === 'IN_APP') {
      setData(prev => prev ? [newNotification, ...prev] : [newNotification]);
    }
    return newNotification;
  }, [setData]);

  const sendDirectNotification = useCallback(async (data: {
    type: 'email' | 'sms' | 'push';
    data: {
      to?: string | string[];
      userId?: string | string[];
      subject?: string;
      message?: string;
      title?: string;
      body?: string;
      template?: string;
      html?: string;
      text?: string;
      data?: Record<string, any>;
      actionUrl?: string;
    };
  }) => {
    return await adminApi.notifications.sendDirect(data);
  }, []);

  const sendBulkNotification = useCallback(async (data: {
    type: 'email' | 'sms';
    recipients: string[];
    subject?: string;
    message: string;
    template?: string;
    data?: Record<string, any>;
  }) => {
    return await adminApi.notifications.sendBulk(data);
  }, []);

  return {
    notifications: data,
    loading,
    error,
    getNotifications,
    markAsRead,
    markAllAsRead,
    getStats,
    createNotification,
    sendDirectNotification,
    sendBulkNotification,
    reset,
  };
}

/**
 * Hook para gestión de mantenimiento
 */
export function useAdminMaintenance() {
  const { data, loading, error, execute, reset, setData } = useApiState<MaintenanceRecord[]>([]);

  const getMaintenanceRecords = useCallback((params?: any) => {
    return execute(() => adminApi.maintenance.getAll(params) as Promise<MaintenanceRecord[]>);
  }, [execute]);

  const createMaintenanceRecord = useCallback(async (recordData: {
    courtId: string;
    type: string;
    description: string;
    scheduledAt: string;
    assignedTo?: string;
    cost?: number;
    estimatedDuration?: number;
    notes?: string;
  }) => {
    const newRecord = await adminApi.maintenance.create(recordData) as MaintenanceRecord;
    setData(prev => prev ? [newRecord, ...prev] : [newRecord]);
    return newRecord;
  }, [setData]);

  const getMaintenanceRecord = useCallback(async (id: string) => {
    return await adminApi.maintenance.getById(id) as MaintenanceRecord;
  }, []);

  const updateMaintenanceRecord = useCallback(async (id: string, updateData: Partial<MaintenanceRecord>) => {
    const updatedRecord = await adminApi.maintenance.update(id, updateData) as MaintenanceRecord;
    setData(prev => 
      prev ? prev.map(record => record.id === id ? updatedRecord : record) : [updatedRecord]
    );
    return updatedRecord;
  }, [setData]);

  const startMaintenance = useCallback(async (id: string) => {
    const result = await adminApi.maintenance.start(id);
    setData(prev => 
      prev ? prev.map(record => record.id === id ? { ...record, status: 'IN_PROGRESS' } : record) : []
    );
    return result;
  }, [setData]);

  const completeMaintenance = useCallback(async (id: string, completionData: any) => {
    const result = await adminApi.maintenance.complete(id, completionData);
    setData(prev => 
      prev ? prev.map(record => record.id === id ? { ...record, status: 'COMPLETED' } : record) : []
    );
    return result;
  }, [setData]);

  const deleteMaintenanceRecord = useCallback(async (id: string) => {
    await adminApi.maintenance.delete(id);
    setData(prev => prev ? prev.filter(record => record.id !== id) : []);
  }, [setData]);

  return {
    maintenanceRecords: data,
    loading,
    error,
    getMaintenanceRecords,
    createMaintenanceRecord,
    getMaintenanceRecord,
    updateMaintenanceRecord,
    startMaintenance,
    completeMaintenance,
    deleteMaintenanceRecord,
    reset,
  };
}