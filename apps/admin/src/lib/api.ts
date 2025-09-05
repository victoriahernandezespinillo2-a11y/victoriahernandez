/**
 * Cliente API para la aplicación admin del polideportivo
 * Maneja todas las llamadas HTTP a la API backend con funcionalidades administrativas
 */

// Para evitar CORS en desarrollo, por defecto usamos rutas relativas
// y dejamos que Next.js (rewrites) proxy a la API.
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

// Tipos para la API
interface ApiError extends Error {
  code?: string;
  traceId?: string;
  details?: unknown;
}

interface ApiResponse<T> {
  data?: T;
  error?: string;
  code?: string;
  traceId?: string;
  details?: unknown;
}

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

interface UserData {
  id: string;
  email: string;
  name?: string;
  firstName?: string;
  givenName?: string;
  lastName?: string;
  familyName?: string;
  isActive?: boolean;
  role?: string;
  membershipType?: string;
  lastLoginAt?: string;
  lastLogin?: string;
  phone?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface Center {
  id: string;
  name: string;
  address: string;
  city: string;
  phone: string;
  email: string;
  description: string;
  openingHours: string;
  closingHours: string;
  status: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';
  courtsCount: number;
  capacity: number;
  createdAt: string;
}

class ApiClient {
  private baseURL: string;
  private inFlight: Map<string, Promise<unknown>> = new Map();

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  private async getHeaders(method: string): Promise<HeadersInit> {
    // Evitar 'Content-Type: application/json' en GET para no forzar preflight CORS innecesario
    const isGet = method.toUpperCase() === 'GET';
    const headers: HeadersInit = {};
    if (!isGet) {
      headers['Content-Type'] = 'application/json';
    }
    return headers;
  }

  public async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const method = (options.method || 'GET').toString().toUpperCase();
    const headers = await this.getHeaders(method);
    const absoluteUrl = `${this.baseURL}${endpoint}`;
    const relativeUrl = `${endpoint}`;

    const config: RequestInit = {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
      credentials: 'include',
    };

    const doRequest = async (): Promise<T> => {
      try {
        let response: Response | null = null;
        // Preferir relativo para evitar CORS; si falla, probar absoluto si hay baseURL
        try {
          response = await fetch(relativeUrl, { ...config, credentials: 'include' });
          // Si recibimos 404 y existe baseURL, intentar absoluto (algunos endpoints solo viven en API)
          if (response.status === 404 && this.baseURL) {
            response = await fetch(absoluteUrl, { ...config, credentials: 'include' });
          }
        } catch (networkErr) {
          const looksLikeNetworkError = networkErr instanceof TypeError;
          if (this.baseURL && looksLikeNetworkError) {
            response = await fetch(absoluteUrl, { ...config, credentials: 'include' });
          } else {
            throw networkErr;
          }
        }

        if (!response.ok) {
                  let message = '';
        let code = '';
        let traceId = response.headers.get('x-request-id') || '';
        let details: unknown = undefined;
        try {
          const asJson = await response.json() as ApiResponse<unknown>;
          message = asJson?.error || JSON.stringify(asJson);
          code = asJson?.code || '';
          details = asJson?.details;
          traceId = asJson?.traceId || traceId;
        } catch {
          try { message = await response.text(); } catch { message = ''; }
        }
        if (response.status >= 400 && response.status < 500) {
          console.warn('API 4xx', { method, endpoint, status: response.status, code, traceId, details, body: options.body });
        }
        let detailMsg = '';
        if (Array.isArray(details) && details.length > 0) {
          const d = details[0] as { field?: string; path?: string; message?: string };
          const field = (d?.field || d?.path || '').toString();
          const dm = (d?.message || '').toString();
          if (field || dm) detailMsg = ` (${[field, dm].filter(Boolean).join(': ')})`;
        }
        const err = new Error(`HTTP ${response.status} ${method} ${endpoint}: ${message || 'Unknown error'}${detailMsg}`) as ApiError;
        if (code) err.code = code;
        if (traceId) err.traceId = traceId;
        if (details) err.details = details;
        throw err;
        }

        try {
          const data = await response.json() as ApiResponse<T>;
          return data.data || data as T;
        } catch {
          const text = await response.text();
          return text as unknown as T;
        }
      } catch (error) {
        console.error(`API Error [${method} ${endpoint}]:`, error);
        throw error;
      }
    };

