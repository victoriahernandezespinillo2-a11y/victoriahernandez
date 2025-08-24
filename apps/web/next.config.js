/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configurar el directorio src
  pageExtensions: ['ts', 'tsx', 'js', 'jsx'],
  // Configuración para el monorepo
  transpilePackages: ['@repo/ui'],
  // Configurar para usar Node.js Runtime por defecto
  serverExternalPackages: ['pg', 'bcryptjs', '@repo/auth'],
  eslint: {
    ignoreDuringBuilds: true,
  },
  async rewrites() {
    return {
      beforeFiles: [],
      afterFiles: [
        // Excluir NextAuth del proxy
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
