import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Polideportivo API',
  description: 'API para la plataforma del polideportivo',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}