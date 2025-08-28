/**
 * Configuración Next.js Enterprise para el frontend Web
 * 
 * SOLUCIÓN ROBUSTA:
 * 1. beforeFiles: Intercepta TODAS las rutas /api/* ANTES de que Next.js busque rutas locales
 * 2. Excepción: Solo /api/auth/* permanece en el frontend (NextAuth)
 * 3. Todo lo demás va al backend automáticamente
 * 4. Validación: Falla duro en build si faltan variables críticas
 */

/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    // VALIDACIÓN CRÍTICA: Falla duro si no hay URL del backend
    if (!process.env.NEXT_PUBLIC_API_URL) {
      throw new Error(
        '🚨 NEXT_PUBLIC_API_URL no está definida. ' +
        'Define la URL del backend en las variables de entorno de Vercel. ' +
        'Ejemplo: https://polideportivo-api.vercel.app'
      );
    }

    return {
      beforeFiles: [
        // INTERCEPTAR TODAS LAS RUTAS /api/* ANTES de que Next.js busque rutas locales
        // EXCEPTO /api/auth/* que debe permanecer en el frontend para NextAuth
        {
          source: '/api/:path((?!auth/).*)',
          destination: `${process.env.NEXT_PUBLIC_API_URL}/api/:path`,
        },
      ],
    };
  },
};

export default nextConfig;

