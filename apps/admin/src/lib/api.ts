/**
 * Cliente API para la aplicación admin del polideportivo
 * Maneja todas las llamadas HTTP a la API backend con funcionalidades administrativas
 */

import { getSession } from 'next-auth/react';

// Para evitar CORS en desarrollo, por defecto usamos rutas relativas
// y dejamos que Next.js (rewrites) proxy a la API.
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  private async getHeaders(): Promise<HeadersInit> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    // NextAuth maneja la autenticación a través de cookies
    // No necesitamos agregar Authorization header manualmente
    // Las cookies de sesión se incluyen automáticamente con credentials: 'include'

    return headers;
  }

  public async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const headers = await this.getHeaders();

    const config: RequestInit = {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
      credentials: 'include',
    };

    try {
      const response = await fetch(url, { ...config, credentials: 'include' });

      if (!response.ok) {
        let message = '';
        try {
          const asJson = await response.json();
          message = asJson?.error || JSON.stringify(asJson);
        } catch {
          try {
            message = await response.text();
          } catch {
            message = '';
          }
        }
        throw new Error(`HTTP ${response.status}: ${message || 'Unknown error'}`);
      }

      // Intentar JSON; si no, retornar texto para diagnóstico
      try {
        const data = await response.json();
        return (data as any).data || data;
      } catch {
        const text = await response.text();
        return text as unknown as T;
      }
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error);
      throw error;
    }
  }
}

// Instancia del cliente API
const apiClient = new ApiClient();

/**
 * Servicios de API para administración
 */
