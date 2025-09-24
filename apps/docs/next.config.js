/** @type {import('next').NextConfig} */
const nextConfig = {
  // Removido output: 'export' para compatibilidad con Vercel
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  // Configuración para Vercel
  assetPrefix: process.env.NODE_ENV === 'production' ? '' : '',
  basePath: process.env.NODE_ENV === 'production' ? '' : '',
};

export default nextConfig;
