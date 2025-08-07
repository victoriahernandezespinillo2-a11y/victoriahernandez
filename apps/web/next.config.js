/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configurar el directorio src
  pageExtensions: ['ts', 'tsx', 'js', 'jsx'],
  // Configuración para el monorepo
  transpilePackages: ['@repo/ui'],
  // Configurar para usar Node.js Runtime por defecto
  serverExternalPackages: ['pg', 'bcryptjs', '@repo/auth'],
};

export default nextConfig;
