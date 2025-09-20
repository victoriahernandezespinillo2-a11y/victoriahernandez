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
    return execute(() => api.centers.getAll(params) as Promise<any[]>);
  }, [execute]);

  const getCenter = useCallback((id: string) => {
    return execute(() => api.centers.getById(id) as Promise<any>);
  }, [execute]);

  const getCenterCourts = useCallback((id: string) => {
    return execute(() => api.centers.getCourts(id) as Promise<any[]>);
  }, [execute]);

  const getCenterStats = useCallback((id: string) => {
    return execute(() => api.centers.getStats(id) as Promise<any>);
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

  // Normalizador robusto de Court desde cualquier shape legado
  const normalizeCourt = (c: any) => {
    if (!c) return null;
    const toNumber = (v: any) => (v == null ? 0 : Number(v));
    const amenities: string[] = Array.isArray((c as any).amenities)
      ? (c as any).amenities
      : [];
    const allowedSports: string[] = Array.isArray((c as any).allowedSports)
      ? (c as any).allowedSports
      : [];
    return {
      id: c.id,
      name: c.name,
      centerId: (c.centerId ?? (c.center?.id)) || c.center_id || '',
      sportType: (c.sportType ?? c.type ?? c.sport) || 'MULTIPURPOSE',
      pricePerHour: toNumber(c.pricePerHour ?? c.hourlyRate ?? c.basePricePerHour),
      capacity: toNumber(c.capacity),
      amenities,
      allowedSports,
      isMultiuse: Boolean((c as any).isMultiuse),
      lighting: Boolean((c as any).lighting ?? (c as any).hasLighting),
      lightingExtraPerHour: toNumber((c as any).lightingExtraPerHour),
      covered: Boolean((c as any).covered),
      createdAt: c.createdAt,
    };
  };

  const extractCourtsArray = (res: any): any[] => {
    if (Array.isArray(res)) return res;
    if (res && Array.isArray(res.data)) return res.data as any[];
    if (res && Array.isArray(res.courts)) return res.courts as any[];
    // Algunos endpoints devuelven { items: [] }
    if (res && Array.isArray(res.items)) return res.items as any[];
    return [];
  };

  const getCourts = useCallback((params?: any) => {
    return execute(async () => {
      const res: any = await api.courts.getAll(params as any);
      const raw = extractCourtsArray(res);
      const mapped = raw.map(normalizeCourt).filter(Boolean) as any[];
      return mapped;
    });
  }, [execute]);

  const getCourt = useCallback((id: string) => {
    return execute(async () => {
      const res: any = await api.courts.getById(id);
      const mapped = normalizeCourt(res);
      return mapped ? [mapped] : [];
    });
  }, [execute]);

  const getCourtAvailability = useCallback((id: string, params?: any) => {
    return execute(() => api.courts.getAvailability(id, params) as Promise<any[]>);
  }, [execute]);

  const getCourtReservations = useCallback((id: string) => {
    return execute(() => api.courts.getReservations(id) as Promise<any[]>);
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
    return execute(async () => {
      const res: any = await api.reservations.getAll(params as any);
      const rawList = Array.isArray(res?.reservations)
        ? res.reservations
        : Array.isArray(res)
        ? res
        : [];
      const mapped = rawList.map((r: any) => {
        const start = new Date(r.startTime);
        const end = new Date(r.endTime);
        const toTime = (d: Date) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        // Mapeo robusto y específico de estados
        const statusMap: Record<string, 'confirmed' | 'pending' | 'cancelled' | 'completed' | 'no-show'> = {
          PENDING: 'pending',
          PAID: 'confirmed',
          IN_PROGRESS: 'confirmed',
          COMPLETED: 'completed',
          CANCELLED: 'cancelled',
          NO_SHOW: 'no-show', // Estado específico para no presentarse
        };
        const uiStatus = statusMap[(r.status || '').toUpperCase()] || 'pending';
        
        // Determinar estado de pago de manera robusta y específica
        let paymentStatus: 'paid' | 'pending' | 'refunded' = 'pending';
        const reservationStatus = (r.status || '').toUpperCase();
        
        switch (reservationStatus) {
          case 'PENDING':
            paymentStatus = 'pending'; // Reserva pendiente = no pagada
            break;
          case 'PAID':
          case 'IN_PROGRESS':
          case 'COMPLETED':
            paymentStatus = 'paid'; // Reserva pagada, en progreso o completada = pagada
            break;
          case 'NO_SHOW':
            // NO_SHOW: El usuario no se presentó, pero la reserva estaba pagada
            paymentStatus = r.paymentMethod ? 'paid' : 'pending';
            break;
          case 'CANCELLED':
            // CANCELLED: Reserva cancelada, verificar si se había pagado
            if (r.paymentMethod) {
              // Si tenía método de pago, verificar si ya pasó la fecha (reembolso)
              const reservationDate = new Date(r.startTime);
              const now = new Date();
              paymentStatus = reservationDate < now ? 'refunded' : 'paid';
            } else {
              paymentStatus = 'pending';
            }
            break;
          default:
            paymentStatus = 'pending';
            break;
        }
        return {
          id: r.id,
          courtName: r.court?.name || '—',
          courtType: r.court?.sportType || '—',
          date: r.startTime,
          startTime: toTime(start),
          endTime: toTime(end),
          duration: Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000)),
          status: uiStatus,
          cost: Number(r.totalPrice || 0),
          paymentStatus,
          createdAt: r.createdAt,
          notes: r.notes || undefined,
          // Incluir información del centro para cálculos precisos
          center: r.court?.center || null,
        };
      });
      return mapped as any[];
    });
  }, [execute]);

  const createReservation = useCallback(async (reservationData: any) => {
    try {
      const response = await api.reservations.create(reservationData);
      const r: any = (response as any)?.reservation || response;
      const start = new Date(r.startTime);
      const end = new Date(r.endTime);
      const toTime = (d: Date) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      // Mapeo robusto y específico de estados
      const statusMap: Record<string, 'confirmed' | 'pending' | 'cancelled' | 'completed' | 'no-show'> = {
        PENDING: 'pending',
        PAID: 'confirmed',
        IN_PROGRESS: 'confirmed',
        COMPLETED: 'completed',
        CANCELLED: 'cancelled',
        NO_SHOW: 'no-show', // Estado específico para no presentarse
      };
      const uiStatus = statusMap[(r.status || '').toUpperCase()] || 'pending';
      
      // Determinar estado de pago de manera robusta y específica
      let paymentStatus: 'paid' | 'pending' | 'refunded' = 'pending';
      const reservationStatus = (r.status || '').toUpperCase();
      
      switch (reservationStatus) {
        case 'PENDING':
          paymentStatus = 'pending'; // Reserva pendiente = no pagada
          break;
        case 'PAID':
        case 'IN_PROGRESS':
        case 'COMPLETED':
          paymentStatus = 'paid'; // Reserva pagada, en progreso o completada = pagada
          break;
        case 'NO_SHOW':
          // NO_SHOW: El usuario no se presentó, pero la reserva estaba pagada
          paymentStatus = r.paymentMethod ? 'paid' : 'pending';
          break;
        case 'CANCELLED':
          // CANCELLED: Reserva cancelada, verificar si se había pagado
          if (r.paymentMethod) {
            // Si tenía método de pago, verificar si ya pasó la fecha (reembolso)
            const reservationDate = new Date(r.startTime);
            const now = new Date();
            paymentStatus = reservationDate < now ? 'refunded' : 'paid';
          } else {
            paymentStatus = 'pending';
          }
          break;
        default:
          paymentStatus = 'pending';
          break;
      }
      const mapped = {
        id: r.id,
        courtName: r.court?.name || '—',
        courtType: r.court?.sportType || '—',
        date: r.startTime,
        startTime: toTime(start),
        endTime: toTime(end),
        duration: Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000)),
        status: uiStatus,
        cost: Number(r.totalPrice || 0),
        paymentStatus,
        createdAt: r.createdAt,
        notes: r.notes || undefined,
        // Incluir información del centro para cálculos precisos
        center: r.court?.center || null,
      };
      setData(prev => (prev ? [mapped, ...prev] : [mapped]));
      return response;
    } catch (err) {
      throw err;
    }
  }, [setData]);

  const getReservation = useCallback((id: string) => {
    return execute(() => api.reservations.getById(id) as Promise<any>);
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
    return execute(() => api.users.getProfile() as Promise<any>);
  }, [execute]);

  const updateProfile = useCallback(async (profileData: any) => {
    return execute(() => api.users.updateProfile(profileData) as Promise<any>);
  }, [execute]);

  const getUserMemberships = useCallback(() => {
    return execute(() => api.users.getMemberships() as Promise<any[]>);
  }, [execute]);

  const getUserReservations = useCallback(() => {
    return execute(() => api.users.getReservations() as Promise<any[]>);
  }, [execute]);

  const getUserWaitingList = useCallback(() => {
    return execute(() => api.users.getWaitingList() as Promise<any[]>);
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
    return execute(() => api.waitingList.getAll(params) as Promise<any[]>);
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
    return execute(() => api.pricing.calculate(pricingData) as Promise<any>);
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
    return execute(() => api.tournaments.getAll(params) as Promise<any[]>);
  }, [execute]);

  const getTournament = useCallback((id: string) => {
    return execute(() => api.tournaments.getById(id) as Promise<any>);
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
    return execute(() => api.tournaments.getMatches(id) as Promise<any[]>);
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
    return execute(() => api.notifications.getAll(params) as Promise<any[]>);
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

/**
 * Hook para obtener historial de reservas del usuario
 */
export function useUserHistory() {
  const { data, loading, error, execute, reset } = useApiState<any>(null);

  const getUserHistory = useCallback((userId: string, params?: {
    page?: number;
    limit?: number;
    status?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    return execute(async () => {
      const response = await api.users.getUserHistory(userId, params);
      // La API devuelve { reservations: [...], pagination: {...} }
      // pero el componente espera { reservations: [...] }
      return {
        reservations: response.reservations || [],
        pagination: response.pagination || { page: 1, limit: 20, total: 0, pages: 1 }
      };
    });
  }, [execute]);

  return {
    historyData: data,
    loading,
    error,
    getUserHistory,
    reset,
  };
}