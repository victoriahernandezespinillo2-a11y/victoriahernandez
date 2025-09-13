/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configurar el directorio src
  pageExtensions: ['ts', 'tsx', 'js', 'jsx'],
  // Configuración para el monorepo
  transpilePackages: ['@repo/ui'],
  // Permitir dominios externos de logos/imagenes usados en el panel
  images: {
    domains: [
      'images.unsplash.com',
      'www.madrid.es',
      'madrid.es',
      'identidad.madrid.es',
      'res.cloudinary.com',
      'upload.wikimedia.org',
      'pbs.twimg.com',
      'img.freepik.com',
      'static.vecteezy.com',
    ],
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'www.madrid.es' },
      { protocol: 'https', hostname: 'madrid.es' },
      { protocol: 'https', hostname: 'identidad.madrid.es' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'upload.wikimedia.org' },
      { protocol: 'https', hostname: 'pbs.twimg.com' },
      { protocol: 'https', hostname: 'img.freepik.com' },
      { protocol: 'https', hostname: 'static.vecteezy.com' },
    ],
  },
  
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
