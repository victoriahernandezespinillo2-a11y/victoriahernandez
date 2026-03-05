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
      { url: "/favicon.ico", sizes: "any" },
      { url: "/images/logo.png?v=2", sizes: "32x32", type: "image/png" },
      { url: "/images/logo.png?v=2", sizes: "16x16", type: "image/png" },
    ],
    apple: [
      { url: "/images/logo.png?v=2", sizes: "180x180", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
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
        {/* 🔒 Production Console Silencer — Anti información disclosure */}
        <Script
          id="console-silencer"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var isProd = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
                  if (!isProd) return;
                  var noop = function() {};
                  var methods = ['log','warn','info','debug','table','trace','dir','dirxml','group','groupCollapsed','groupEnd','time','timeEnd','timeLog','count','countReset','assert','profile','profileEnd','clear'];
                  for (var i = 0; i < methods.length; i++) {
                    console[methods[i]] = noop;
                  }
                  // console.error: mantener pero sanitizar (no exponer stack traces)
                  var origError = console.error;
                  console.error = function() {
                    // Solo mostrar un mensaje genérico, sin detalles internos
                    origError.call(console, '[App] An error occurred.');
                  };
                } catch(e) {}
              })();
            `
          }}
        />
        {/* Favicon configuration for maximum compatibility */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/images/logo.png?v=2" type="image/png" sizes="32x32" />
        <link rel="icon" href="/images/logo.png?v=2" type="image/png" sizes="16x16" />
        <link rel="apple-touch-icon" href="/images/logo.png?v=2" sizes="180x180" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <meta name="msapplication-TileImage" content="/images/logo.png?v=2" />
        <meta name="msapplication-TileColor" content="#0ea5e9" />

        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Poppins:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" />

        {/* Script de manejo de errores de chunks - Enterprise Solution */}
        <Script
          id="chunk-error-handler"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              // Script inline para manejo inmediato de errores de chunks
              (function() {
                let retryCount = 0;
                const maxRetries = 3;
                let isHandling = false;
                
                function isChunkError(error) {
                  if (!error) return false;
                  return error.name === 'ChunkLoadError' ||
                         error.message?.includes('Loading chunk') ||
                         error.message?.includes('timeout') ||
                         error.message?.includes('Failed to fetch');
                }
                
                function isChunkScriptError(event) {
                  // Detectar errores en scripts de chunks
                  if (event.target && event.target.tagName === 'SCRIPT') {
                    const src = event.target.src || event.target.getAttribute('src');
                    if (src && (src.includes('/_next/static/chunks/') || src.includes('/_next/static/'))) {
                      return true;
                    }
                  }
                  return false;
                }
                
                async function clearCaches() {
                  if ('caches' in window) {
                    try {
                      const cacheNames = await caches.keys();
                      await Promise.all(
                        cacheNames
                          .filter(name => name.includes('next-') || name.includes('chunks') || name.includes('static'))
                          .map(name => caches.delete(name).catch(() => {}))
                      );
                    } catch (e) {
                      // silenced
                    }
                  }
                  
                  // Limpiar sessionStorage y localStorage de Next.js
                  try {
                    Object.keys(sessionStorage).forEach(key => {
                      if (key.startsWith('next-') || key.includes('chunk')) {
                        sessionStorage.removeItem(key);
                      }
                    });
                  } catch (e) {
                    // Ignorar errores de sessionStorage
                  }
                }
                
                function handleChunkError() {
                  if (isHandling) return;
                  
                  if (retryCount >= maxRetries) {
                    document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column;font-family:system-ui"><h1 style="color:#dc2626;margin-bottom:1rem">Error al cargar la aplicación</h1><p style="color:#6b7280;margin-bottom:2rem">Por favor, recarga la página manualmente (Ctrl+F5 o Cmd+Shift+R)</p><button onclick="window.location.reload()" style="padding:0.75rem 1.5rem;background:#2563eb;color:white;border:none;border-radius:0.5rem;cursor:pointer">Recargar página</button></div>';
                    return;
                  }
                  
                  isHandling = true;
                  retryCount++;
                  var delay = 1000 * Math.pow(2, retryCount - 1);
                  
                  clearCaches().then(function() {
                    setTimeout(function() {
                      window.location.reload();
                    }, delay);
                  }).catch(function() {
                    setTimeout(function() {
                      window.location.reload();
                    }, delay);
                  });
                }
                
                // Escuchar errores de JavaScript
                window.addEventListener('error', function(event) {
                  if (isChunkError(event.error) || isChunkScriptError(event)) {
                    event.preventDefault();
                    handleChunkError();
                  }
                }, true); // Usar capture phase para interceptar antes
                
                // Escuchar promesas rechazadas
                window.addEventListener('unhandledrejection', function(event) {
                  if (isChunkError(event.reason)) {
                    event.preventDefault();
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
