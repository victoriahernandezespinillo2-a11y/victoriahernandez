/**
 * Configuración centralizada de rutas de la API
 * Este archivo define todas las rutas disponibles y sus métodos HTTP
 */

export const API_ROUTES = {
  // Rutas de autenticación
  AUTH: {
    LOGIN: '/api/auth/signin',
    LOGOUT: '/api/auth/signout',
    REGISTER: '/api/auth/signup',
    SESSION: '/api/auth/session',
    PROVIDERS: '/api/auth/providers',
  },

  // Rutas de reservas
  RESERVATIONS: {
    BASE: '/api/reservations',
    BY_ID: (id: string) => `/api/reservations/${id}`,
    CHECK_IN: (id: string) => `/api/reservations/${id}/check-in`,
    CHECK_OUT: (id: string) => `/api/reservations/${id}/check-out`,
  },

  // Rutas de canchas
  COURTS: {
    BASE: '/api/courts',
    BY_ID: (id: string) => `/api/courts/${id}`,
    AVAILABILITY: (id: string) => `/api/courts/${id}/availability`,
    RESERVATIONS: (id: string) => `/api/courts/${id}/reservations`,
  },

  // Rutas de centros
  CENTERS: {
    BASE: '/api/centers',
    BY_ID: (id: string) => `/api/centers/${id}`,
    COURTS: (id: string) => `/api/centers/${id}/courts`,
    STATS: (id: string) => `/api/centers/${id}/stats`,
  },

  // Rutas de lista de espera
  WAITING_LIST: {
    BASE: '/api/waiting-list',
    BY_ID: (id: string) => `/api/waiting-list/${id}`,
    CLAIM: (id: string) => `/api/waiting-list/${id}/claim`,
    NOTIFY: (id: string) => `/api/waiting-list/${id}/notify`,
  },

  // Rutas de precios
  PRICING: {
    CALCULATE: '/api/pricing/calculate',
    RULES: {
      BASE: '/api/pricing/rules',
      BY_ID: (id: string) => `/api/pricing/rules/${id}`,
      TEST: (id: string) => `/api/pricing/rules/${id}/test`,
    },
    STATS: '/api/pricing/stats',
    REVENUE: '/api/pricing/stats/revenue',
  },

  // Rutas de usuarios
  USERS: {
    BASE: '/api/users',
    BY_ID: (id: string) => `/api/users/${id}`,
    PROFILE: '/api/users/profile',
    MEMBERSHIPS: '/api/users/memberships',
    RESERVATIONS: '/api/users/reservations',
    WAITING_LIST: '/api/users/waiting-list',
  },

  // Rutas de membresías
  MEMBERSHIPS: {
    BASE: '/api/memberships',
    BY_ID: (id: string) => `/api/memberships/${id}`,
    ACTIVATE: (id: string) => `/api/memberships/${id}/activate`,
    SUSPEND: (id: string) => `/api/memberships/${id}/suspend`,
    RENEW: (id: string) => `/api/memberships/${id}/renew`,
  },

  // Rutas de torneos
  TOURNAMENTS: {
    BASE: '/api/tournaments',
    BY_ID: (id: string) => `/api/tournaments/${id}`,
    JOIN: (id: string) => `/api/tournaments/${id}/join`,
    LEAVE: (id: string) => `/api/tournaments/${id}/leave`,
    MATCHES: (id: string) => `/api/tournaments/${id}/matches`,
  },

  // Rutas de pagos
  PAYMENTS: {
    CREATE: '/api/payments/create',
    WEBHOOK: {
      STRIPE: '/api/payments/webhook/stripe',
      REDSYS: '/api/payments/webhook/redsys',
    },
    STATUS: (id: string) => `/api/payments/${id}/status`,
    REFUND: (id: string) => `/api/payments/${id}/refund`,
  },

  // Rutas de notificaciones
  NOTIFICATIONS: {
    BASE: '/api/notifications',
    SEND: '/api/notifications/send',
    MARK_READ: (id: string) => `/api/notifications/${id}/read`,
    PREFERENCES: '/api/notifications/preferences',
  },

  // Rutas de mantenimiento
  MAINTENANCE: {
    BASE: '/api/maintenance',
    BY_ID: (id: string) => `/api/maintenance/${id}`,
    SCHEDULE: '/api/maintenance/schedule',
    COMPLETE: (id: string) => `/api/maintenance/${id}/complete`,
  },

  // Rutas de administración
  ADMIN: {
    DASHBOARD: '/api/admin/dashboard',
    STATS: '/api/admin/stats',
    USERS: '/api/admin/users',
    CENTERS: '/api/admin/centers',
    COURTS: '/api/admin/courts',
    REPORTS: '/api/admin/reports',
    SETTINGS: '/api/admin/settings',
  },

  // Rutas de salud y monitoreo
  HEALTH: {
    CHECK: '/api/health',
    DATABASE: '/api/health/database',
    SERVICES: '/api/health/services',
  },
} as const;

