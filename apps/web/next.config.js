/**
 * Configuración Next.js Enterprise para el frontend Web
 * 
 * SOLUCIÓN ROBUSTA Y ESCALABLE:
 * 1. afterFiles: Reescribe rutas específicas después de que Next.js busque rutas locales
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
      afterFiles: [
        // REWRITE ESPECÍFICO: Rutas que sabemos que deben ir al backend
        {
          source: '/api/reservations/:path*',
          destination: `${apiUrl}/api/reservations/:path*`,
        },
        {
          source: '/api/tournaments/:path*',
          destination: `${apiUrl}/api/tournaments/:path*`,
        },
        {
          source: '/api/memberships/:path*',
          destination: `${apiUrl}/api/memberships/:path*`,
        },
        {
          source: '/api/products/:path*',
          destination: `${apiUrl}/api/products/:path*`,
        },
        {
          source: '/api/courts/:path*',
          destination: `${apiUrl}/api/courts/:path*`,
        },
        {
          source: '/api/centers/:path*',
          destination: `${apiUrl}/api/centers/:path*`,
        },
        {
          source: '/api/users/:path*',
          destination: `${apiUrl}/api/users/:path*`,
        },
        {
          source: '/api/waiting-list/:path*',
          destination: `${apiUrl}/api/waiting-list/:path*`,
        },
        {
          source: '/api/pricing/:path*',
          destination: `${apiUrl}/api/pricing/:path*`,
        },
        {
          source: '/api/notifications/:path*',
          destination: `${apiUrl}/api/notifications/:path*`,
        },
        {
          source: '/api/payments/:path*',
          destination: `${apiUrl}/api/payments/:path*`,
        },
        {
          source: '/api/wallet/:path*',
          destination: `${apiUrl}/api/wallet/:path*`,
        },
        {
          source: '/api/credits/:path*',
          destination: `${apiUrl}/api/credits/:path*`,
        },
        {
          source: '/api/cart/:path*',
          destination: `${apiUrl}/api/cart/:path*`,
        },
        // FALLBACK: Cualquier otra ruta /api/* que no sea /api/auth/*
        {
          source: '/api/:path((?!auth/).*)',
          destination: `${apiUrl}/api/:path`,
        },
      ],
    };
  },
};

export default nextConfig;

