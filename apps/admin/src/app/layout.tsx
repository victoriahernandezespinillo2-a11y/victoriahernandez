import type { Metadata } from 'next'
import './globals.css'
import { SessionWrapper } from '../components/SessionWrapper'
import { ToastProvider } from '../components/ToastProvider'
import ConditionalLayout from '../components/ConditionalLayout'

export const metadata: Metadata = {
  title: 'Admin - Polideportivo Victoria Hernandez',
  description: 'Panel de administración del polideportivo de Victoria Hernandez',
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
          </ToastProvider>
        </SessionWrapper>
      </body>
    </html>
  )
}