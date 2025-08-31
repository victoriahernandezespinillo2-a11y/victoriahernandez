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
  async rewrites() {
    // 🔧 CONFIGURACIÓN ROBUSTA DEL BACKEND
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://polideportivo-api.vercel.app';
    
    // 📊 LOGGING ENTERPRISE PARA DEBUGGING
    console.log('🚀 [NEXT-CONFIG] === POLIDEPORTIVO REWRITES CONFIGURATION ===');
    console.log('🔧 [NEXT-CONFIG] Backend API URL:', apiUrl);
    console.log('🔴 [NEXT-CONFIG-DEBUG] NEXTAUTH_URL cargada:', process.env.NEXTAUTH_URL || 'NO DEFINIDA');
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

