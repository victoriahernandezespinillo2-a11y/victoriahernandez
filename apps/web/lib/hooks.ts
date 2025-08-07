/**
 * Hooks personalizados para la aplicación web del polideportivo
 * Facilitan el uso de la API y el manejo de estado en los componentes
 */

import { useState, useEffect, useCallback } from 'react';
import api from './api';

/**
 * Hook genérico para manejo de estado de API
 */
function useApiState<T>(initialData: T | null = null) {
  const [data, setData] = useState<T | null>(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async (apiCall: () => Promise<T>) => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiCall();
      setData(result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setData(initialData);
    setError(null);
    setLoading(false);
  }, [initialData]);

  return { data, loading, error, execute, reset, setData };
}

/**
 * Hook para gestión de centros deportivos
 */
export function useCenters() {
  const { data, loading, error, execute, reset } = useApiState<any[]>([]);

  const getCenters = useCallback((params?: any) => {
    return execute(() => api.centers.getAll(params));
  }, [execute]);

  const getCenter = useCallback((id: string) => {
    return execute(() => api.centers.getById(id));
  }, [execute]);

  const getCenterCourts = useCallback((id: string) => {
    return execute(() => api.centers.getCourts(id));
  }, [execute]);

  const getCenterStats = useCallback((id: string) => {
    return execute(() => api.centers.getStats(id));
  }, [execute]);

  return {
    centers: data,
    loading,
    error,
    getCenters,
    getCenter,
    getCenterCourts,
    getCenterStats,
    reset,
  };
}

/**
 * Hook para gestión de canchas
 */
export function useCourts() {
  const { data, loading, error, execute, reset } = useApiState<any[]>([]);

  const getCourts = useCallback((params?: any) => {
    return execute(() => api.courts.getAll(params));
  }, [execute]);

  const getCourt = useCallback((id: string) => {
    return execute(() => api.courts.getById(id));
  }, [execute]);

  const getCourtAvailability = useCallback((id: string, params?: any) => {
    return execute(() => api.courts.getAvailability(id, params));
  }, [execute]);

  const getCourtReservations = useCallback((id: string) => {
    return execute(() => api.courts.getReservations(id));
  }, [execute]);

  return {
    courts: data,
    loading,
    error,
    getCourts,
    getCourt,
    getCourtAvailability,
    getCourtReservations,
    reset,
  };
}

/**
 * Hook para gestión de reservas
 */
export function useReservations() {
  const { data, loading, error, execute, reset, setData } = useApiState<any[]>([]);

  const getReservations = useCallback((params?: any) => {
    return execute(() => api.reservations.getAll(params));
  }, [execute]);

  const createReservation = useCallback(async (reservationData: any) => {
    try {
      const newReservation = await api.reservations.create(reservationData);
      setData(prev => prev ? [newReservation, ...prev] : [newReservation]);
      return newReservation;
    } catch (err) {
      throw err;
    }
  }, [setData]);

  const getReservation = useCallback((id: string) => {
    return execute(() => api.reservations.getById(id));
  }, [execute]);

  const updateReservation = useCallback(async (id: string, updateData: any) => {
    try {
      const updatedReservation = await api.reservations.update(id, updateData);
      setData(prev => 
        prev ? prev.map(res => res.id === id ? updatedReservation : res) : [updatedReservation]
      );
      return updatedReservation;
    } catch (err) {
      throw err;
    }
  }, [setData]);

  const cancelReservation = useCallback(async (id: string) => {
    try {
      await api.reservations.cancel(id);
      setData(prev => prev ? prev.filter(res => res.id !== id) : []);
    } catch (err) {
      throw err;
    }
  }, [setData]);

  const checkInReservation = useCallback(async (id: string) => {
    try {
      const result = await api.reservations.checkIn(id);
      setData(prev => 
        prev ? prev.map(res => res.id === id ? { ...res, status: 'CHECKED_IN' } : res) : []
      );
      return result;
    } catch (err) {
      throw err;
    }
  }, [setData]);

  const checkOutReservation = useCallback(async (id: string) => {
    try {
      const result = await api.reservations.checkOut(id);
      setData(prev => 
        prev ? prev.map(res => res.id === id ? { ...res, status: 'COMPLETED' } : res) : []
      );
      return result;
    } catch (err) {
      throw err;
    }
  }, [setData]);

  return {
    reservations: data,
    loading,
    error,
    getReservations,
    createReservation,
    getReservation,
    updateReservation,
    cancelReservation,
    checkInReservation,
    checkOutReservation,
    reset,
  };
}