/**
 * Métodos HTTP permitidos por ruta
 */
export const ROUTE_METHODS = {
  // Reservas
  [API_ROUTES.RESERVATIONS.BASE]: ['GET', 'POST'],
  [API_ROUTES.RESERVATIONS.BY_ID('')]: ['GET', 'PUT', 'DELETE'],

  // Canchas
  [API_ROUTES.COURTS.BASE]: ['GET'],
  [API_ROUTES.COURTS.BY_ID('')]: ['GET'],
  [API_ROUTES.COURTS.AVAILABILITY('')]: ['GET', 'POST'],

  // Centros
  [API_ROUTES.CENTERS.BASE]: ['GET'],
  [API_ROUTES.CENTERS.BY_ID('')]: ['GET'],

  // Lista de espera
  [API_ROUTES.WAITING_LIST.BASE]: ['GET', 'POST'],
  [API_ROUTES.WAITING_LIST.BY_ID('')]: ['GET', 'PUT', 'DELETE'],
  [API_ROUTES.WAITING_LIST.CLAIM('')]: ['POST'],

  // Precios
  [API_ROUTES.PRICING.CALCULATE]: ['GET', 'POST'],
  [API_ROUTES.PRICING.RULES.BASE]: ['GET', 'POST'],
  [API_ROUTES.PRICING.RULES.BY_ID('')]: ['GET', 'PUT', 'DELETE'],
  [API_ROUTES.PRICING.RULES.TEST('')]: ['POST'],
  [API_ROUTES.PRICING.STATS]: ['GET'],
  [API_ROUTES.PRICING.REVENUE]: ['POST'],
} as const;

/**
 * Roles requeridos por ruta
 */
export const ROUTE_PERMISSIONS = {
  // Rutas públicas (requieren autenticación básica)
  PUBLIC: [
    API_ROUTES.RESERVATIONS.BASE,
    API_ROUTES.COURTS.BASE,
    API_ROUTES.CENTERS.BASE,
    API_ROUTES.WAITING_LIST.BASE,
    API_ROUTES.PRICING.CALCULATE,
  ],

  // Rutas que requieren rol de staff o superior
  STAFF: [
    API_ROUTES.PRICING.RULES.BASE,
    API_ROUTES.PRICING.STATS,
  ],

  // Rutas que requieren rol de administrador
  ADMIN: [
    API_ROUTES.PRICING.REVENUE,
    API_ROUTES.ADMIN.DASHBOARD,
    API_ROUTES.ADMIN.STATS,
    API_ROUTES.ADMIN.USERS,
    API_ROUTES.ADMIN.CENTERS,
    API_ROUTES.ADMIN.COURTS,
    API_ROUTES.ADMIN.REPORTS,
    API_ROUTES.ADMIN.SETTINGS,
  ],
} as const;

/**
 * Límites de rate limiting por ruta
 */
export const RATE_LIMITS = {
  // Límites por defecto
  DEFAULT: {
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // 100 requests por ventana
  },

  // Límites específicos por ruta
  ROUTES: {
    [API_ROUTES.AUTH.LOGIN]: {
      windowMs: 15 * 60 * 1000,
      max: 5, // 5 intentos de login por 15 minutos
    },
    [API_ROUTES.RESERVATIONS.BASE]: {
      windowMs: 60 * 1000, // 1 minuto
      max: 10, // 10 reservas por minuto
    },
    [API_ROUTES.PRICING.CALCULATE]: {
      windowMs: 60 * 1000,
      max: 30, // 30 cálculos de precio por minuto
    },
  },
} as const;

/**
 * Utilidades para trabajar con rutas
 */
