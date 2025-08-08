/** @type {import('next').NextConfig} */
const nextConfig = {
  pageExtensions: ['ts', 'tsx', 'js', 'jsx'],
  transpilePackages: ['@repo/ui', '@repo/auth', '@repo/db'],
  async rewrites() {
    // Usamos afterFiles para que las rutas internas como /api/auth/* NO se reescriban
    // y el resto de /api/* se proxyeen al backend API.
    return {
      beforeFiles: [],
      afterFiles: [
        // Excluir explícitamente NextAuth del rewrite
        // Solo reescribir cuando el path NO empieza por auth/
        {
          source: '/api/:path((?!auth/).*)',
          destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/:path`,
        },
      ],
      fallback: [],
    };
  },
};

export default nextConfig;
