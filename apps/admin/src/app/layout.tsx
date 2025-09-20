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