    if (method === 'GET') {
      // Usar URL absoluta como clave, porque relativa y absoluta resuelven mismo recurso
      const key = absoluteUrl || relativeUrl;
      const existing = this.inFlight.get(key);
      if (existing) {
        return existing as Promise<T>;
      }
      const promise = doRequest();
      this.inFlight.set(key, promise);
      try { 
        return await promise; 
      } finally { 
        this.inFlight.delete(key); 
      }
    }

    return doRequest();
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

    getAllWithMeta: (params?: {
      search?: string;
      role?: string;
      status?: string;
      hasReservations?: boolean;
      hasMemberships?: boolean;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
      page?: number;
      limit?: number;
    }) => {
      const sp = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          if (v === undefined || v === null || v === '') return;
          sp.append(k, String(v));
        });
      }
      const q = sp.toString();
      const doMap = (payload: unknown) => {
        const raw = payload as { data?: unknown; users?: unknown; pagination?: PaginationMeta } || payload;
        const arr = Array.isArray(raw?.data)
          ? raw.data
          : Array.isArray(raw?.users)
            ? raw.users
            : Array.isArray(raw)
              ? raw
              : [];
        const pagination = raw?.pagination || {
          page: params?.page || 1,
          limit: params?.limit || arr.length,
          total: arr.length,
          pages: Math.max(1, Math.ceil(arr.length / (params?.limit || arr.length || 1)))
        };
        const mapped = arr.map((u: UserData) => {
          const fullName: string = u.name || '';
          const [firstName, ...rest] = fullName.split(' ');
          const lastName = rest.join(' ');
          const status = u.isActive === false ? 'INACTIVE' : 'ACTIVE';
          return {
            id: u.id,
            email: u.email,
            firstName: u.firstName || firstName || u.givenName || '',
            lastName: u.lastName || lastName || u.familyName || '',
            role: u.role,
            membershipType: u.membershipType || null,
            status,
            createdAt: u.createdAt,
            lastLogin: u.lastLoginAt || u.lastLogin || null,
            phone: u.phone || '',
          };
        });
        return { items: mapped, pagination };
      };

      const base = `/api/admin/users${q ? `?${q}` : ''}`;
      return fetch(base, { credentials: 'include', headers: { 'Content-Type': 'application/json' } })
        .then(async (resp) => {
          if (resp.ok) return doMap(await resp.json());
          // Fallback para roles no ADMIN: intentar /api/users (STAFF)
          if (resp.status === 401 || resp.status === 403 || resp.status === 404) {
            const alt = `/api/users${q ? `?${q}` : ''}`;
            const r2 = await fetch(alt, { credentials: 'include', headers: { 'Content-Type': 'application/json' } });
            if (r2.ok) return doMap(await r2.json());
          }
          const text = await resp.text().catch(() => '');
          throw new Error(`HTTP ${resp.status}: ${text}`);
        });
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
      return apiClient
        .request(`/api/admin/users${query ? `?${query}` : ''}`)
        .then((res: any) => {
          const list = Array.isArray(res)
            ? res
            : Array.isArray(res?.users)
              ? res.users
              : Array.isArray(res?.data?.users)
                ? res.data.users
                : Array.isArray(res?.data)
                  ? res.data
                  : Array.isArray(res?.items)
                    ? res.items
                    : [];
          // Mapear a forma esperada por UI (firstName/lastName/status/lastLogin)
          return list.map((u: any) => {
            const name: string = u.name || '';
            const [firstName, ...rest] = name.split(' ');
            const lastName = rest.join(' ');
            const status = u.isActive === false ? 'INACTIVE' : 'ACTIVE';
            return {
              id: u.id,
              email: u.email,
              firstName: u.firstName || firstName || u.givenName || '',
              lastName: u.lastName || lastName || u.familyName || '',
              role: u.role,
              membershipType: u.membershipType || null,
              status,
              createdAt: u.createdAt,
              lastLogin: u.lastLoginAt || u.lastLogin || null,
            };
          });
        });
    },
    
    create: (data: {
      email: string;
      firstName: string;
      lastName: string;
      role: string;
      phone?: string;
      password: string;
    }) => {
      // Backend espera 'password', 'name' y 'isActive' en CreateUserSchema
      const payload = {
        email: data.email,
        password: data.password,
        name: `${data.firstName || ''} ${data.lastName || ''}`.trim(),
        role: data.role,
        phone: data.phone,
        isActive: true,
      };
      

      
      return apiClient.request('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    
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
      status?: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';
      page?: number;
      limit?: number;
      sortBy?: 'name' | 'createdAt' | 'courtsCount' | 'reservationsCount';
      sortOrder?: 'asc' | 'desc';
      includeStats?: boolean;
    }) => {
      const allowedKeys = new Set(['search','status','page','limit','sortBy','sortOrder','includeStats']);
      const searchParams = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && allowedKeys.has(key)) {
            searchParams.append(key, String(value));
          }
        });
      }
      const query = searchParams.toString();
      return apiClient
        .request(`/api/admin/centers${query ? `?${query}` : ''}`)
        .then((res: any) => {
          if (Array.isArray(res)) return res as Center[];
          if (Array.isArray(res?.data)) return res.data as Center[];
          if (Array.isArray(res?.items)) return res.items as Center[];
          return [] as Center[];
        });
    },
    
    create: (data: {
      name: string;
      address?: string;
      phone?: string;
      email?: string;
      description?: string;
      website?: string;
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
      sport?: 'FOOTBALL' | 'BASKETBALL' | 'TENNIS' | 'VOLLEYBALL' | 'PADDLE' | 'SQUASH';
      status?: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';
      search?: string;
      page?: number;
      limit?: number;
      sortBy?: 'name' | 'sport' | 'createdAt' | 'reservationsCount' | 'revenue';
      sortOrder?: 'asc' | 'desc';
      includeStats?: boolean;
    }) => {
      const allowedKeys = new Set(['centerId','sport','status','search','page','limit','sortBy','sortOrder','includeStats']);
      const searchParams = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value === undefined || value === null) return;
          if (!allowedKeys.has(key)) return;
          // Normalizar tipos esperados por la API
          if (key === 'includeStats') {
            searchParams.append(key, value ? 'true' : 'false');
          } else if (key === 'page' || key === 'limit') {
            const n = Number(value);
            if (!Number.isFinite(n)) return;
            searchParams.append(key, String(n));
          } else {
            searchParams.append(key, String(value));
          }
        });
      }
      const query = searchParams.toString();
      return apiClient
        .request(`/api/admin/courts${query ? `?${query}` : ''}`)
        .then((res: any) => (Array.isArray(res?.data) ? res.data : res));
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
      isMultiuse?: boolean;
      allowedSports?: string[];
    }) => 
      apiClient.request('/api/admin/courts', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    
    getById: (id: string) => 
      apiClient.request(`/api/admin/courts/${id}`),

    getAvailability: (id: string, date: string) =>
      apiClient.request(`/api/admin/courts/${id}/availability?date=${encodeURIComponent(date)}`),
    
    update: (id: string, data: Partial<{
      name: string;
      sport: string;
      surface: string;
      isIndoor: boolean;
      hasLighting: boolean;
      maxPlayers: number;
      hourlyRate: number;
      isActive: boolean;
      isMultiuse: boolean;
      allowedSports: string[];
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
      // Usar endpoint administrativo para listar todas las reservas
      return apiClient.request(`/api/admin/reservations${query ? `?${query}` : ''}`)
        .then((payload: any) => {
          const raw = payload?.data || payload;
          const arr = Array.isArray(raw?.data) ? raw.data : (Array.isArray(raw) ? raw : []);
          return arr as any;
        });
    },
    
    getById: (id: string) => 
      apiClient.request(`/api/admin/reservations/${id}`),
    
    update: (id: string, data: Partial<{
      status: string;
      startTime: string;
      endTime: string;
      notes: string;
    }>) => 
      apiClient.request(`/api/admin/reservations/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    
    cancel: (id: string) => 
      apiClient.request(`/api/admin/reservations/${id}`, {
        method: 'DELETE',
      }),

    generatePaymentLink: async (reservationId: string): Promise<{ url: string }> => {
      return await apiClient.request(`/api/admin/reservations/payments/link`, {
        method: 'POST',
        body: JSON.stringify({ reservationId }),
      });
    },

    refund: (reservationId: string, data: { amount?: number; reason: string }) =>
      apiClient.request(`/api/admin/reservations/${reservationId}/refund`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    resendNotification: (reservationId: string, data: { type: 'CONFIRMATION'|'PAYMENT_LINK'; channel?: 'EMAIL'|'SMS' }) =>
      apiClient.request(`/api/admin/reservations/${reservationId}/notifications/resend`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    checkIn: (reservationId: string) =>
      apiClient.request(`/api/admin/reservations/${reservationId}/check-in`, { method: 'POST' }),

    checkOut: (reservationId: string) =>
      apiClient.request(`/api/admin/reservations/${reservationId}/check-out`, { method: 'POST' }),

    getAudit: (reservationId: string) =>
      apiClient.request(`/api/admin/reservations/${reservationId}/audit`),

    exportAuditCsv: (reservationId: string) =>
      apiClient.request(`/api/admin/reservations/${reservationId}/audit/csv`),
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
      return apiClient
        .request(`/api/tournaments${query ? `?${query}` : ''}`)
        .then((res: any) => {
          // Normalizar a array para el hook: res puede ser { tournaments, pagination }
          if (Array.isArray(res)) return res;
          if (Array.isArray(res?.tournaments)) return res.tournaments;
          if (Array.isArray(res?.data?.tournaments)) return res.data.tournaments;
          return [];
        });
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
      status?: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'REFUNDED';
      provider?: 'STRIPE' | 'REDSYS' | 'MANUAL';
      dateFrom?: string; // ISO
      dateTo?: string;   // ISO
      page?: number;
      limit?: number;
    }) => {
      const searchParams = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value === undefined || value === null) return;
          // Mapear antiguos nombres a los esperados por la API
          if (key === 'method') return; // no soportado por schema
          if (key === 'startDate') { searchParams.append('dateFrom', String(value)); return; }
          if (key === 'endDate') { searchParams.append('dateTo', String(value)); return; }
          // Enviar en mayúsculas los enums
          if (key === 'status' || key === 'provider') {
            searchParams.append(key, String(value).toUpperCase());
            return;
          }
          searchParams.append(key, String(value));
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

  // Gestión de precios (pricing)
  pricing: {
    calculate: (data: { courtId: string; startTime: string; duration: number; userId?: string }) =>
      apiClient.request('/api/pricing/calculate', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    getRules: (params?: { courtId?: string; centerId?: string; sport?: string; isActive?: boolean; page?: number; limit?: number }) => {
      const searchParams = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            searchParams.append(key, String(value));
          }
        });
      }
      const query = searchParams.toString();
      return apiClient.request(`/api/pricing/rules${query ? `?${query}` : ''}`);
    },

    createRule: (data: any) =>
      apiClient.request('/api/pricing/rules', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    getRuleById: (id: string) =>
      apiClient.request(`/api/pricing/rules/${id}`),

    updateRule: (id: string, data: any) =>
      apiClient.request(`/api/pricing/rules/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    deleteRule: (id: string) =>
      apiClient.request(`/api/pricing/rules/${id}`, {
        method: 'DELETE',
      }),

    testRule: (id: string, data: { courtId: string; startTime: string; duration: number; userId?: string; membershipId?: string }) =>
      apiClient.request(`/api/pricing/rules/${id}/test`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
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
      return apiClient
        .request(`/api/maintenance${query ? `?${query}` : ''}`)
        .then((res: any) => {
          if (Array.isArray(res)) return res;
          if (Array.isArray(res?.maintenances)) return res.maintenances;
          if (Array.isArray(res?.data?.maintenances)) return res.data.maintenances;
          return [];
        });
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

  // Notificaciones
  notifications: {
    getAll: (params?: {
      userId?: string;
      type?: 'EMAIL' | 'SMS' | 'PUSH' | 'IN_APP';
      category?: string;
      status?: string;
      read?: boolean;
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    }) => {
      const searchParams = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            searchParams.append(key, String(value));
          }
        });
      }
      const query = searchParams.toString();
      return apiClient
        .request(`/api/notifications${query ? `?${query}` : ''}`)
        .then((res: any) => {
          if (Array.isArray(res)) return res;
          if (Array.isArray(res?.notifications)) return res.notifications;
          if (Array.isArray(res?.data?.notifications)) return res.data.notifications;
          return [];
        });
    },

    markAsRead: (id: string) =>
      apiClient.request(`/api/notifications/${id}`, {
        method: 'PUT',
      }),

    markAllAsRead: () =>
      apiClient.request('/api/notifications/read-all', {
        method: 'POST',
      }),

    stats: (params?: { userId?: string }) => {
      const sp = new URLSearchParams();
      if (params?.userId) sp.append('userId', params.userId);
      const q = sp.toString();
      return apiClient.request(`/api/notifications/stats${q ? `?${q}` : ''}`);
    },

    // Nuevas funcionalidades para crear y enviar notificaciones
    create: (data: {
      userId?: string;
      type: 'EMAIL' | 'SMS' | 'PUSH' | 'IN_APP';
      title: string;
      message: string;
      category?: 'RESERVATION' | 'PAYMENT' | 'TOURNAMENT' | 'MAINTENANCE' | 'MEMBERSHIP' | 'SYSTEM' | 'MARKETING' | 'REMINDER';
      priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
      scheduledFor?: string;
      data?: Record<string, any>;
      actionUrl?: string;
    }) =>
      apiClient.request('/api/notifications', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    sendDirect: (data: {
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
    }) =>
      apiClient.request('/api/notifications/send', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    // Envío masivo de notificaciones
    sendBulk: (data: {
      type: 'email' | 'sms';
      recipients: string[];
      subject?: string;
      message: string;
      template?: string;
      data?: Record<string, any>;
    }) =>
      apiClient.request('/api/notifications/bulk', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  // Membresías
  memberships: {
    getAll: (params?: {
      page?: number;
      limit?: number;
      status?: string;
      type?: string;
      userId?: string;
      centerId?: string;
    }) => {
      const sp = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          if (v === undefined || v === null) return;
          if (k === 'limit') {
            const n = Math.min(100, Math.max(1, Number(v)));
            sp.append('limit', String(Number.isFinite(n) ? n : 20));
            return;
          }
          if (k === 'page') {
            const n = Math.max(1, Number(v));
            sp.append('page', String(Number.isFinite(n) ? n : 1));
            return;
          }
          sp.append(k, String(v));
        });
      }
      const q = sp.toString();
      return apiClient
        .request(`/api/memberships${q ? `?${q}` : ''}`)
        .then((res: any) => {
          if (Array.isArray(res)) return res;
          if (Array.isArray(res?.memberships)) return res.memberships;
          if (Array.isArray(res?.data?.memberships)) return res.data.memberships;
          return [];
        });
    },

    create: (data: any) =>
      apiClient.request('/api/memberships', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    getById: (id: string) => apiClient.request(`/api/memberships/${id}`),

    update: (id: string, data: any) =>
      apiClient.request(`/api/memberships/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    delete: (id: string) =>
      apiClient.request(`/api/memberships/${id}`, {
        method: 'DELETE',
      }),
  },
};

export default adminApi;