export const RouteUtils = {
  /**
   * Verifica si una ruta requiere autenticación
   * @param route - La ruta a verificar
   * @returns true si la ruta requiere autenticación
   */
  requiresAuth: (route: string): boolean => {
    if (!route || typeof route !== 'string') {
      return true; // Por seguridad, requerir auth si la ruta es inválida
    }
    return !route.startsWith('/api/health') && !route.startsWith('/api/auth');
  },

  /**
   * Obtiene el nivel de permisos requerido para una ruta
   * @param route - La ruta a verificar
   * @returns El rol requerido o null si no se requiere rol específico
   */
  getRequiredRole: (route: string): UserRole | null => {
    if (!route || typeof route !== 'string') {
      return null;
    }
    
    if (ROUTE_PERMISSIONS.ADMIN.some(adminRoute => route.startsWith(adminRoute))) {
      return 'ADMIN';
    }
    if (ROUTE_PERMISSIONS.STAFF.some(staffRoute => route.startsWith(staffRoute))) {
      return 'STAFF';
    }
    if (ROUTE_PERMISSIONS.PUBLIC.some(publicRoute => route.startsWith(publicRoute))) {
      return 'USER';
    }
    return null;
  },

  /**
   * Obtiene los límites de rate limiting para una ruta
   * @param route - La ruta a verificar
   * @returns Configuración de rate limiting para la ruta
   */
  getRateLimit: (route: string): RateLimitConfig => {
    if (!route || typeof route !== 'string') {
      return RATE_LIMITS.DEFAULT;
    }
    return RATE_LIMITS.ROUTES[route as keyof typeof RATE_LIMITS.ROUTES] || RATE_LIMITS.DEFAULT;
  },

  /**
   * Verifica si un método HTTP está permitido para una ruta
   * @param route - La ruta a verificar
   * @param method - El método HTTP a verificar
   * @returns true si el método está permitido para la ruta
   */
  isMethodAllowed: (route: string, method: HttpMethod): boolean => {
    if (!route || typeof route !== 'string' || !method) {
      return false;
    }
    const allowedMethods = ROUTE_METHODS[route as keyof typeof ROUTE_METHODS] as readonly HttpMethod[] | undefined;
    return allowedMethods ? allowedMethods.includes(method) : false;
  },

  /**
   * Construye una URL completa con parámetros de consulta
   * @param baseRoute - La ruta base
   * @param params - Parámetros de consulta opcionales
   * @returns URL completa con parámetros
   */
  buildUrl: (baseRoute: string, params?: Record<string, string | number>): string => {
    if (!baseRoute || typeof baseRoute !== 'string') {
      throw new Error('Base route is required and must be a string');
    }
    
    if (!params || Object.keys(params).length === 0) {
      return baseRoute;
    }
    
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });
    
    return `${baseRoute}?${searchParams.toString()}`;
  },

  /**
   * Valida si una ruta es válida según los patrones definidos
   * @param route - La ruta a validar
   * @returns true si la ruta es válida
   */
  isValidRoute: (route: string): boolean => {
    if (!route || typeof route !== 'string') {
      return false;
    }
    
    // Verificar que la ruta comience con /api/
    if (!route.startsWith('/api/')) {
      return false;
    }
    
    // Verificar que no contenga caracteres peligrosos
    const dangerousChars = /[<>"'&]/;
    return !dangerousChars.test(route);
  },

  /**
   * Extrae el ID de una ruta dinámica
   * @param route - La ruta que contiene el ID
   * @param pattern - El patrón de la ruta (ej: '/api/users/[id]')
   * @returns El ID extraído o null si no se encuentra
   */
  extractId: (route: string, pattern: string): string | null => {
    if (!route || !pattern || typeof route !== 'string' || typeof pattern !== 'string') {
      return null;
    }
    
    const regex = new RegExp(pattern.replace(/\[\w+\]/g, '([^/]+)'));
    const match = route.match(regex);
    return match ? (match[1] ?? null) : null;
  },
};

/**
 * Tipos TypeScript para las rutas
 */
export type ApiRoute = string | ((id: string) => string);
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS' | 'HEAD';
export type UserRole = 'USER' | 'STAFF' | 'ADMIN';

/**
 * Tipo para las rutas estáticas (sin parámetros)
 */
export type StaticRoute = string;

/**
 * Tipo para las rutas dinámicas (con parámetros)
 */
export type DynamicRoute = (id: string) => string;

/**
 * Tipo para la configuración de rate limiting
 */
export type RateLimitConfig = {
  windowMs: number;
  max: number;
};

/**
 * Tipo para la configuración de CORS
 */
export type CorsConfig = {
  origin: string | string[] | boolean;
  methods: HttpMethod[];
  allowedHeaders: string[];
  credentials?: boolean;
};

/**
 * Configuración de CORS por ruta
 */
export const CORS_CONFIG = {
  DEFAULT: {
    origin: process.env.NODE_ENV === 'production' 
      ? ['https://polideportivovictoriahernandez.es', 'https://admin.polideportivovictoriahernandez.es']
      : ['http://localhost:3000', 'http://localhost:3001'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  },
  
  WEBHOOKS: {
    origin: '*', // Los webhooks pueden venir de cualquier origen
    methods: ['POST'],
    allowedHeaders: ['Content-Type', 'X-Stripe-Signature', 'Authorization'],
  },
} as const;
