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
  name: string;
  email: string;
  role: string;
  [key: string]: any;
}

interface Center {
  id: string;
  name: string;
  address: string;
  [key: string]: any;
}

interface Court {
  id: string;
  name: string;
  centerId: string;
  [key: string]: any;
}

interface Reservation {
  id: string;
  userId: string;
  courtId: string;
  [key: string]: any;
}

interface Tournament {
  id: string;
  name: string;
  description: string;
  [key: string]: any;
}

interface Payment {
  id: string;
  amount: number;
  status: string;
  [key: string]: any;
}

interface MaintenanceRecord {
  id: string;
  courtId: string;
  status: string;
  [key: string]: any;
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
  // Mantener una referencia estable al valor inicial
  const initialDataRef = useRef(initialData);

  const execute = useCallback(async (apiCall: () => Promise<T>) => {
    console.log('[useApiState] execute called.');
    if (isExecutingRef.current) {
      console.log('[useApiState] API call already in progress, skipping re-execution.');
      return;
    }
    isExecutingRef.current = true;
    try {
      setLoading(true);
      setError(null);
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
    }
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

  const getUsers = useCallback((params?: any) => {
    return execute(() => adminApi.users.getAll(params) as Promise<User[]>);
  }, [execute]);

  const createUser = useCallback(async (userData: {
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    phone?: string;
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
    reset,
  };
}

/**
 * Hook para gestión administrativa de centros
 */
export function useAdminCenters() {
  const { data, loading, error, execute, reset, setData } = useApiState<Center[]>([]);

  const getCenters = useCallback((params?: any) => {
    return execute(() => adminApi.centers.getAll(params) as Promise<Center[]>);
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

    const payload: any = { name: centerData.name.trim() };
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
    centers: data,
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
    maxPlayers: number;
    hourlyRate: number;
  }) => {
    // Mapear al esquema que espera el backend (CreateCourtSchema)
    const payload: any = {
      name: courtData.name.trim(),
      centerId: courtData.centerId,
      sport: courtData.sport,
      // Mapas
      capacity: Math.max(1, Number.isFinite(courtData.maxPlayers) ? Math.floor(courtData.maxPlayers) : 1),
      pricePerHour: Number(courtData.hourlyRate) || 0,
      surface: courtData.surface || undefined,
      lighting: !!courtData.hasLighting,
      covered: !!courtData.isIndoor,
      status: 'ACTIVE',
    };

    const newCourt = await adminApi.courts.create(payload) as Court;
    setData(prev => prev ? [newCourt, ...prev] : [newCourt]);
    return newCourt;
  }, [setData]);

  const getCourt = useCallback(async (id: string) => {
    return await adminApi.courts.getById(id) as Court;
  }, []);

  const updateCourt = useCallback(async (id: string, updateData: Partial<Court>) => {
    const updatedCourt = await adminApi.courts.update(id, updateData) as Court;
    setData(prev => 
      prev ? prev.map(court => court.id === id ? updatedCourt : court) : [updatedCourt]
    );
    return updatedCourt;
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

  const getPayments = useCallback((params?: any) => {
    return execute(() => adminApi.payments.getAll(params) as Promise<Payment[]>);
  }, [execute]);

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
  const { data, loading, error, execute, reset } = useApiState<any>(null);

  const getRevenueReport = useCallback((params?: any) => {
    return execute(() => adminApi.reports.getRevenue(params));
  }, [execute]);

  const getUsageReport = useCallback((params?: any) => {
    return execute(() => adminApi.reports.getUsage(params));
  }, [execute]);

  const getCustomersReport = useCallback((params?: any) => {
    return execute(() => adminApi.reports.getCustomers(params));
  }, [execute]);

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
      const data = await response.json();
      return data.data || data;
    });
  }, [execute]);

  return {
    reportData: data,
    loading,
    error,
    getRevenueReport,
    getUsageReport,
    getCustomersReport,
    getGeneralReport,
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
    scheduledDate: string;
    estimatedDuration: number;
    priority: string;
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