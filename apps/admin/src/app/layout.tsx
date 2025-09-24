import type { Metadata, Viewport } from 'next'
import './globals.css'
import { SessionWrapper } from '../components/SessionWrapper'
import { ToastProvider } from '../components/ToastProvider'
import ConditionalLayout from '../components/ConditionalLayout'
import ConfirmDialog from '../components/ConfirmDialog'
import ErrorNotification from '../components/ErrorNotification'

export const metadata: Metadata = {
  title: 'Admin - Polideportivo Victoria Hernandez',
  description: 'Panel de administración del polideportivo de Victoria Hernandez',
  manifest: '/manifest.json',
  robots: 'noindex, nofollow',
  icons: {
    icon: [
      { url: '/favicon.ico?v=2', sizes: 'any' },
      { url: '/images/logo.png?v=2', sizes: '32x32', type: 'image/png' },
      { url: '/images/logo.png?v=2', sizes: '16x16', type: 'image/png' },
    ],
    apple: [
      { url: '/images/logo.png?v=2', sizes: '180x180', type: 'image/png' },
    ],
    shortcut: '/favicon.ico?v=2',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Admin Polideportivo'
  },
  formatDetection: {
    telephone: false
  }
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#1f2937'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <head>
        {/* No-index configuration for admin panel */}
        <meta name="robots" content="noindex, nofollow, noarchive, nosnippet" />
        <meta name="googlebot" content="noindex, nofollow" />
        
        {/* Favicon configuration for maximum compatibility */}
        <link rel="icon" href="/favicon.ico?v=2" sizes="any" />
        <link rel="icon" href="/images/logo.png?v=2" type="image/png" sizes="32x32" />
        <link rel="icon" href="/images/logo.png?v=2" type="image/png" sizes="16x16" />
        <link rel="apple-touch-icon" href="/images/logo.png?v=2" sizes="180x180" />
        <link rel="shortcut icon" href="/favicon.ico?v=2" />
        <meta name="msapplication-TileImage" content="/images/logo.png?v=2" />
        <meta name="msapplication-TileColor" content="#1f2937" />
        
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="antialiased h-full" suppressHydrationWarning>
        <SessionWrapper>
          <ToastProvider>
            <ConditionalLayout>{children}</ConditionalLayout>
            <ConfirmDialog />
            <ErrorNotification />
          </ToastProvider>
        </SessionWrapper>
      </body>
    </html>
  )
}