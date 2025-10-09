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
  // Configuración enterprise para manejo robusto de chunks
  experimental: {
    // Optimizar la carga de chunks
    optimizeCss: true,
    // Mejorar la estabilidad de la hidratación
    optimizePackageImports: ['@heroicons/react', 'lucide-react'],
  },
  
  // Configuración de webpack para manejo robusto de chunks
  webpack: (config, { dev, isServer }) => {
    // Configuración enterprise para chunks
    if (!dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            // Chunk separado para NextAuth
            nextauth: {
              test: /[\\/]node_modules[\\/](next-auth|@auth)[\\/]/,
              name: 'nextauth',
              chunks: 'all',
              priority: 20,
            },
            // Chunk separado para Firebase
            firebase: {
              test: /[\\/]node_modules[\\/]firebase[\\/]/,
              name: 'firebase',
              chunks: 'all',
              priority: 20,
            },
            // Chunk separado para UI components
            ui: {
              test: /[\\/]node_modules[\\/](@heroicons|lucide-react)[\\/]/,
              name: 'ui',
              chunks: 'all',
              priority: 15,
            },
            // Chunk por defecto para otras librerías
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
              priority: 10,
            },
          },
        },
      };
    }
    
    return config;
  },

  async headers() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://polideportivo-api.vercel.app';
    const csp = [
      "default-src 'self'",
      // APIs
      `connect-src 'self' ${apiUrl} ${apiUrl.replace('http://', 'ws://').replace('https://', 'wss://')} https://*.firebaseio.com https://*.googleapis.com https://*.gstatic.com`,
      // Scripts y estilos (permitir CDNs necesarios: Google APIs, Leaflet)
      process.env.NODE_ENV === 'production'
        ? "script-src 'self' 'unsafe-inline' https://apis.google.com https://unpkg.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com"
        : "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://unpkg.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com",
      process.env.NODE_ENV === 'production'
        ? "style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://fonts.googleapis.com https://unpkg.com https://cdn.jsdelivr.net"
        : "style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://fonts.googleapis.com https://unpkg.com https://cdn.jsdelivr.net",
      // Permitir iframes necesarios para flujos de auth de Google/Firebase
      "frame-src 'self' https://*.firebaseapp.com https://accounts.google.com https://apis.google.com",
      // Images & media (permitir CDNs seguros y tiles de mapas)
      "img-src 'self' data: blob: https:",
      "font-src 'self' data: https://cdnjs.cloudflare.com https://fonts.gstatic.com",
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "form-action 'self' https://sis.redsys.es https://sis-t.redsys.es",
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
    
    // 📊 LOGGING ENTERPRISE PARA DEBUGGING (solo en desarrollo)
    if (process.env.NODE_ENV !== 'production') {
      console.log('🚀 [NEXT-CONFIG] === POLIDEPORTIVO REWRITES CONFIGURATION ===');
      console.log('🔧 [NEXT-CONFIG] Backend API URL:', apiUrl);
      console.log('🔧 [NEXT-CONFIG] Environment:', process.env.NODE_ENV);
      console.log('🔧 [NEXT-CONFIG] Timestamp:', new Date().toISOString());
      console.log('🔧 [NEXT-CONFIG] Strategy: beforeFiles + negative regex');
    }

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
      // 🚫 EXCLUIR archivos estáticos del rewrite para evitar problemas con favicon
      afterFiles: [
        {
          // Asegurar que archivos estáticos no sean interceptados
          source: '/favicon.ico',
          destination: '/favicon.ico',
        },
        {
          source: '/:path*.(ico|png|jpg|jpeg|gif|svg|webp|woff|woff2|ttf|eot)',
          destination: '/:path*',
        },
      ],
    };
  },
};

export default nextConfig;

