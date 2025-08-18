import type { Metadata } from 'next'
import './globals.css'

export const metadata = {
  title: 'Polideportivo Victoria Hernandez',
  description: 'Plataforma de gestión del polideportivo de Victoria Hernandez',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-gray-50" suppressHydrationWarning>
        {children}
      </body>
    </html>
  )
}