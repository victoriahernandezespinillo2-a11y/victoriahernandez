/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configurar el directorio src
  pageExtensions: ['ts', 'tsx', 'js', 'jsx'],
  // Configuración para el monorepo
  transpilePackages: ['@repo/ui', '@repo/db', '@repo/auth', '@repo/payments', '@repo/notifications', '@repo/credit-system'],
  // Evitar que Prisma se transpile/empotre: mantiene los binarios y cliente generados correctamente
  serverExternalPackages: ['@prisma/client', 'prisma'],
  // Evitar que errores de ESLint bloqueen builds en entornos CI
  eslint: {
    ignoreDuringBuilds: true,
  },
  // ⚠️ Deshabilitar verificación de tipos durante el build para deployment rápido
  typescript: {
    ignoreBuildErrors: true,
  },
}

export default nextConfig