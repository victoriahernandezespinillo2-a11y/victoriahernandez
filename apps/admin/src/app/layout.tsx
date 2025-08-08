import type { Metadata } from 'next'
import './globals.css'
import { SessionWrapper } from '../components/SessionWrapper'
import ConditionalLayout from '../components/ConditionalLayout'

export const metadata: Metadata = {
  title: 'Admin - Polideportivo Oroquieta',
  description: 'Panel de administración del polideportivo de Oroquieta',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className="antialiased h-full">
        <SessionWrapper>
          <div className="flex min-h-screen bg-gray-50">
            <ConditionalLayout>{children}</ConditionalLayout>
          </div>
        </SessionWrapper>
      </body>
    </html>
  )
}