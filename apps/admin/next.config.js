/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configurar el directorio src
  pageExtensions: ['ts', 'tsx', 'js', 'jsx'],
  
  // Configuración para manejar archivos estáticos
  trailingSlash: false,
  generateEtags: false,
  
  // Configuración para el monorepo
  transpilePackages: ['@repo/ui'],
  
  // Optimizaciones para prevenir ChunkLoadErrors
  ...(process.env.NODE_ENV === 'development' && {
    // Incrementar timeout para carga de chunks en desarrollo
    webpack: (config, { isServer }) => {
      if (!isServer) {
        // Incrementar timeout de webpack para chunks
        config.output = {
          ...config.output,
          chunkLoadTimeout: 60000, // 60 segundos
        };
      }
      return config;
    },
  }),
  
  // Configuración experimental para mejor estabilidad
  experimental: {
    // Tamaño máximo de datos de página más generoso
    largePageDataBytes: 128 * 100000,
  },
  
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
      // Excluir explícitamente las rutas de NextAuth
      {
        source: '/api/auth/:path*',
        destination: '/api/auth/:path*',
      },
      // Redirigir todas las demás rutas /api/* al servidor API
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
