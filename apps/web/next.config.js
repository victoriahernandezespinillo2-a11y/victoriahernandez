/**
 * Configuración Next.js Enterprise para el frontend Web
 * 
 * SOLUCIÓN ROBUSTA Y ESCALABLE:
 * 1. beforeFiles: Intercepta TODAS las rutas /api/* ANTES de que Next.js busque rutas locales
 * 2. Excepción: Solo /api/auth/* permanece en el frontend (NextAuth)
 * 3. Fallback: Si no hay variable de entorno, usa URL hardcodeada
 * 4. Logging: Información de debug para troubleshooting
 */

/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    // OBTENER URL DEL BACKEND CON FALLBACK
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://polideportivo-api.vercel.app';
    
    console.log('🔧 [NEXT-CONFIG] Configurando rewrites...');
    console.log('🔧 [NEXT-CONFIG] API URL:', apiUrl);
    console.log('🔧 [NEXT-CONFIG] NODE_ENV:', process.env.NODE_ENV);

    return {
      beforeFiles: [
        // INTERCEPTAR TODAS LAS RUTAS /api/* ANTES de que Next.js busque rutas locales
        // EXCEPTO /api/auth/* que debe permanecer en el frontend para NextAuth
        {
          source: '/api/:path((?!auth/).*)',
          destination: `${apiUrl}/api/:path`,
        },
      ],
    };
  },
};

export default nextConfig;

