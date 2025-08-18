import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { ConditionalNavigation } from "./components/ConditionalNavigation";
import { Footer } from "./components/Footer";
import { SessionWrapper } from "./components/SessionWrapper";
import CookieBanner from "./components/CookieBanner";
import { FirebaseAuthProvider } from "../components/auth/FirebaseAuthProvider";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "Polideportivo Victoria Hernandez - Centro Deportivo Premium",
  description: "El mejor centro deportivo de Victoria Hernandez. Reserva canchas, participa en torneos y disfruta de instalaciones de primera clase.",
  keywords: "polideportivo, deportes, Victoria Hernandez, canchas, reservas, torneos, fútbol, básquet, tenis",
  authors: [{ name: "Polideportivo Victoria Hernandez" }],
  robots: "index, follow",
  openGraph: {
    title: "Polideportivo Victoria Hernandez - Centro Deportivo Premium",
    description: "El mejor centro deportivo de Victoria Hernandez con instalaciones modernas y servicios de calidad.",
    type: "website",
    locale: "es_ES",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="scroll-smooth" data-scroll-behavior="smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Poppins:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`} suppressHydrationWarning={true}>
        <SessionWrapper>
          <FirebaseAuthProvider>
            <div className="min-h-screen flex flex-col">
              <ConditionalNavigation />
              <main className="flex-1">
                {children}
              </main>
              <Footer />
              <CookieBanner />
            </div>
          </FirebaseAuthProvider>
        </SessionWrapper>
      </body>
    </html>
  );
}
