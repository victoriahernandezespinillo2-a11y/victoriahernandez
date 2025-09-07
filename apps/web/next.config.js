/**
 * 🚀 Configuración Next.js Enterprise - Polideportivo Platform
 * 
 * SOLUCIÓN ENTERPRISE DEFINITIVA ANTI-BUCLES:
 * ✅ 1. beforeFiles: Intercepta ANTES de buscar rutas locales (evita conflictos)
 * ✅ 2. Regex negativo: Excluye explícitamente /api/auth/* (NextAuth local)  
 * ✅ 3. Patrón único: UN SOLO rewrite que maneja TODAS las rutas no-auth
 * ✅ 4. Fallback robusto: URL hardcodeada si variable de entorno falla
 * ✅ 5. Logging enterprise: Información completa para troubleshooting
 * 
 * PROBLEMA RESUELTO: ERR_TOO_MANY_REDIRECTS por conflictos de rewrites
 */

/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';
    const csp = [
      "default-src 'self'",
      // APIs
      `connect-src 'self' ${apiUrl} ${apiUrl.replace('http://', 'ws://').replace('https://', 'wss://')} https://*.firebaseio.com https://*.googleapis.com https://*.gstatic.com`,
      // Scripts y estilos (permitir CDNs necesarios: Google APIs, Leaflet)
      process.env.NODE_ENV === 'production'
        ? "script-src 'self' https://apis.google.com https://unpkg.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com"
        : "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://unpkg.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com",
      process.env.NODE_ENV === 'production'
        ? "style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://fonts.googleapis.com https://unpkg.com https://cdn.jsdelivr.net"
        : "style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://fonts.googleapis.com https://unpkg.com https://cdn.jsdelivr.net",
      // Images & media (permitir CDNs seguros y tiles de mapas)
      "img-src 'self' data: blob: https:",
      "font-src 'self' data: https://cdnjs.cloudflare.com https://fonts.gstatic.com",
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "form-action 'self'",
      "upgrade-insecure-requests",
    ].join('; ');

    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
        ],
      },
    ];
  },
  async rewrites() {
    // 🔧 CONFIGURACIÓN ROBUSTA DEL BACKEND
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://polideportivo-api.vercel.app';
    
    // 📊 LOGGING ENTERPRISE PARA DEBUGGING
    console.log('🚀 [NEXT-CONFIG] === POLIDEPORTIVO REWRITES CONFIGURATION ===');
    console.log('🔧 [NEXT-CONFIG] Backend API URL:', apiUrl);
    console.log('🔧 [NEXT-CONFIG] Environment:', process.env.NODE_ENV);
    console.log('🔧 [NEXT-CONFIG] Timestamp:', new Date().toISOString());
    console.log('🔧 [NEXT-CONFIG] Strategy: beforeFiles + negative regex');

    return {
      // 🎯 ESTRATEGIA ENTERPRISE: beforeFiles previene conflictos con rutas locales
      beforeFiles: [
        {
          // 🛡️ PATRÓN ÚNICO ANTI-BUCLES: 
          // - Captura TODAS las rutas /api/* EXCEPTO /api/auth/*
          // - beforeFiles = intercepta ANTES de Next.js buscar rutas locales
          // - Evita conflictos y bucles infinitos
          source: '/api/:path((?!auth/).*)',
          destination: `${apiUrl}/api/:path`,
        },
      ],
    };
  },
};

export default nextConfig;

