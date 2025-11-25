/**
 * Cliente API para la aplicación web del polideportivo
 * Maneja todas las llamadas HTTP a la API backend
 */

import { CalendarData } from '../types/calendar.types';
import { getDownloadURL, getStorage, ref } from 'firebase/storage';
import { ReservationStatus } from '@repo/db';

// Base de la API: usar variable pública si está definida, sin barra final
const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'https://polideportivo-api.vercel.app').replace(/\/$/, '');

/**
 * Configuración base para las peticiones fetch
 */
const buildHeaders = (method: string): Record<string, string> => {
  const isGet = method.toUpperCase() === 'GET';
  const headers: Record<string, string> = {};
  // Evitar Content-Type en GET para no forzar preflight CORS
  if (!isGet) headers['Content-Type'] = 'application/json';
  return headers;
};

// 🕵️‍♂️ FUNCIÓN ROBUSTA PARA ESPERAR EL FIREBASE ID TOKEN
// Esto resuelve la condición de carrera donde onAuthStateChanged se dispara
// antes de que el token esté realmente disponible.
const awaitFirebaseToken = (timeout = 10000): Promise<string | null> => {
  return new Promise(async (resolve, reject) => {
    const { getFirebaseAuth } = await import('@/lib/firebase');
    const auth = getFirebaseAuth();
    const startTime = Date.now();

    const checkToken = async () => {
      if (auth.currentUser) {
        try {
          const token = await auth.currentUser.getIdToken(false); // false: no forzar refresh si ya hay uno válido
          if (token) {
            console.log(`✅ [API] Firebase ID Token obtenido después de ${Date.now() - startTime}ms`);
            return resolve(token);
          }
        } catch (e) {
          console.warn('⚠️ [API] Pequeño error obteniendo token, reintentando...', e);
        }
      }

      if (Date.now() - startTime > timeout) {
        console.error('❌ [API] Timeout esperando Firebase ID Token.');
        return resolve(null); // Resolve with null instead of rejecting
      }

      setTimeout(checkToken, 200); // Reintentar cada 200ms
    };

    checkToken();
  });
};


// Obtiene el Firebase ID Token de forma segura
export const getFirebaseIdTokenSafe = async (): Promise<string | null> => {
  try {
    if (typeof window === 'undefined') return null;
    // Usamos el nuevo mecanismo de espera
    return await awaitFirebaseToken();
  } catch (error) {
    console.error('❌ [API] Error obteniendo Firebase ID Token:', error);
    return null;
  }
};

// Obtiene un JWT token propio para comunicación cross-domain
let lastJwtTokenCache: { token: string; fetchedAt: number } | null = null;
const getJwtTokenSafe = async (): Promise<string | null> => {
  try {
    if (typeof window === 'undefined') return null; // SSR/Edge: no usar

    // Pequeña caché en memoria para evitar llamadas repetidas
    if (lastJwtTokenCache && Date.now() - lastJwtTokenCache.fetchedAt < 50_000) { // 50 segundos
      return lastJwtTokenCache.token;
    }

    // Obtener Firebase ID Token primero
    const firebaseToken = await getFirebaseIdTokenSafe();
    if (!firebaseToken) {
      console.log('🔍 [API] No hay Firebase token disponible para obtener JWT');
      return null;
    }

    // Usar Firebase ID Token para autenticarse con el endpoint de JWT
    const response = await fetch(`${API_BASE_URL}/api/auth/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firebaseToken}`
      },
      // No usar credentials: 'include' ya que estamos usando Authorization header
    });

    if (response.ok) {
      const data = await response.json();
      if (data.token) {
        lastJwtTokenCache = { token: data.token, fetchedAt: Date.now() };
        console.log('✅ [API] JWT obtenido exitosamente');
        return data.token;
      }
    } else {
      let bodyText = '';
      try {
        bodyText = await response.text();
      } catch { }
      console.error('❌ [API] Error obteniendo JWT:', response.status, response.statusText, bodyText);
    }
    return null;
  } catch (e) {
    console.error('❌ [API] Error en getJwtTokenSafe:', e);
    // No romper el flujo si no se puede obtener el token
    return null;
  }
};

/**
 * Wrapper para fetch con manejo de errores
 */
