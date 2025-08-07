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
        source: '/api/((?!auth).*)/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/$1/:path*`,
      },
    ];
  },
};

export default nextConfig;
