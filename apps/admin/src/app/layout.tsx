import type { Metadata } from 'next'
import './globals.css'
import { SessionWrapper } from '../components/SessionWrapper'
import { ToastProvider } from '../components/ToastProvider'
import ConditionalLayout from '../components/ConditionalLayout'
import ConfirmDialog from '../components/ConfirmDialog'

export const metadata: Metadata = {
  title: 'Admin - Polideportivo Victoria Hernandez',
  description: 'Panel de administración del polideportivo de Victoria Hernandez',
  manifest: '/manifest.json',
  themeColor: '#1f2937',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Admin Polideportivo'
  },
  formatDetection: {
    telephone: false
  }
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
          </ToastProvider>
        </SessionWrapper>
      </body>
    </html>
  )
}