export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const absoluteUrl = `${API_BASE_URL}${endpoint}`;
  const relativeUrl = `${endpoint}`;
  const method = (options.method || 'GET').toString().toUpperCase();

  // Intentar obtener token de autenticación si no se proporcionó Authorization explícito
  let authHeaderFromOptions: string | undefined;
  try {
    const providedHeaders = options.headers as Record<string, any> | undefined;
    authHeaderFromOptions = providedHeaders?.Authorization || providedHeaders?.authorization;
  } catch { }

  let authToken: string | null = null;
  if (!authHeaderFromOptions) {
    // Para la comunicación cross-domain, siempre intentamos obtener nuestro propio JWT,
    // que se basa en un token de Firebase válido.
    authToken = await getJwtTokenSafe();
  }

  const baseConfig: RequestInit = {
    ...options,
    headers: {
      ...buildHeaders(method),
      ...(options.headers || {}),
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
    credentials: 'include',
  };

  try {
    let response: Response | null = null;

    const isLocalhost = typeof window !== 'undefined' && window.location.hostname === 'localhost';

    // 1️⃣ Producción / Staging: siempre usar API_BASE_URL primero
    //    Desarrollo: también, pero permitimos fallback al relativo si existe proxy
    try {
      response = await fetch(absoluteUrl, baseConfig);

      // Fallback a relativo (proxy Next.js) solo cuando desarrollamos en localhost y la API remota devolvió 404
      if (isLocalhost && response.status === 404) {
        console.log(`🔄 [API-REQUEST] Local fallback: ${absoluteUrl} → ${relativeUrl}`);
        response = await fetch(relativeUrl, baseConfig);
      }
    } catch (networkErr) {
      if (isLocalhost) {
        console.log(`🔄 [API-REQUEST] Network fallback dev: ${absoluteUrl} → ${relativeUrl}`);
        response = await fetch(relativeUrl, baseConfig);
      } else {
        console.error(`🚨 [API-REQUEST] Network error en producción:`, networkErr);
        throw networkErr;
      }
    }

    if (!response.ok) {
      let message = '';
      let code = '';
      let traceId = response.headers.get('x-request-id') || '';
      let details: any = undefined;
      let originalError: any = undefined;

      try {
        const asJson = await response.json();
        message = asJson?.error || JSON.stringify(asJson);
        code = asJson?.code || '';
        details = asJson?.details;
        traceId = asJson?.traceId || traceId;
        originalError = asJson; // Preservar el error original completo
      } catch {
        try {
          message = await response.text();
          originalError = { error: message, status: response.status };
        } catch {
          message = `HTTP ${response.status}: ${response.statusText}`;
          originalError = { error: message, status: response.status };
        }
      }

      // 🔒 CREAR ERROR ENRIQUECIDO CON INFORMACIÓN COMPLETA
      const err = new Error(message || `HTTP ${response.status}`) as any;
      err.code = code;
      err.traceId = traceId;
      err.details = details;
      err.status = response.status;
      err.statusText = response.statusText;
      err.originalError = originalError; // Preservar error completo
      err.endpoint = endpoint;
      err.method = method;

      throw err;
    }

    try {
      const data = await response.json();
      console.log('🔍 [API-REQUEST] Response data:', data);

      // Si la respuesta tiene la estructura ApiResponse, devolver solo el campo data
      if (data && typeof data === 'object' && 'success' in data) {
        console.log('📦 [API-REQUEST] ApiResponse structure detected, returning data:', data.data);
        return data.data;
      }

      // Si no tiene la estructura ApiResponse, devolver la respuesta completa
      console.log('📦 [API-REQUEST] Non-ApiResponse structure, returning full data');
      return data as T;
    } catch {
      const text = await response.text();
      return text as unknown as T;
    }
  } catch (error) {
    // 🔒 LOGGING PROFESIONAL CON INFORMACIÓN COMPLETA
    // Extraer información del error de forma segura para evitar problemas de serialización
    const errorInfo = {
      message: error instanceof Error ? error.message : 'Error desconocido',
      name: error instanceof Error ? error.name : 'Unknown',
      code: (error as any)?.code,
      status: (error as any)?.status,
      statusText: (error as any)?.statusText,
      endpoint: (error as any)?.endpoint,
      method: (error as any)?.method,
      // Extraer originalError de forma segura
      originalError: (error as any)?.originalError ? {
        error: (error as any).originalError.error,
        status: (error as any).originalError.status,
        details: (error as any).originalError.details
      } : undefined
    };

    // Evitar ruido de logs en conflictos esperados (reintentos controlados)
    const isRecoverableConflict = errorInfo.status === 409 && typeof errorInfo.endpoint === 'string'
      && errorInfo.endpoint.startsWith('/api/reservations');
    if (!isRecoverableConflict) {
      console.error(`🚨 [API-REQUEST] Error en ${endpoint}:`, errorInfo);
    }

    // 🔒 PRESERVAR INFORMACIÓN DEL ERROR PARA EL ERROR HANDLER
    if (error instanceof Error) {
      // Enriquecer el error con información adicional
      (error as any).apiEndpoint = endpoint;
      (error as any).apiMethod = method;
      (error as any).timestamp = new Date().toISOString();
    }

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
      sportType?: string;
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
      return apiRequest(`/api/courts${query ? `?${query}` : ''}`);
    },

    getById: (id: string) =>
      apiRequest(`/api/courts/${id}`),

    getAvailability: (id: string, params: { date: string; duration: number }) => {
      const query = new URLSearchParams({
        date: params.date,
        duration: String(params.duration)
      });
      return apiRequest(`/api/courts/${id}/availability?${query}`);
    },

    // 🎨 NUEVO: Estado completo del calendario con colores
    getCalendarStatus: async (id: string, params: { date: string; duration: number; sport?: string }): Promise<CalendarData> => {
      const query = new URLSearchParams({
        date: params.date,
        duration: String(params.duration)
      });
      // Agregar sport si está presente (necesario para lógica multi-cancha)
      if (params.sport) {
        query.append('sport', params.sport);
      }
      const response = await apiRequest(`/api/courts/${id}/calendar-status?${query}`);
      return response as CalendarData;
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
      sport?: string;
      lightingSelected?: boolean;
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
      const searchParams = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined) {
            searchParams.append(key, String(value));
          }
        });
      }
      const query = searchParams.toString();
      return apiRequest(`/api/users/${userId}/reservations${query ? `?${query}` : ''}`);
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
      sport?: string;     // Deporte seleccionado para canchas multiuso
      lightingSelected?: boolean; // Si el usuario seleccionó iluminación
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

  // Pagos
  payments: {
    getMethods: () => apiRequest('/api/payments/methods'),
    addMethod: (data: { brand: string; last4: string; expMonth: number; expYear: number; holderName?: string; setDefault?: boolean; }) =>
      apiRequest('/api/payments/methods', { method: 'POST', body: JSON.stringify(data) }),
    deleteMethod: (id: string) => apiRequest(`/api/payments/methods?id=${encodeURIComponent(id)}`, { method: 'DELETE' }),
    // Listado de pagos (historial unificado: órdenes + reservas)
    list: (params?: { page?: number; limit?: number; status?: string; dateFrom?: string; dateTo?: string; centerId?: string }) => {
      const searchParams = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            searchParams.append(key, String(value));
          }
        });
      }
      const query = searchParams.toString();
      return apiRequest(`/api/payments${query ? `?${query}` : ''}`);
    },
  },

  // Monedero
  wallet: {
    topup: (credits: number, opts?: { checkout?: boolean; successUrl?: string; cancelUrl?: string }) =>
      apiRequest('/api/credits/topup', {
        method: 'POST',
        body: JSON.stringify({ credits, checkout: opts?.checkout ?? true, successUrl: opts?.successUrl, cancelUrl: opts?.cancelUrl }),
      }),
    ledger: (params?: { page?: number; limit?: number }) => {
      const searchParams = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined) {
            searchParams.append(key, String(value));
          }
        });
      }
      const query = searchParams.toString();
      return apiRequest(`/api/wallet/ledger${query ? `?${query}` : ''}`);
    },
  },

  // Promociones
  promotions: {
    /**
     * Listar promociones activas
     */
    getActive: (params?: { type?: string }) => {
      const searchParams = new URLSearchParams();
      if (params?.type) {
        searchParams.append('type', params.type);
      }
      const query = searchParams.toString();
      return apiRequest(`/api/promotions/active${query ? `?${query}` : ''}`);
    },

    /**
     * Validar código promocional
     */
    validate: (code: string, amount: number, type: 'TOPUP' | 'RESERVATION') =>
      apiRequest('/api/promotions/validate', {
        method: 'POST',
        body: JSON.stringify({ code, amount, type }),
      }),

    /**
     * Aplicar promoción manualmente
     */
    apply: (promotionId: string, amount?: number, metadata?: any) =>
      apiRequest('/api/promotions/apply', {
        method: 'POST',
        body: JSON.stringify({ promotionId, amount, metadata }),
      }),

    /**
     * Obtener historial de promociones del usuario
     */
    getMyHistory: (params?: { limit?: number }) => {
      const searchParams = new URLSearchParams();
      if (params?.limit) {
        searchParams.append('limit', params.limit.toString());
      }
      const query = searchParams.toString();
      return apiRequest(`/api/promotions/my-history${query ? `?${query}` : ''}`);
    },
  },

  // Tienda
  shop: {
    list: (params?: { centerId?: string; search?: string; category?: string; page?: number; limit?: number }) => {
      const searchParams = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined) {
            searchParams.append(key, String(value));
          }
        });
      }
      const query = searchParams.toString();
      return apiRequest(`/api/products${query ? `?${query}` : ''}`);
    },
    detail: (id: string) => apiRequest(`/api/products/${id}`),
  },

  // Carrito
  cart: {
    checkout: (data: { items: Array<{ productId: string; qty: number }>; paymentMethod: 'credits' | 'card' }, idemKey?: string) =>
      apiRequest('/api/cart/checkout', {
        method: 'POST',
        headers: { ...(idemKey ? { 'Idempotency-Key': idemKey } : {}) },
        body: JSON.stringify(data),
      }),
  },
};

export default api;