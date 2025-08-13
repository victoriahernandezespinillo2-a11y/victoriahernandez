/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configurar el directorio src
  pageExtensions: ['ts', 'tsx', 'js', 'jsx'],
  // Configuración para el monorepo
  transpilePackages: ['@repo/ui'],
  
  // Configurar rewrites para redirigir llamadas API al servidor API
  // EXCLUIR rutas de autenticación para evitar conflictos
  async rewrites() {
    return [
      {
        source: '/api/:path((?!auth/).*)',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/:path`,
      },
      // Prefijo interno para llamadas del paquete auth cuando no hay NEXT_PUBLIC_API_URL
      // Mantener NextAuth fuera de este proxy
      {
        source: '/api/backend/:path((?!auth/).*)',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/:path`,
      },
    ];
  },
};

export default nextConfig;
