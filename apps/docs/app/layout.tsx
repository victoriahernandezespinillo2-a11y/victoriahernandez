import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "Sistema de Gestión Polideportivo - Documentación",
  description: "Documentación completa del sistema de gestión para polideportivos. Manuales de usuario, administración, documentación técnica y soporte.",
  keywords: ["polideportivo", "gestión deportiva", "reservas", "documentación", "manual", "soporte"],
  authors: [{ name: "Equipo de Desarrollo" }],
  viewport: "width=device-width, initial-scale=1",
  robots: "noindex, nofollow",
  openGraph: {
    title: "Sistema de Gestión Polideportivo - Documentación",
    description: "Documentación completa del sistema de gestión para polideportivos",
    type: "website",
    locale: "es_ES",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <head>
        <meta name="robots" content="noindex, nofollow, noarchive, nosnippet" />
        <meta name="googlebot" content="noindex, nofollow" />
      </head>
      <body 
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning={true}
      >
        {children}
      </body>
    </html>
  );
}