export const adminApi = {
  // Dashboard
  dashboard: {
    getStats: () => 
      apiClient.request('/api/admin/dashboard'),
    
    getGeneralStats: () => 
      apiClient.request('/api/admin/stats'),
    
    getRecentActivity: (params?: {
      limit?: number;
      hours?: number;
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
      return apiClient.request(`/api/admin/activity${query ? `?${query}` : ''}`);
    },
  },

  // Gestión de usuarios
  users: {
    getAll: (params?: {
      search?: string;
      role?: string;
      status?: string;
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
      return apiClient.request(`/api/admin/users${query ? `?${query}` : ''}`);
    },
    
    create: (data: {
      email: string;
      firstName: string;
      lastName: string;
      role: string;
      phone?: string;
    }) => 
      apiClient.request('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    
    getById: (id: string) => 
      apiClient.request(`/api/admin/users/${id}`),
    
    update: (id: string, data: Partial<{
      firstName: string;
      lastName: string;
      email: string;
      role: string;
      phone: string;
      isActive: boolean;
    }>) => 
      apiClient.request(`/api/admin/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    
    delete: (id: string) => 
      apiClient.request(`/api/admin/users/${id}`, {
        method: 'DELETE',
      }),
  },

  // Gestión de centros
  centers: {
    getAll: (params?: {
      search?: string;
      city?: string;
      isActive?: boolean;
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
      return apiClient.request(`/api/admin/centers${query ? `?${query}` : ''}`);
    },
    
    create: (data: {
      name: string;
      description?: string;
      address: string;
      city: string;
      phone: string;
      email?: string;
      settings: any;
    }) => 
      apiClient.request('/api/admin/centers', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    
    getById: (id: string) => 
      apiClient.request(`/api/admin/centers/${id}`),
    
    update: (id: string, data: Partial<{
      name: string;
      description: string;
      address: string;
      city: string;
      phone: string;
      email: string;
      settings: any;
      isActive: boolean;
    }>) => 
      apiClient.request(`/api/admin/centers/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    
    delete: (id: string) => 
      apiClient.request(`/api/admin/centers/${id}`, {
        method: 'DELETE',
      }),
  },

  // Gestión de canchas
  courts: {
    getAll: (params?: {
      centerId?: string;
      sport?: string;
      surface?: string;
      isActive?: boolean;
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
      return apiClient.request(`/api/admin/courts${query ? `?${query}` : ''}`);
    },
    
    create: (data: {
      name: string;
      centerId: string;
      sport: string;
      surface: string;
      isIndoor: boolean;
      hasLighting: boolean;
      maxPlayers: number;
      hourlyRate: number;
    }) => 
      apiClient.request('/api/admin/courts', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    
    getById: (id: string) => 
      apiClient.request(`/api/admin/courts/${id}`),
    
    update: (id: string, data: Partial<{
      name: string;
      sport: string;
      surface: string;
      isIndoor: boolean;
      hasLighting: boolean;
      maxPlayers: number;
      hourlyRate: number;
      isActive: boolean;
    }>) => 
      apiClient.request(`/api/admin/courts/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    
    delete: (id: string) => 
      apiClient.request(`/api/admin/courts/${id}`, {
        method: 'DELETE',
      }),
  },

  // Gestión de reservas
  reservations: {
    getAll: (params?: {
      userId?: string;
      courtId?: string;
      centerId?: string;
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
      return apiClient.request(`/api/reservations${query ? `?${query}` : ''}`);
    },
    
    getById: (id: string) => 
      apiClient.request(`/api/reservations/${id}`),
    
    update: (id: string, data: Partial<{
      status: string;
      startTime: string;
      endTime: string;
      notes: string;
    }>) => 
      apiClient.request(`/api/reservations/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    
    cancel: (id: string) => 
      apiClient.request(`/api/reservations/${id}`, {
        method: 'DELETE',
      }),
  },

  // Gestión de torneos
  tournaments: {
    getAll: (params?: {
      sport?: string;
      status?: string;
      centerId?: string;
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
      return apiClient.request(`/api/tournaments${query ? `?${query}` : ''}`);
    },
    
    create: (data: {
      name: string;
      description?: string;
      sport: string;
      centerId: string;
      startDate: string;
      endDate: string;
      maxParticipants: number;
      entryFee: number;
      rules?: string;
    }) => 
      apiClient.request('/api/tournaments', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    
    getById: (id: string) => 
      apiClient.request(`/api/tournaments/${id}`),
    
    update: (id: string, data: Partial<{
      name: string;
      description: string;
      startDate: string;
      endDate: string;
      maxParticipants: number;
      entryFee: number;
      rules: string;
      status: string;
    }>) => 
      apiClient.request(`/api/tournaments/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    
    delete: (id: string) => 
      apiClient.request(`/api/tournaments/${id}`, {
        method: 'DELETE',
      }),
  },

  // Gestión de pagos
  payments: {
    getAll: (params?: {
      userId?: string;
      status?: string;
      method?: string;
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
      return apiClient.request(`/api/payments${query ? `?${query}` : ''}`);
    },
    
    getById: (id: string) => 
      apiClient.request(`/api/payments/${id}`),
    
    refund: (id: string, data: {
      amount?: number;
      reason: string;
    }) => 
      apiClient.request(`/api/payments/${id}/refund`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    
    getStats: () => 
      apiClient.request('/api/payments/stats'),
  },

  // Reportes
  reports: {
    getRevenue: (params?: {
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
      return apiClient.request(`/api/admin/reports/revenue${query ? `?${query}` : ''}`);
    },
    
    getUsage: (params?: {
      startDate?: string;
      endDate?: string;
      centerId?: string;
      courtId?: string;
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
      return apiClient.request(`/api/admin/reports/usage${query ? `?${query}` : ''}`);
    },
    
    getCustomers: (params?: {
      startDate?: string;
      endDate?: string;
      centerId?: string;
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
      return apiClient.request(`/api/admin/reports/customers${query ? `?${query}` : ''}`);
    },
  },

  // Mantenimiento
  maintenance: {
    getAll: (params?: {
      courtId?: string;
      status?: string;
      type?: string;
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
      return apiClient.request(`/api/maintenance${query ? `?${query}` : ''}`);
    },
    
    create: (data: {
      courtId: string;
      type: string;
      description: string;
      scheduledDate: string;
      estimatedDuration: number;
      priority: string;
    }) => 
      apiClient.request('/api/maintenance', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    
    getById: (id: string) => 
      apiClient.request(`/api/maintenance/${id}`),
    
    update: (id: string, data: Partial<{
      type: string;
      description: string;
      scheduledDate: string;
      estimatedDuration: number;
      priority: string;
      status: string;
    }>) => 
      apiClient.request(`/api/maintenance/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    
    start: (id: string) => 
      apiClient.request(`/api/maintenance/${id}/start`, {
        method: 'POST',
      }),
    
    complete: (id: string, data: {
      notes?: string;
      actualDuration?: number;
    }) => 
      apiClient.request(`/api/maintenance/${id}/complete`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    
    delete: (id: string) => 
      apiClient.request(`/api/maintenance/${id}`, {
        method: 'DELETE',
      }),
  },
};

export default adminApi;