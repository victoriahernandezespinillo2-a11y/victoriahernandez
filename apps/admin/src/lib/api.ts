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

    console.log(`🌐 API Request [${method}] ${endpoint}`);
    console.log('📍 URLs:', { relativeUrl, absoluteUrl, baseURL: this.baseURL });

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
          console.log(`🔄 Intentando llamada relativa: ${relativeUrl}`);
          response = await fetch(relativeUrl, { ...config, credentials: 'include' });
          console.log(`📡 Respuesta relativa:`, { status: response.status, statusText: response.statusText });
          
          // Si recibimos 404 y existe baseURL, intentar absoluto (algunos endpoints solo viven en API)
          if (response.status === 404 && this.baseURL) {
            console.log(`🔄 404 recibido, intentando absoluta: ${absoluteUrl}`);
            response = await fetch(absoluteUrl, { ...config, credentials: 'include' });
            console.log(`📡 Respuesta absoluta:`, { status: response.status, statusText: response.statusText });
          }
        } catch (networkErr) {
          console.error(`❌ Error de red en llamada relativa:`, networkErr);
          const looksLikeNetworkError = networkErr instanceof TypeError;
          if (this.baseURL && looksLikeNetworkError) {
            console.log(`🔄 Error de red, intentando absoluta: ${absoluteUrl}`);
            response = await fetch(absoluteUrl, { ...config, credentials: 'include' });
            console.log(`📡 Respuesta absoluta tras error:`, { status: response.status, statusText: response.statusText });
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
          console.warn('API 4xx - Response details:', { message, code, traceId, details });
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
          console.log('📦 Raw response data:', data);
          
          // Si tiene la estructura de ApiResponse con success y data, devolver solo data
          if (data && typeof data === 'object' && 'success' in data && 'data' in data) {
            console.log('✅ ApiResponse structure detected, returning data:', data.data);
            return data.data as T;
          }
          
          // Si no tiene la estructura esperada, devolver el objeto completo
          console.log('⚠️ Non-standard response structure, returning whole object');
          return data as T;
        } catch (parseError) {
          console.error('❌ Error parsing JSON response:', parseError);
          const text = await response.text();
          return text as unknown as T;
        }
      } catch (error) {
        // Reducir ruido: para notificaciones, degradar a warn (tenemos fallback en capas superiores)
        if (typeof endpoint === 'string' && endpoint.startsWith('/api/notifications')) {
          console.warn(`API Warning [${method} ${endpoint}]:`, (error as any)?.message || error);
        } else {
          console.error(`API Error [${method} ${endpoint}]:`, error);
        }
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
  // Métodos genéricos
  get: (endpoint: string) => apiClient.request(endpoint),
  post: (endpoint: string, data?: any) => 
    apiClient.request(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }),
  put: (endpoint: string, data?: any) => 
    apiClient.request(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    }),
  delete: (endpoint: string) => 
    apiClient.request(endpoint, {
      method: 'DELETE',
    }),
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
          console.log('🔍 [getAll] Raw response from API:', res);
          
          // El apiClient.request ya extrae data.data, así que res debería ser { data: [...], pagination: {...} }
          // Pero por si acaso, manejamos ambos casos
          const responseData = res?.data || res;
          console.log('🔍 [getAll] Response data:', responseData);
          
          // Extraer datos y paginación del API
          const list = Array.isArray(responseData)
            ? responseData
            : Array.isArray(responseData?.users)
              ? responseData.users
              : Array.isArray(responseData?.data?.users)
                ? responseData.data.users
                : Array.isArray(responseData?.data)
                  ? responseData.data
                  : Array.isArray(responseData?.items)
                    ? responseData.items
                    : [];
          
          // Extraer paginación si existe
          const pagination = responseData?.pagination || res?.pagination || null;
          console.log('🔍 [getAll] Extracted pagination:', pagination);
          console.log('🔍 [getAll] Extracted list length:', list.length);
          
          // Mapear a forma esperada por UI (firstName/lastName/status/lastLogin)
          const mappedList = list.map((u: any) => {
            const name: string = u.name || '';
            const [firstName, ...rest] = name.split(' ');
            const lastName = rest.join(' ');
            const status = u.isActive === false ? 'INACTIVE' : 'ACTIVE';
            return {
              id: u.id,
              email: u.email,
              firstName: u.firstName || firstName || u.givenName || '',
              lastName: u.lastName || lastName || u.familyName || '',
              phone: u.phone || '',
              role: u.role,
              membershipType: u.membershipType || null,
              status,
              createdAt: u.createdAt,
              lastLogin: u.lastLoginAt || u.lastLogin || null,
            };
          });
          
          // Devolver tanto los datos como la paginación
          return {
            data: mappedList,
            pagination: pagination
          };
        });
    },
    
    getStats: () => {
      return apiClient
        .request('/api/admin/users/stats')
        .then((res: any) => {
          // El API devuelve { success: true, data: {...} }
          return res?.data || res || {};
        });
    },
    
    create: (data: {
      email: string;
      firstName: string;
      lastName: string;
      role: string;
      phone?: string;
      password?: string; // Opcional: no requerido para rol USER
      dateOfBirth?: string;
      gdprConsent: boolean;
      membershipType?: string;
      sendWelcomeEmail?: boolean;
    }) => {
      const payload = {
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        name: `${data.firstName || ''} ${data.lastName || ''}`.trim(),
        role: data.role,
        phone: data.phone,
        dateOfBirth: data.dateOfBirth,
        gdprConsent: data.gdprConsent,
        membershipType: data.membershipType,
        sendWelcomeEmail: data.sendWelcomeEmail ?? true,
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
      primarySport?: string | null;
    }>) => {
      const body = JSON.stringify(data);
      console.log('🔍 [API-COURTS-UPDATE] Datos a enviar:', {
        id,
        data,
        body,
        primarySport: data.primarySport,
        primarySportType: typeof data.primarySport,
        dataKeys: Object.keys(data),
        hasPrimarySport: 'primarySport' in data
      });
      return apiClient.request(`/api/admin/courts/${id}`, {
        method: 'PUT',
        body,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    },
    
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

    confirmPayment: (reservationId: string, data: {
      paymentMethod: 'CASH' | 'CARD' | 'TRANSFER' | 'ONSITE' | 'CREDITS' | 'BIZUM';
      paymentStatus?: 'PAID' | 'PENDING' | 'REFUNDED';
      notes?: string;
      amount?: number;
    }) =>
      apiClient.request(`/api/admin/reservations/${reservationId}/payment`, {
        method: 'PUT',
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
      description: string;
      sport: string;
      centerId: string;
      type: string;
      format: string;
      category: string;
      maxParticipants: number;
      registrationFee: number;
      prizePool: number;
      registrationStartDate: string;
      registrationEndDate: string;
      startDate: string;
      endDate: string;
      rules: string;
      requirements?: string[];
      prizes?: Array<{
        position: number;
        description: string;
        value?: number;
      }>;
      organizer: string;
      contactEmail: string;
      contactPhone?: string;
      isPublic: boolean;
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
      sport: string;
      centerId: string;
      type: string;
      format: string;
      category: string;
      maxParticipants: number;
      registrationFee: number;
      prizePool: number;
      registrationStartDate: string;
      registrationEndDate: string;
      startDate: string;
      endDate: string;
      rules: string;
      requirements?: string[];
      prizes?: Array<{
        position: number;
        description: string;
        value?: number;
      }>;
      organizer: string;
      contactEmail: string;
      contactPhone?: string;
      isPublic: boolean;
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
      dateFrom?: string;
      dateTo?: string;
      method?: string;
      sourceType?: string;
      status?: 'PAID' | 'REFUNDED' | 'PENDING';
      centerId?: string;
      page?: number; limit?: number; format?: 'json'|'csv';
    }) => {
      const searchParams = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value === undefined || value === null) return;
          if (key === 'status') { searchParams.append('status', String(value).toUpperCase()); return; }
          searchParams.append(key, String(value));
        });
      }
      const query = searchParams.toString();
      return apiClient.request(`/api/admin/payments${query ? `?${query}` : ''}`);
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

  // Tarifas reguladas
  tariffs: {
    list: async (params?: {
      segment?: string;
      isActive?: boolean;
      from?: string;
      to?: string;
      page?: number;
      limit?: number;
    }) => {
      const searchParams = new URLSearchParams();
      if (params) {
        if (params.segment) searchParams.append('segment', params.segment);
        if (params.isActive !== undefined) searchParams.append('isActive', String(params.isActive));
        if (params.from) searchParams.append('from', params.from);
        if (params.to) searchParams.append('to', params.to);
        if (params.page) searchParams.append('page', String(params.page));
        if (params.limit) searchParams.append('limit', String(params.limit));
      }
      const query = searchParams.toString();
      const payload: any = await apiClient.request(`/api/admin/tariffs${query ? `?${query}` : ''}`);
      const raw = payload?.data ?? payload ?? {};
      const rawItems = Array.isArray(raw?.items)
        ? raw.items
        : Array.isArray(raw?.tariffs)
          ? raw.tariffs
          : Array.isArray(raw)
            ? raw
            : [];
      const rawPagination = raw?.pagination ?? {};
      const normalizedItems = rawItems.map((item: any) => ({
        ...item,
        courts: Array.isArray(item?.courts)
          ? item.courts.map((entry: any) => ({
              courtId: entry.courtId ?? entry.court_id ?? entry?.court?.id,
              court: entry.court
                ? {
                    id: entry.court.id,
                    name: entry.court.name,
                    centerId: entry.court.centerId ?? entry.court.center_id ?? '',
                  }
                : undefined,
            }))
          : [],
      }));
      const total = Number(rawPagination.total ?? rawItems.length ?? 0);
      const page = Number(rawPagination.page ?? params?.page ?? 1);
      const limit = Number(rawPagination.limit ?? params?.limit ?? (rawItems.length > 0 ? rawItems.length : 1)) || 1;
      const pages = Number(rawPagination.pages ?? Math.max(1, Math.ceil(total / (limit || 1))));
      return {
        items: normalizedItems,
        pagination: {
          total,
          page,
          limit,
          pages,
        },
      };
    },

    create: (data: Record<string, unknown>) =>
      apiClient.request('/api/admin/tariffs', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    update: (id: string, data: Record<string, unknown>) =>
      apiClient.request(`/api/admin/tariffs/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    createEnrollment: (data: {
      userId: string;
      tariffId: string;
      notes?: string;
      autoApprove?: boolean;
    }) =>
      apiClient.request('/api/admin/tariffs/enrollments', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    listEnrollments: async (params?: {
      status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
      segment?: string;
      userId?: string;
      page?: number;
      limit?: number;
    }) => {
      const searchParams = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value === undefined || value === null || value === '') return;
          searchParams.append(key, String(value));
        });
      }
      const query = searchParams.toString();
      const payload: any = await apiClient.request(`/api/admin/tariffs/enrollments${query ? `?${query}` : ''}`);
      const raw = payload?.data ?? payload ?? {};
      const rawItems = Array.isArray(raw?.items)
        ? raw.items
        : Array.isArray(raw?.enrollments)
          ? raw.enrollments
          : Array.isArray(raw)
            ? raw
            : [];
      const rawPagination = raw?.pagination ?? {};
      const total = Number(rawPagination.total ?? rawItems.length ?? 0);
      const page = Number(rawPagination.page ?? params?.page ?? 1);
      const limit = Number(rawPagination.limit ?? params?.limit ?? (rawItems.length > 0 ? rawItems.length : 1)) || 1;
      const pages = Number(rawPagination.pages ?? Math.max(1, Math.ceil(total / (limit || 1))));
      return {
        items: rawItems,
        pagination: {
          total,
          page,
          limit,
          pages,
        },
      };
    },

    approveEnrollment: (id: string, data?: { notes?: string }) =>
      apiClient.request(`/api/admin/tariffs/enrollments/${id}/approve`, {
        method: 'POST',
        body: data ? JSON.stringify(data) : undefined,
      }),

    rejectEnrollment: (id: string, data: { reason: string; notes?: string }) =>
      apiClient.request(`/api/admin/tariffs/enrollments/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    updateEnrollment: (id: string, data: Record<string, unknown>) =>
      apiClient.request(`/api/admin/tariffs/enrollments/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),

    deleteEnrollment: (id: string) =>
      apiClient.request(`/api/admin/tariffs/enrollments/${id}`, {
        method: 'DELETE',
      }),
  },

  // Reportes
  reports: {
    getRevenue: (params?: {
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
      searchParams.append('type', 'revenue');
      const query = searchParams.toString();
      return apiClient.request(`/api/admin/reports${query ? `?${query}` : ''}`);
    },
    
    getUsage: (params?: {
      period?: '7d' | '30d' | '90d' | '1y' | 'custom';
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
      searchParams.append('type', 'usage');
      const query = searchParams.toString();
      return apiClient.request(`/api/admin/reports${query ? `?${query}` : ''}`);
    },
    
    getCustomers: (params?: {
      period?: '7d' | '30d' | '90d' | '1y' | 'custom';
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
      searchParams.append('type', 'users');
      const query = searchParams.toString();
      return apiClient.request(`/api/admin/reports${query ? `?${query}` : ''}`);
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
      scheduledAt: string;
      assignedTo?: string;
      cost?: number;
      estimatedDuration?: number;
      notes?: string;
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

    // Eliminación masiva por IDs (con dryRun opcional)
    bulkDelete: (data: { ids: string[]; includeStates?: Array<'SCHEDULED'|'IN_PROGRESS'|'COMPLETED'|'CANCELLED'>; dryRun?: boolean; reason?: string }) =>
      apiClient.request('/api/maintenance/occurrences:delete', {
        method: 'DELETE',
        body: JSON.stringify(data),
      }),

    // Eliminación por serie con diferentes alcances
    deleteSeries: (seriesId: string, params: { scope?: 'all'|'future'|'range'; from?: string; to?: string; includeStates?: string[]; dryRun?: boolean; reason?: string } = {}) => {
      const sp = new URLSearchParams();
      if (params.scope) sp.append('scope', params.scope);
      if (params.from) sp.append('from', params.from);
      if (params.to) sp.append('to', params.to);
      if (params.includeStates && params.includeStates.length > 0) sp.append('includeStates', params.includeStates.join(','));
      if (params.dryRun) sp.append('dryRun', 'true');
      if (params.reason) sp.append('reason', params.reason);
      const q = sp.toString();
      return apiClient.request(`/api/maintenance/series/${seriesId}${q ? `?${q}` : ''}`, { method: 'DELETE' });
    },

    // Deduplicar ocurrencias de una serie (conservar 1 por fecha/hora)
    dedupeSeries: (seriesId: string) =>
      apiClient.request(`/api/maintenance/series/${seriesId}/dedupe`, { method: 'POST' }),
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
        })
        .catch((_err) => {
          // Fallback duro: no romper la UI por notificaciones
          return [] as any[];
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
      return apiClient
        .request(`/api/notifications/stats${q ? `?${q}` : ''}`)
        .catch(() => ({
          total: 0,
          unread: 0,
          sent: 0,
          failed: 0,
          monthlyCount: 0,
          byType: [],
          byCategory: [],
        }));
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
        .request(`/api/admin/memberships${q ? `?${q}` : ''}`)
        .then((res: any) => {
          // El nuevo endpoint devuelve membershipPlans en lugar de memberships
          if (Array.isArray(res?.membershipPlans)) return res.membershipPlans;
          if (Array.isArray(res?.data?.membershipPlans)) return res.data.membershipPlans;
          if (Array.isArray(res)) return res;
          return [];
        });
    },

    create: (data: any) =>
      apiClient.request('/api/admin/memberships', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' },
      }),

    getById: (id: string) => apiClient.request(`/api/admin/memberships/${id}`),

    update: (id: string, data: any) =>
      apiClient.request(`/api/admin/memberships/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    delete: (id: string) =>
      apiClient.request(`/api/admin/memberships/${id}`, {
        method: 'DELETE',
      }),
  },

  // Pedidos
  orders: {
    getAll: (params?: {
      status?: string;
      userId?: string;
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
      return apiClient.request(`/api/admin/orders${query ? `?${query}` : ''}`);
    },

    getById: (id: string) =>
      apiClient.request(`/api/admin/orders/${id}`),

    update: (id: string, data: any) =>
      apiClient.request(`/api/admin/orders/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    delete: (id: string) =>
      apiClient.request(`/api/admin/orders/${id}`, {
        method: 'DELETE',
      }),
  },

  // Gestión de créditos
  credits: {
    getDashboard: (period?: string) => {
      const params = period ? `?period=${period}` : '';
      return apiClient.request(`/api/admin/credits/dashboard${params}`);
    },

    listUsers: (params?: {
      page?: number;
      limit?: number;
      search?: string;
      withBalance?: boolean;
      orderBy?: 'balance' | 'name';
      direction?: 'asc' | 'desc';
    }) => {
      const searchParams = new URLSearchParams();
      if (params) {
        const { page, limit, search, withBalance, orderBy, direction } = params;
        if (page !== undefined) searchParams.set('page', String(page));
        if (limit !== undefined) searchParams.set('limit', String(limit));
        if (search) searchParams.set('search', search);
        if (withBalance !== undefined) searchParams.set('withBalance', withBalance ? 'true' : 'false');
        if (orderBy) searchParams.set('orderBy', orderBy);
        if (direction) searchParams.set('direction', direction);
      }
      const query = searchParams.toString();
      return apiClient.request(`/api/admin/credits/users${query ? `?${query}` : ''}`);
    },

    adjustBalance: (data: {
      userId: string;
      amount: number;
      reason: string;
      type: 'ADD' | 'SUBTRACT';
    }) =>
      apiClient.request('/api/admin/credits/adjust', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    getUserDetails: (userId: string) =>
      apiClient.request(`/api/admin/credits/users/${userId}`),

    getTransactions: (params?: {
      userId?: string;
      type?: string;
      limit?: number;
      offset?: number;
      fromDate?: string;
      toDate?: string;
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
      return apiClient.request(`/api/admin/credits/transactions${query ? `?${query}` : ''}`);
    },
  },

  // Gestión de promociones
  promotions: {
    getAll: (params?: {
      status?: string;
      type?: string;
      search?: string;
      page?: number;
      limit?: number;
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
        .request(`/api/admin/promotions${query ? `?${query}` : ''}`)
        .then((res: any) => {
          // El endpoint devuelve { promotions: [], pagination: {} }
          if (Array.isArray(res)) return res;
          if (res?.promotions) return res.promotions;
          if (res?.data?.promotions) return res.data.promotions;
          return [];
        });
    },

    create: (data: {
      name: string;
      code?: string;
      type: string;
      conditions: any;
      rewards: any;
      validFrom: string;
      validTo?: string;
      usageLimit?: number;
    }) =>
      apiClient.request('/api/admin/promotions', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    getById: (id: string) =>
      apiClient.request(`/api/admin/promotions/${id}`),

    update: (id: string, data: any) =>
      apiClient.request(`/api/admin/promotions/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    delete: (id: string) =>
      apiClient.request(`/api/admin/promotions/${id}`, {
        method: 'DELETE',
      }),

    validate: (code: string) =>
      apiClient.request(`/api/promotions/validate?code=${encodeURIComponent(code)}`),
  },

  // Auditoría
  audit: {
    getLogs: (params?: {
      page?: number;
      limit?: number;
      action?: string;
      resource?: string;
      entityType?: string;
      userId?: string;
      status?: string;
      severity?: string;
      category?: string;
      searchTerm?: string;
      startDate?: string;
      endDate?: string;
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
      return apiClient.request(`/api/admin/audit${query ? `?${query}` : ''}`);
    },

    getStats: (params?: any) => {
      const searchParams = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            searchParams.append(key, String(value));
          }
        });
      }
      const query = searchParams.toString();
      return apiClient.request(`/api/admin/audit/stats${query ? `?${query}` : ''}`);
    },

    create: (data: any) =>
      apiClient.request('/api/admin/audit', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    export: (params?: any) => {
      const searchParams = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            searchParams.append(key, String(value));
          }
        });
      }
      const query = searchParams.toString();
      return apiClient.request(`/api/admin/audit/export${query ? `?${query}` : ''}`);
    },
  },
};

export default adminApi;