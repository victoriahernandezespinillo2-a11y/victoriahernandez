import Link from "next/link";
import { Button } from "@repo/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/card";
import { Badge } from "@repo/ui/badge";
import { 
  Users, 
  Settings, 
  FileText, 
  Shield, 
  Smartphone, 
  CreditCard,
  Calendar,
  ShoppingCart,
  Trophy,
  Wallet,
  QrCode,
  BarChart3
} from "lucide-react";
import CurrentDate from "./components/CurrentDate";

export default function Home() {
  const documentationSections = [
    {
      title: "Manual de Usuario",
      description: "Guía operativa para usuarios finales del sistema",
      icon: <Users className="w-8 h-8 text-blue-600" />,
      href: "/user-manual",
      features: [
        "Reservas 24/7 con confirmación instantánea",
        "Sistema de membresías (Básico, Premium, VIP)", 
        "Tienda online con productos deportivos",
        "Monedero digital con créditos",
        "Torneos y competencias deportivas",
        "Control de acceso con código QR",
        "PWA optimizada para móviles"
      ],
      color: "border-blue-200 bg-blue-50 hover:bg-blue-100"
    },
    {
      title: "Manual de Administración",
      description: "Guía ejecutiva para administradores y propietarios",
      icon: <Settings className="w-8 h-8 text-green-600" />,
      href: "/admin-manual",
      features: [
        "Dashboard con métricas en tiempo real",
        "Gestión completa de canchas y horarios",
        "Sistema de pagos con Redsys integrado",
        "Reportes financieros y contabilidad",
        "Administración de usuarios y membresías",
        "Sistema de mantenimiento programado",
        "Notificaciones masivas y comunicaciones"
      ],
      color: "border-green-200 bg-green-50 hover:bg-green-100"
    },
    {
      title: "Documentación Técnica",
      description: "Especificaciones técnicas y mantenimiento del sistema",
      icon: <FileText className="w-8 h-8 text-purple-600" />,
      href: "/technical-docs",
      features: [
        "Monorepo con Turborepo y pnpm workspaces",
        "Next.js 15 con App Router y React 19",
        "PostgreSQL con Prisma ORM (Supabase)",
        "Sistema de ledger contable integrado",
        "Autenticación NextAuth.js v5 + Firebase",
        "Deployment en Vercel (producción)",
        "Integración Redsys para pagos"
      ],
      color: "border-purple-200 bg-purple-50 hover:bg-purple-100"
    },
    {
      title: "Garantías y Soporte",
      description: "Términos de garantía y servicios de soporte técnico",
      icon: <Shield className="w-8 h-8 text-orange-600" />,
      href: "/warranty-support",
      features: [
        "Garantía de funcionalidad 24 meses",
        "Soporte técnico especializado 24/7",
        "SLA 99.9% de disponibilidad",
        "Actualizaciones de seguridad incluidas",
        "Capacitación del personal incluida",
        "Respuesta garantizada en 1 hora"
      ],
      color: "border-orange-200 bg-orange-50 hover:bg-orange-100"
    }
  ];

  const quickFeatures = [
    {
      icon: <Smartphone className="w-6 h-6" />,
      title: "PWA Móvil",
      description: "Aplicación web progresiva optimizada para móviles con instalación nativa"
    },
    {
      icon: <CreditCard className="w-6 h-6" />,
      title: "Pagos Redsys",
      description: "Integración completa con Redsys para pagos seguros con tarjeta"
    },
    {
      icon: <Calendar className="w-6 h-6" />,
      title: "Reservas 24/7",
      description: "Sistema de reservas en tiempo real con disponibilidad actualizada"
    },
    {
      icon: <ShoppingCart className="w-6 h-6" />,
      title: "E-commerce",
      description: "Tienda online completa con productos deportivos y servicios"
    },
    {
      icon: <Trophy className="w-6 h-6" />,
      title: "Torneos",
      description: "Gestión completa de torneos con inscripciones y resultados"
    },
    {
      icon: <Wallet className="w-6 h-6" />,
      title: "Créditos",
      description: "Sistema de monedero digital con recarga y uso de créditos"
    },
    {
      icon: <QrCode className="w-6 h-6" />,
      title: "QR Access",
      description: "Control de acceso con escáner QR para instalaciones y productos"
    },
    {
      icon: <BarChart3 className="w-6 h-6" />,
      title: "Analytics",
      description: "Dashboard ejecutivo con métricas y reportes financieros"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <header className="relative bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 shadow-xl">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center text-white">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 rounded-full mb-6 backdrop-blur-sm">
              <span className="text-4xl">🏟️</span>
            </div>
            <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
              Sistema de Gestión Polideportivo
            </h1>
            <p className="text-xl text-blue-100 mb-6 max-w-3xl mx-auto">
              Documentación Ejecutiva del Sistema de Gestión
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Badge className="text-lg px-6 py-3 bg-white/20 text-white border-white/30 backdrop-blur-sm">
                v2.0 - Sistema Empresarial
              </Badge>
              <Badge className="text-lg px-6 py-3 bg-green-500/80 text-white border-green-400/50 backdrop-blur-sm">
                ✅ Sistema Operativo
              </Badge>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Welcome Section */}
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Documentación del Sistema de Gestión
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Esta documentación proporciona información completa para la operación, administración y mantenimiento 
            del sistema de gestión del polideportivo. Incluye manuales operativos, guías de administración 
            y documentación técnica detallada.
          </p>
        </div>

        {/* Documentation Sections */}
        <div className="grid md:grid-cols-2 gap-8 mb-16">
          {documentationSections.map((section, index) => (
            <Card key={index} className={`group relative overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 ${section.color} border-2 hover:border-opacity-50`}>
              <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <CardHeader className="relative">
                <div className="flex items-center space-x-4">
                  <div className="p-3 rounded-xl bg-white/80 shadow-lg group-hover:scale-110 transition-transform duration-300">
                    {section.icon}
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors duration-300">
                      {section.title}
                    </CardTitle>
                    <CardDescription className="text-gray-600 font-medium">
                      {section.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="relative">
                <ul className="space-y-3 mb-6">
                  {section.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start text-sm text-gray-700 group-hover:text-gray-900 transition-colors duration-300">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mr-3 mt-2 flex-shrink-0 group-hover:bg-blue-600 transition-colors duration-300"></div>
                      <span className="leading-relaxed">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link href={section.href}>
                  <Button className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3 px-6 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                    📖 Acceder a la Documentación
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Features Grid */}
        <div className="mb-16">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-gray-900 mb-4">
              ⚙️ Características del Sistema
            </h3>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Solución tecnológica empresarial para gestión integral de instalaciones deportivas
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {quickFeatures.map((feature, index) => (
              <div key={index} className="group text-center p-6 bg-white rounded-xl shadow-lg border border-gray-100 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300">
                <div className="flex justify-center mb-4">
                  <div className="p-4 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl text-white group-hover:scale-110 transition-transform duration-300 shadow-lg">
                    {feature.icon}
                  </div>
                </div>
                <h4 className="font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors duration-300">
                  {feature.title}
                </h4>
                <p className="text-sm text-gray-600 leading-relaxed group-hover:text-gray-800 transition-colors duration-300">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Start */}
        <div className="relative bg-gradient-to-r from-green-500 via-blue-500 to-purple-600 rounded-2xl shadow-2xl p-8 text-center text-white overflow-hidden">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/5 to-transparent"></div>
          <div className="relative">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-full mb-6 backdrop-blur-sm">
              <span className="text-2xl">🎯</span>
            </div>
            <h3 className="text-3xl font-bold mb-4">
              Guía de Navegación
            </h3>
            <p className="text-lg text-blue-100 mb-8 max-w-2xl mx-auto leading-relaxed">
              Para <strong className="text-white">administradores y propietarios</strong>, se recomienda comenzar con el 
              <strong className="text-white"> Manual de Administración</strong>. Para <strong className="text-white">usuarios finales</strong>, consulte el 
              <strong className="text-white"> Manual de Usuario</strong>.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/admin-manual">
                <Button size="lg" className="bg-white text-green-600 hover:bg-green-50 font-bold px-8 py-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                  <Settings className="w-6 h-6 mr-3" />
                  Manual de Administración
                </Button>
              </Link>
              <Link href="/user-manual">
                <Button size="lg" className="bg-white/20 text-white border-2 border-white/50 hover:bg-white/30 hover:border-white font-bold px-8 py-4 rounded-xl backdrop-blur-sm transition-all duration-300 transform hover:scale-105">
                  <Users className="w-6 h-6 mr-3" />
                  Manual de Usuario
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative bg-gradient-to-r from-gray-900 via-blue-900 to-indigo-900 text-white py-16">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 rounded-full mb-6 backdrop-blur-sm">
              <span className="text-3xl">🏟️</span>
            </div>
            <h4 className="text-2xl font-bold mb-4 bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
              Sistema de Gestión Polideportivo
            </h4>
            <p className="text-blue-200 mb-6 max-w-2xl mx-auto text-lg">
              Solución empresarial integral para la gestión y administración de instalaciones deportivas
            </p>
          </div>
          <div className="flex flex-wrap justify-center items-center gap-6 text-sm">
            <div className="flex items-center space-x-2 bg-white/10 px-4 py-2 rounded-full backdrop-blur-sm">
              <span className="text-green-400">✅</span>
              <span className="text-white font-semibold">Versión 2.0</span>
            </div>
            <div className="flex items-center space-x-2 bg-white/10 px-4 py-2 rounded-full backdrop-blur-sm">
              <span className="text-blue-400">📅</span>
              <span className="text-white">Última actualización: <CurrentDate /></span>
            </div>
            <div className="flex items-center space-x-2 bg-white/10 px-4 py-2 rounded-full backdrop-blur-sm">
              <span className="text-purple-400">🛡️</span>
              <span className="text-white">Soporte técnico especializado</span>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-white/10 text-center">
            <p className="text-blue-200 text-sm">
              © 2024 Sistema de Gestión Polideportivo. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
