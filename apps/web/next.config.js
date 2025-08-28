import withPWA from "next-pwa";

const isProd = process.env.NODE_ENV === "production";

const pwa = withPWA({
  dest: "public",
  disable: !isProd,
  register: true,
  skipWaiting: true,
  runtimeCaching: [
    {
      urlPattern: /^https?:\/\/.*\.(?:png|jpg|jpeg|svg|webp|gif|ico)$/i,
      handler: "CacheFirst",
      options: {
        cacheName: "images-cache",
        expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 },
      },
    },
    {
      urlPattern: /^https?:\/\/.*\.(?:css|js)$/i,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "static-resources",
        expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
      },
    },
    {
      urlPattern: ({ url }) => url.origin === self.location.origin,
      handler: "NetworkFirst",
      options: {
        cacheName: "pages-and-api",
        networkTimeoutSeconds: 3,
        expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 7 },
      },
    },
  ],
  fallbacks: {
    document: "/offline",
  },
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  pageExtensions: ["ts", "tsx", "js", "jsx"],
  transpilePackages: [
    "@repo/ui",
  ],
  serverExternalPackages: ["pg", "bcryptjs", "@repo/auth"],
  eslint: { ignoreDuringBuilds: true },
  async rewrites() {
    return {
      beforeFiles: [],
      afterFiles: [
        {
          source: "/api/:path((?!auth/).*)",
          destination: `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002"}/api/:path`,
        },
        {
          source: "/api/backend/:path((?!auth/).*)",
          destination: `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002"}/api/:path`,
        },
      ],
      fallback: [],
    };
  },
};

export default pwa(nextConfig);