/**
 * Hook para gestión del perfil de usuario
 */
export function useUserProfile() {
  const { data, loading, error, execute, reset } = useApiState<any>(null);

  const getProfile = useCallback(() => {
    return execute(() => api.users.getProfile());
  }, [execute]);

  const updateProfile = useCallback(async (profileData: any) => {
    return execute(() => api.users.updateProfile(profileData));
  }, [execute]);

  const getUserMemberships = useCallback(() => {
    return execute(() => api.users.getMemberships());
  }, [execute]);

  const getUserReservations = useCallback(() => {
    return execute(() => api.users.getReservations());
  }, [execute]);

  const getUserWaitingList = useCallback(() => {
    return execute(() => api.users.getWaitingList());
  }, [execute]);

  return {
    profile: data,
    loading,
    error,
    getProfile,
    updateProfile,
    getUserMemberships,
    getUserReservations,
    getUserWaitingList,
    reset,
  };
}

/**
 * Hook para gestión de lista de espera
 */
export function useWaitingList() {
  const { data, loading, error, execute, reset, setData } = useApiState<any[]>([]);

  const getWaitingList = useCallback((params?: any) => {
    return execute(() => api.waitingList.getAll(params));
  }, [execute]);

  const addToWaitingList = useCallback(async (waitingData: any) => {
    try {
      const newEntry = await api.waitingList.add(waitingData);
      setData(prev => prev ? [newEntry, ...prev] : [newEntry]);
      return newEntry;
    } catch (err) {
      throw err;
    }
  }, [setData]);

  const claimWaitingListSpot = useCallback(async (id: string) => {
    try {
      const result = await api.waitingList.claim(id);
      setData(prev => prev ? prev.filter(entry => entry.id !== id) : []);
      return result;
    } catch (err) {
      throw err;
    }
  }, [setData]);

  return {
    waitingList: data,
    loading,
    error,
    getWaitingList,
    addToWaitingList,
    claimWaitingListSpot,
    reset,
  };
}

/**
 * Hook para cálculo de precios
 */
export function usePricing() {
  const { data, loading, error, execute, reset } = useApiState<any>(null);

  const calculatePrice = useCallback((pricingData: any) => {
    return execute(() => api.pricing.calculate(pricingData));
  }, [execute]);

  return {
    pricing: data,
    loading,
    error,
    calculatePrice,
    reset,
  };
}

/**
 * Hook para gestión de torneos
 */
export function useTournaments() {
  const { data, loading, error, execute, reset, setData } = useApiState<any[]>([]);

  const getTournaments = useCallback((params?: any) => {
    return execute(() => api.tournaments.getAll(params));
  }, [execute]);

  const getTournament = useCallback((id: string) => {
    return execute(() => api.tournaments.getById(id));
  }, [execute]);

  const joinTournament = useCallback(async (id: string) => {
    try {
      const result = await api.tournaments.join(id);
      // Actualizar el estado local si es necesario
      return result;
    } catch (err) {
      throw err;
    }
  }, []);

  const leaveTournament = useCallback(async (id: string) => {
    try {
      const result = await api.tournaments.leave(id);
      // Actualizar el estado local si es necesario
      return result;
    } catch (err) {
      throw err;
    }
  }, []);

  const getTournamentMatches = useCallback((id: string) => {
    return execute(() => api.tournaments.getMatches(id));
  }, [execute]);

  return {
    tournaments: data,
    loading,
    error,
    getTournaments,
    getTournament,
    joinTournament,
    leaveTournament,
    getTournamentMatches,
    reset,
  };
}

/**
 * Hook para gestión de notificaciones
 */
export function useNotifications() {
  const { data, loading, error, execute, reset, setData } = useApiState<any[]>([]);

  const getNotifications = useCallback((params?: any) => {
    return execute(() => api.notifications.getAll(params));
  }, [execute]);

  const markAsRead = useCallback(async (id: string) => {
    try {
      await api.notifications.markAsRead(id);
      setData(prev => 
        prev ? prev.map(notif => notif.id === id ? { ...notif, read: true } : notif) : []
      );
    } catch (err) {
      throw err;
    }
  }, [setData]);

  return {
    notifications: data,
    loading,
    error,
    getNotifications,
    markAsRead,
    reset,
  };
}