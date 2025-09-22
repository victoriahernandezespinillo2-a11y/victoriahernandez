import Link from "next/link";
import { Button } from "@repo/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/card";
import { Badge } from "@repo/ui/badge";
import { 
  ArrowLeft,
  Code,
  Server,
  Database,
  Shield,
  Globe,
  Wrench,
  Monitor,
  Cloud,
  Zap,
  Settings,
  FileText,
  GitBranch,
  Package,
  AlertTriangle,
  CheckCircle,
  Lock,
  RefreshCw,
  Download
} from "lucide-react";

export default function TechnicalDocs() {
  const architectureSections = [
    {
      id: "overview",
      title: "Arquitectura General",
      icon: <Server className="w-6 h-6 text-blue-600" />,
      description: "Vista general del sistema y sus componentes",
      details: [
        "Monorepo con Turborepo + pnpm workspaces",
        "3 aplicaciones: Web (3001), Admin (3003), API (3002)",
        "Base de datos PostgreSQL (Supabase)",
        "Autenticación NextAuth.js v5 + Firebase"
      ]
    },
    {
      id: "frontend",
      title: "Frontend",
      icon: <Monitor className="w-6 h-6 text-green-600" />,
      description: "Aplicaciones de usuario y administrador",
      details: [
        "Next.js 15 con App Router",
        "React 19 con TypeScript",
        "Tailwind CSS para estilos",
        "PWA optimizada para móviles"
      ]
    },
    {
      id: "backend",
      title: "Backend",
      icon: <Code className="w-6 h-6 text-purple-600" />,
      description: "API REST y servicios",
      details: [
        "Next.js API Routes",
        "Prisma ORM para base de datos",
        "Integración Redsys (pagos)",
        "Sistema de notificaciones (SendGrid)"
      ]
    },
    {
      id: "database",
      title: "Base de Datos",
      icon: <Database className="w-6 h-6 text-orange-600" />,
      description: "Esquema y gestión de datos",
      details: [
        "PostgreSQL en Supabase",
        "Migraciones con Prisma",
        "Sistema de ledger contable",
        "Row Level Security (RLS) activo"
      ]
    },
    {
      id: "security",
      title: "Seguridad",
      icon: <Shield className="w-6 h-6 text-red-600" />,
      description: "Medidas de seguridad implementadas",
      details: [
        "NextAuth.js v5 (JWT)",
        "Firebase Admin SDK",
        "Validación de datos con Zod",
        "Cookies aisladas por app"
      ]
    },
    {
      id: "deployment",
      title: "Despliegue",
      icon: <Cloud className="w-6 h-6 text-indigo-600" />,
      description: "Configuración de producción",
      details: [
        "Deployment en Vercel",
        "Variables de entorno en Vercel",
        "Build automatizado con Turborepo",
        "Dominios personalizados"
      ]
    }
  ];

  const deploymentSteps = [
    {
      step: 1,
      title: "Configurar Vercel",
      icon: <Globe className="w-5 h-5" />,
      description: "Conectar repositorio GitHub con Vercel",
      commands: [
        "vercel login",
        "vercel link",
        "vercel env add DATABASE_URL",
        "vercel env add NEXTAUTH_SECRET"
      ]
    },
    {
      step: 2,
      title: "Configurar Supabase",
      icon: <Database className="w-5 h-5" />,
      description: "Configurar base de datos en Supabase",
      commands: [
        "Crear proyecto en supabase.com",
        "Configurar DATABASE_URL",
        "Configurar RLS policies",
        "Ejecutar migraciones Prisma"
      ]
    },
    {
      step: 3,
      title: "Variables de Entorno",
      icon: <Settings className="w-5 h-5" />,
      description: "Configurar todas las variables en Vercel",
      commands: [
        "vercel env add REDSYS_MERCHANT_CODE",
        "vercel env add SENDGRID_API_KEY",
        "vercel env add FIREBASE_PROJECT_ID",
        "vercel env add GOOGLE_CLIENT_ID"
      ]
    },
    {
      step: 4,
      title: "Build y Deploy",
      icon: <Zap className="w-5 h-5" />,
      description: "Desplegar aplicaciones en Vercel",
      commands: [
        "git push origin main",
        "Vercel build automático",
        "Configurar dominios personalizados",
        "Verificar deployment"
      ]
    },
    {
      step: 5,
      title: "Verificación",
      icon: <CheckCircle className="w-5 h-5" />,
      description: "Verificar que todo funciona correctamente",
      commands: [
        "Probar login en web app",
        "Verificar panel admin",
        "Probar pagos Redsys",
        "Verificar notificaciones"
      ]
    }
  ];

  const servicesConfig = [
              {
                service: "Base de Datos",
                provider: "Supabase",
                description: "PostgreSQL con SSL y PgBouncer",
                credentials: "victoriahernandezespinillo2@gmail.com",
                status: "Activo"
              },
              {
                service: "Control de Versiones",
                provider: "GitHub",
                description: "Repositorio privado del proyecto",
                credentials: "victoriahernandezespinillo2@gmail.com",
                status: "Activo"
              },
              {
                service: "Soporte Técnico",
                provider: "GlobalMindT",
                description: "Equipo de desarrollo y soporte",
                credentials: "soporteglobalmindt@gmail.com / +34 692 835 646",
                status: "Activo"
              },
    {
      service: "Notificaciones Email",
      provider: "SendGrid",
      description: "Envío de emails transaccionales",
      credentials: "CP5AJ6T9ZCFVDETUAGPZ2MQZ",
      status: "Activo"
    },
    {
      service: "Email Corporativo",
      provider: "ZOHO",
      description: "Gestión de emails del negocio",
      credentials: "victoriahernandezespinillo2@gmail.com",
      status: "Activo"
    },
    {
      service: "Pagos",
      provider: "Redsys",
      description: "Procesamiento de pagos con tarjeta",
      credentials: "Usuario: 367717568",
      status: "Activo"
    },
    {
      service: "Deployment",
      provider: "Vercel",
      description: "Hosting y deployment automático",
      credentials: "Conectado a GitHub",
      status: "Activo"
    },
    {
      service: "Dominios",
      provider: "Hostinger",
      description: "Gestión de dominios personalizados",
      credentials: "polideportivovictoriahernandez.es",
      status: "Activo"
    },
    {
      service: "Email Corporativo",
      provider: "Hostinger Email",
      description: "Servicio de correo electrónico empresarial",
      credentials: "victoriahernandezespinillo2@gmail.com",
      status: "Activo"
    }
  ];

  const systemUrls = [
    {
      service: "Aplicación Web Principal",
      url: "https://polideportivovictoriahernandez.es",
      description: "Sitio web principal para usuarios finales",
      status: "Activo"
    },
    {
      service: "Aplicación Web Alternativa",
      url: "https://www.polideportivovictoriahernandez.es",
      description: "URL alternativa con www",
      status: "Activo"
    },
    {
      service: "Aplicación Web Internacional",
      url: "https://polideportivovictoriahernandez.com",
      description: "Dominio internacional (.com)",
      status: "Activo"
    },
    {
      service: "Aplicación Web Online",
      url: "https://polideportivovictoriahernandez.online",
      description: "Dominio alternativo (.online)",
      status: "Activo"
    },
    {
      service: "Aplicación Web Vercel",
      url: "https://victoriahernandez.vercel.app",
      description: "URL de desarrollo en Vercel",
      status: "Activo"
    },
    {
      service: "Panel de Administración",
      url: "https://administradorpolideportivo.vercel.app",
      description: "Panel administrativo del sistema",
      status: "Activo"
    },
    {
      service: "API Backend",
      url: "https://apipolideportivo.vercel.app",
      description: "API REST del sistema",
      status: "Activo"
    }
  ];

  const maintenanceTasks = [
    {
      category: "Diario",
      tasks: [
        "Verificar logs de errores en Vercel",
        "Revisar métricas de Supabase",
        "Comprobar estado de pagos Redsys"
      ]
    },
    {
      category: "Semanal",
      tasks: [
        "Revisar logs de SendGrid",
        "Verificar respaldos de Supabase",
        "Comprobar rendimiento de Vercel"
      ]
    },
    {
      category: "Mensual",
      tasks: [
        "Auditoría de seguridad",
        "Revisión de costos Vercel/Supabase",
        "Actualización de dependencias"
      ]
    }
  ];

  const backupProcedures = [
    {
      type: "Base de Datos",
      frequency: "Automático (Supabase)",
      location: "Supabase Backups",
      command: "Respaldos automáticos diarios en Supabase"
    },
    {
      type: "Código Fuente",
      frequency: "Continuo",
      location: "GitHub Repository",
      command: "git push origin main"
    },
    {
      type: "Variables de Entorno",
      frequency: "Manual",
      location: "Vercel Dashboard",
      command: "Exportar desde Vercel Dashboard"
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Volver
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  🔧 Documentación Técnica
                </h1>
                <p className="text-gray-600">
                  Arquitectura, deployment y mantenimiento del sistema
                </p>
              </div>
            </div>
            <Badge variant="secondary" className="text-sm bg-purple-100 text-purple-800">
              Técnico
            </Badge>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Introduction */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg text-white p-8 mb-8">
          <div className="flex items-center mb-4">
            <Code className="w-8 h-8 mr-3" />
            <h2 className="text-3xl font-bold">Arquitectura del Sistema</h2>
          </div>
          <p className="text-lg text-purple-100 mb-4">
            Documentación técnica completa para desarrolladores y administradores de sistemas.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center text-purple-100">
              <GitBranch className="w-5 h-5 mr-2" />
              <span>Monorepo escalable</span>
            </div>
            <div className="flex items-center text-purple-100">
              <Package className="w-5 h-5 mr-2" />
              <span>TypeScript + React</span>
            </div>
            <div className="flex items-center text-purple-100">
              <Database className="w-5 h-5 mr-2" />
              <span>PostgreSQL + Prisma</span>
            </div>
            <div className="flex items-center text-purple-100">
              <Cloud className="w-5 h-5 mr-2" />
              <span>Deployment automatizado</span>
            </div>
          </div>
        </div>

        {/* Architecture Overview */}
        <div className="mb-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-6">
            🏗️ Arquitectura del Sistema
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {architectureSections.map((section, index) => (
              <Card key={section.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    {section.icon}
                    <div>
                      <CardTitle className="text-lg text-gray-900">
                        {section.title}
                      </CardTitle>
                      <CardDescription>
                        {section.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {section.details.map((detail, detailIndex) => (
                      <li key={detailIndex} className="flex items-center text-sm text-gray-600">
                        <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                        {detail}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Deployment Guide */}
        <div className="mb-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-6">
            📋 Guía de Despliegue
          </h3>
          <div className="space-y-6">
            {deploymentSteps.map((step, index) => (
              <Card key={step.step} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                        {step.step}
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        {step.icon}
                        <h4 className="text-lg font-semibold text-gray-900">
                          {step.title}
                        </h4>
                      </div>
                      <p className="text-gray-600 mb-4">
                        {step.description}
                      </p>
                      <div className="bg-gray-900 rounded-lg p-4">
                        <code className="text-green-400 text-sm">
                          {step.commands.map((command, cmdIndex) => (
                            <div key={cmdIndex} className="mb-1">
                              $ {command}
                            </div>
                          ))}
                        </code>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Maintenance */}
        {/* System URLs */}
        <div className="mb-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-6">
            🌐 URLs del Sistema
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {systemUrls.map((url, index) => (
              <Card key={index} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg text-gray-900">
                      {url.service}
                    </CardTitle>
                    <Badge className={url.status === 'Activo' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                      {url.status}
                    </Badge>
                  </div>
                  <CardDescription className="text-sm text-gray-600">
                    {url.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-blue-600 font-mono break-all">
                    <a href={url.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                      {url.url}
                    </a>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Services Configuration */}
        <div className="mb-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-6">
            🔌 Servicios Configurados
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {servicesConfig.map((service, index) => (
              <Card key={index} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg text-gray-900">
                      {service.service}
                    </CardTitle>
                    <Badge className={service.status === 'Activo' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                      {service.status}
                    </Badge>
                  </div>
                  <CardDescription className="text-sm text-gray-600">
                    {service.provider}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-700 mb-3">
                    {service.description}
                  </p>
                  <div className="text-xs text-gray-500">
                    <strong>Credenciales:</strong> {service.credentials}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Maintenance Tasks */}
        <div className="mb-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-6">
            🔧 Mantenimiento del Sistema
          </h3>
          <div className="grid md:grid-cols-3 gap-6">
            {maintenanceTasks.map((category, index) => (
              <Card key={index} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="text-lg text-gray-900">
                    {category.category}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {category.tasks.map((task, taskIndex) => (
                      <li key={taskIndex} className="flex items-center text-sm text-gray-600">
                        <div className="w-2 h-2 bg-blue-600 rounded-full mr-3"></div>
                        {task}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Backup Procedures */}
        <div className="mb-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-6">
            💾 Procedimientos de Respaldo
          </h3>
          <div className="space-y-4">
            {backupProcedures.map((backup, index) => (
              <Card key={index} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <Database className="w-6 h-6 text-blue-600" />
                      <div>
                        <h4 className="font-semibold text-gray-900">
                          {backup.type}
                        </h4>
                        <p className="text-sm text-gray-600">
                          Frecuencia: {backup.frequency} | Ubicación: {backup.location}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline">
                      <RefreshCw className="w-4 h-4 mr-1" />
                      {backup.frequency}
                    </Badge>
                  </div>
                  <div className="bg-gray-900 rounded-lg p-3">
                    <code className="text-green-400 text-sm">
                      {backup.command}
                    </code>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Security Information */}
        <div className="mb-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-6">
            🔒 Información de Seguridad
          </h3>
          <Card className="border-l-4 border-l-red-500 bg-red-50">
            <CardContent className="p-6">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-6 h-6 text-red-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-red-900 mb-2">
                    Información Crítica de Seguridad
                  </h4>
                  <ul className="space-y-2 text-red-800">
                    <li className="flex items-center">
                      <Lock className="w-4 h-4 mr-2" />
                      Mantener actualizadas las dependencias de seguridad
                    </li>
                    <li className="flex items-center">
                      <Shield className="w-4 h-4 mr-2" />
                      Configurar firewall y acceso restringido
                    </li>
                    <li className="flex items-center">
                      <FileText className="w-4 h-4 mr-2" />
                      Documentar todos los accesos y cambios
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Support Section */}
        <div className="mt-12 bg-white rounded-lg shadow-sm border p-8 text-center">
          <Wrench className="w-12 h-12 text-purple-600 mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-gray-900 mb-4">
            Soporte Técnico Especializado
          </h3>
          <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
            Para consultas técnicas avanzadas, problemas de deployment o mantenimiento 
            del sistema, nuestro equipo de desarrollo está disponible.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-purple-600 hover:bg-purple-700">
              <Code className="w-5 h-5 mr-2" />
              Soporte Técnico
            </Button>
            <Button size="lg" variant="outline">
              <Download className="w-5 h-5 mr-2" />
              Descargar Scripts
            </Button>
          </div>
        </div>

        {/* Navigation */}
        <div className="mt-8 flex justify-between">
          <Link href="/">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver al Inicio
            </Button>
          </Link>
          <Link href="/warranty-support">
            <Button>
              Garantías y Soporte
              <ArrowLeft className="w-4 h-4 ml-2 rotate-180" />
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}

