/**
 * Configuración Next.js para el frontend Web
 * Reescribe todas las peticiones que empiecen por /api/ hacia el backend
 * definido en la variable de entorno NEXT_PUBLIC_API_URL, EXCEPTUANDO /api/auth/*
 * que debe permanecer manejado por NextAuth en el frontend.
 */

/** @type {import('next').NextConfig} */
module.exports = {
  async rewrites() {
    if (!process.env.NEXT_PUBLIC_API_URL) {
      // Falla duro en build si la variable no existe para evitar publicar un front roto
      throw new Error('NEXT_PUBLIC_API_URL no está definida. Define la URL del backend en las variables de entorno de Vercel.');
    }
    return {
      afterFiles: [
        {
          // Excluir /api/auth/* para que NextAuth funcione en el frontend
          source: '/api/:path((?!auth/).*)',
          destination: `${process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '')}/api/:path`,
        },
      ],
    };
  },
};
