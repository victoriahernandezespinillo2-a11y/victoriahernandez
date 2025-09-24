import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Footer } from "./components/Footer";
import { SessionWrapper } from "./components/SessionWrapper";
import CookieBanner from "./components/CookieBanner";
import { FirebaseAuthProvider } from "@/components/auth/FirebaseAuthProvider";
import { ClientNavigation } from "./components/ClientNavigation";
import { CartProvider } from "@/lib/contexts/CartContext";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Suspense } from "react";
import Script from "next/script";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "Polideportivo Victoria Hernandez - Centro Deportivo Municipal",
  description: "El mejor centro deportivo de Victoria Hernandez. Reserva canchas, participa en torneos y disfruta de instalaciones de primera clase.",
  keywords: "polideportivo, deportes, Victoria Hernandez, canchas, reservas, torneos, fútbol, básquet, tenis",
  authors: [{ name: "Polideportivo Victoria Hernandez" }],
  applicationName: "Polideportivo Victoria Hernandez",
  other: {
    address: "Polideportivo Victoria Hernández, CALLE CONSENSO, 5, 28041 Madrid, España (Los Rosales, Villaverde)",
    geo: "40.3602693,-3.6861868",
  },
  robots: "index, follow",
  openGraph: {
    title: "Polideportivo Victoria Hernandez - Centro Deportivo Municipal",
    description: "Polideportivo Victoria Hernández — CALLE CONSENSO, 5, 28041 Madrid (Los Rosales, Villaverde). Instalaciones modernas y servicios de calidad.",
    type: "website",
    locale: "es_ES",
  },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico?v=2", sizes: "any" },
      { url: "/favicon?v=2", sizes: "any" },
      { url: "/images/logo.png?v=2", sizes: "32x32", type: "image/png" },
      { url: "/images/logo.png?v=2", sizes: "16x16", type: "image/png" },
    ],
    apple: [
      { url: "/images/logo.png?v=2", sizes: "180x180", type: "image/png" },
    ],
    shortcut: "/favicon.ico?v=2",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0ea5e9",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="scroll-smooth" data-scroll-behavior="smooth">
      <head>
        {/* Favicon configuration for maximum compatibility */}
        <link rel="icon" href="/favicon.ico?v=2" sizes="any" />
        <link rel="icon" href="/favicon?v=2" sizes="any" />
        <link rel="icon" href="/images/logo.png?v=2" type="image/png" sizes="32x32" />
        <link rel="icon" href="/images/logo.png?v=2" type="image/png" sizes="16x16" />
        <link rel="apple-touch-icon" href="/images/logo.png?v=2" sizes="180x180" />
        <link rel="shortcut icon" href="/favicon.ico?v=2" />
        <meta name="msapplication-TileImage" content="/images/logo.png?v=2" />
        <meta name="msapplication-TileColor" content="#0ea5e9" />
        
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Poppins:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" />
        
        {/* Script de manejo de errores de chunks */}
        <Script
          id="chunk-error-handler"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              // Script inline para manejo inmediato de errores de chunks
              (function() {
                let retryCount = 0;
                const maxRetries = 3;
                
                function isChunkError(error) {
                  return error && (
                    error.name === 'ChunkLoadError' ||
                    error.message?.includes('Loading chunk') ||
                    error.message?.includes('timeout')
                  );
                }
                
                function handleChunkError() {
                  if (retryCount >= maxRetries) {
                    console.error('🚨 Máximo de reintentos alcanzado para chunk error');
                    return;
                  }
                  
                  retryCount++;
                  console.log('🔄 Reintentando carga de chunk (intento ' + retryCount + '/' + maxRetries + ')');
                  
                  // Limpiar cache y recargar
                  if ('caches' in window) {
                    caches.keys().then(function(cacheNames) {
                      cacheNames.forEach(function(cacheName) {
                        if (cacheName.includes('next-') || cacheName.includes('chunks')) {
                          caches.delete(cacheName);
                        }
                      });
                    });
                  }
                  
                  setTimeout(function() {
                    window.location.reload();
                  }, 2000 * Math.pow(2, retryCount - 1));
                }
                
                window.addEventListener('error', function(event) {
                  if (isChunkError(event.error)) {
                    handleChunkError();
                  }
                });
                
                window.addEventListener('unhandledrejection', function(event) {
                  if (isChunkError(event.reason)) {
                    handleChunkError();
                  }
                });
              })();
            `
          }}
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`} suppressHydrationWarning={true}>
        <ErrorBoundary>
          <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Cargando aplicación...</p>
              </div>
            </div>
          }>
            <SessionWrapper>
              <FirebaseAuthProvider>
                <CartProvider>
                  <div className="min-h-screen flex flex-col">
                    <ClientNavigation />
                    <main className="flex-1">
                      {children}
                    </main>
                    <Footer />
                    <CookieBanner />
                  </div>
                </CartProvider>
              </FirebaseAuthProvider>
            </SessionWrapper>
          </Suspense>
        </ErrorBoundary>
      </body>
    </html>
  );
}
