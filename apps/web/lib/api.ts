/**
 * Cliente API para la aplicación web del polideportivo
 * Maneja todas las llamadas HTTP a la API backend
 */

// Base de la API: usar variable pública si está definida, sin barra final
const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002').replace(/\/$/, '');

/**
 * Configuración base para las peticiones fetch
 */
const defaultHeaders = {
  'Content-Type': 'application/json',
};

/**
 * Wrapper para fetch con manejo de errores
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const config: RequestInit = {
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
    ...options,
    credentials: 'include',
  };

  try {
    const response = await fetch(url, config);
    
    if (!response.ok) {
      let message = '';
      let code = '';
      let traceId = response.headers.get('x-request-id') || '';
      let details: any = undefined;
      try {
        const asJson = await response.json();
        message = asJson?.error || JSON.stringify(asJson);
        code = asJson?.code || '';
        details = asJson?.details;
        traceId = asJson?.traceId || traceId;
      } catch {
        try {
          message = await response.text();
        } catch {
          message = '';
        }
      }
      const err = new Error(message || `HTTP ${response.status}`) as any;
      if (code) err.code = code;
      if (traceId) err.traceId = traceId;
      if (details) err.details = details;
      throw err;
    }

    try {
      const data = await response.json();
      return data.data || data;
    } catch {
      const text = await response.text();
      return text as unknown as T;
    }
  } catch (error) {
    console.error(`API Error [${endpoint}]:`, error);
    throw error;
  }
}

/**
 * Servicios de API
 */
export const api = {
  // Centros deportivos
  centers: {
    getAll: (params?: {
      city?: string;
      sport?: string;
      amenity?: string;
      isActive?: boolean;
      hasParking?: boolean;
      latitude?: number;
      longitude?: number;
      radius?: number;
      page?: number;
      limit?: number;
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
      return apiRequest(`/api/centers${query ? `?${query}` : ''}`);
    },
    
    getById: (id: string) => 
      apiRequest(`/api/centers/${id}`),
    
    getCourts: (id: string) => 
      apiRequest(`/api/centers/${id}/courts`),
    
    getStats: (id: string) => 
      apiRequest(`/api/centers/${id}/stats`),
  },

  // Canchas
  courts: {
    getAll: (params?: {
      centerId?: string;
      sport?: string;
      surface?: string;
      isActive?: boolean;
      hasLighting?: boolean;
      isIndoor?: boolean;
      page?: number;
      limit?: number;
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
      return apiRequest(`/api/courts${query ? `?${query}` : ''}`)
        .then((res: any) => (Array.isArray(res?.courts) ? res.courts : res));
    },
    
    getById: (id: string) => 
      apiRequest(`/api/courts/${id}`),
    
    getAvailability: (id: string, params?: {
      date?: string;
      startTime?: string;
      endTime?: string;
      duration?: number;
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
      return apiRequest(`/api/courts/${id}/availability${query ? `?${query}` : ''}`);
    },
    
    getReservations: (id: string) => 
      apiRequest(`/api/courts/${id}/reservations`),
  },

  // Reservas
  reservations: {
    getAll: (params?: {
      userId?: string;
      courtId?: string;
      status?: string;
      startDate?: string;
      endDate?: string;
      page?: number;
      limit?: number;
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
      return apiRequest(`/api/reservations${query ? `?${query}` : ''}`);
    },
    
    create: (data: {
      courtId: string;
      startTime: string; // ISO
      duration: number;  // minutos
      paymentMethod?: 'stripe' | 'redsys' | 'credits' | 'CASH' | 'CARD' | 'TRANSFER';
      notes?: string;
    }) => 
      apiRequest('/api/reservations', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    
    getById: (id: string) => 
      apiRequest(`/api/reservations/${id}`),
    
    update: (id: string, data: Partial<{
      startTime: string;
      endTime: string;
      notes: string;
    }>) => 
      apiRequest(`/api/reservations/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    
    cancel: (id: string) => 
      apiRequest(`/api/reservations/${id}`, {
        method: 'DELETE',
      }),
    
    checkIn: (id: string) => 
      apiRequest(`/api/reservations/${id}/check-in`, {
        method: 'POST',
      }),
    
    checkOut: (id: string) => 
      apiRequest(`/api/reservations/${id}/check-out`, {
        method: 'POST',
      }),
  },

  // Usuarios
  users: {
    getProfile: () => 
      apiRequest('/api/users/profile'),
    
    updateProfile: (data: {
      firstName?: string;
      lastName?: string;
      phone?: string;
      preferences?: any;
    }) => 
      apiRequest('/api/users/profile', {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    
    getMemberships: () => 
      apiRequest('/api/users/memberships'),
    
    getReservations: () => 
      apiRequest('/api/users/reservations'),

    getUserHistory: (userId: string, params?: {
      startDate?: string;
      endDate?: string;
      status?: string;
      page?: number;
      limit?: number;
    }) => {
      const query = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined) {
            query.append(key, String(value));
          }
        });
      }
      return apiRequest(`/api/users/${userId}/reservations${query.toString() ? `?${query.toString()}` : ''}`);
    },
    
    getWaitingList: () => 
      apiRequest('/api/users/waiting-list'),
  },

  // Lista de espera
  waitingList: {
    getAll: (params?: {
      courtId?: string;
      status?: 'active' | 'notified' | 'expired' | 'claimed';
      page?: number;
      limit?: number;
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
      return apiRequest(`/api/waiting-list${query ? `?${query}` : ''}`);
    },
    
    add: (data: {
      courtId: string;
      preferredDate: string;
      preferredTime: string;
      duration: number;
      flexibleTime?: boolean;
      timeRange?: {
        start: string;
        end: string;
      };
      maxWaitDays?: number;
      notes?: string;
    }) => 
      apiRequest('/api/waiting-list', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    
    getById: (id: string) => 
      apiRequest(`/api/waiting-list/${id}`),
    
    claim: (id: string) => 
      apiRequest(`/api/waiting-list/${id}/claim`, {
        method: 'POST',
      }),
  },

  // Precios
  pricing: {
    calculate: (data: {
      courtId: string;
      startTime: string;  // ISO
      duration: number;   // minutos
      userId?: string;
    }) => 
      apiRequest('/api/pricing/calculate', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  // Torneos
  tournaments: {
    getAll: (params?: {
      sport?: string;
      status?: string;
      startDate?: string;
      endDate?: string;
      page?: number;
      limit?: number;
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
      return apiRequest(`/api/tournaments${query ? `?${query}` : ''}`);
    },
    
    getById: (id: string) => 
      apiRequest(`/api/tournaments/${id}`),
    
    join: (id: string) => 
      apiRequest(`/api/tournaments/${id}/join`, {
        method: 'POST',
      }),
    
    leave: (id: string) => 
      apiRequest(`/api/tournaments/${id}/leave`, {
        method: 'DELETE',
      }),
    
    getMatches: (id: string) => 
      apiRequest(`/api/tournaments/${id}/matches`),
  },

  // Notificaciones
  notifications: {
    getAll: (params?: {
      read?: boolean;
      type?: string;
      page?: number;
      limit?: number;
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
      return apiRequest(`/api/notifications${query ? `?${query}` : ''}`);
    },
    
    markAsRead: (id: string) => 
      apiRequest(`/api/notifications/${id}`, {
        method: 'PUT',
      }),
  },
};

export default api;