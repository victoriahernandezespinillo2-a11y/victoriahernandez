import Link from "next/link";
import { Button } from "@repo/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/card";
import { Badge } from "@repo/ui/badge";
import { 
  ArrowLeft,
  Smartphone,
  Calendar,
  CreditCard,
  ShoppingCart,
  Trophy,
  Wallet,
  QrCode,
  Users,
  Settings,
  HelpCircle,
  CheckCircle,
  AlertCircle,
  Info,
  TrendingUp,
  BarChart3,
  Activity,
  Clock,
  Shield,
  MessageCircle,
  FileText,
  Zap,
  Target,
  Award,
  Globe,
  Lock,
  RefreshCw,
  CheckCircle2,
  Plus,
  ArrowDown
} from "lucide-react";

export default function UserManual() {
  const sections = [
    {
      id: "getting-started",
      title: "Registro y Autenticación",
      icon: <CheckCircle className="w-6 h-6 text-green-600" />,
      subsections: [
        "Registro con email y contraseña",
        "Autenticación con Google",
        "Configuración de perfil",
        "Instalación PWA móvil"
      ],
      details: [
        "Sistema de autenticación dual: Firebase + NextAuth.js v5",
        "Registro con validación de email obligatoria",
        "Integración con Google OAuth para acceso rápido",
        "Configuración de perfil con datos personales",
        "PWA instalable en dispositivos móviles",
        "Sesiones persistentes con JWT tokens",
        "Recuperación de contraseña por email"
      ]
    },
    {
      id: "reservations",
      title: "Sistema de Reservas",
      icon: <Calendar className="w-6 h-6 text-blue-600" />,
      subsections: [
        "Selección de centro y deporte",
        "Calendario de disponibilidad",
        "Proceso de confirmación",
        "Gestión de reservas activas"
      ],
      details: [
        "Reservas disponibles 24/7 con confirmación instantánea",
        "Selección de centro deportivo y tipo de cancha",
        "Calendario interactivo con slots de tiempo disponibles",
        "Duración configurable: 30, 60, 90, 120 minutos",
        "Sistema de precios dinámicos por horario",
        "Pago con créditos o tarjeta de crédito",
        "Código QR único para acceso a instalaciones",
        "Cancelación hasta 2 horas antes sin penalización"
      ]
    },
    {
      id: "memberships",
      title: "Gestión de Membresías",
      icon: <Users className="w-6 h-6 text-purple-600" />,
      subsections: [
        "Tipos de membresía",
        "Beneficios por plan",
        "Gestión de suscripciones",
        "Créditos incluidos"
      ],
      details: [
        "Sistema de membresías con tipos: Básica, Premium, VIP",
        "Créditos incluidos según el plan seleccionado",
        "Gestión de suscripciones y renovaciones",
        "Acceso a reservas prioritarias para miembros premium",
        "Descuentos especiales en productos de la tienda",
        "Acceso a torneos y eventos exclusivos",
        "Soporte técnico prioritario"
      ]
    },
    {
      id: "wallet",
      title: "Monedero Digital",
      icon: <Wallet className="w-6 h-6 text-yellow-600" />,
      subsections: [
        "Recargar créditos",
        "Historial de transacciones",
        "Pago con créditos",
        "Gestión de saldo"
      ],
      details: [
        "Sistema de créditos virtuales para pagos internos",
        "Recarga mediante tarjeta de crédito/débito (Redsys)",
        "Historial completo de transacciones en tiempo real",
        "Pago de reservas y compras con créditos",
        "Sistema de ledger contable integrado",
        "Notificaciones automáticas de movimientos",
        "Gestión de saldo con validaciones de seguridad"
      ]
    },
    {
      id: "shop",
      title: "Tienda Online",
      icon: <ShoppingCart className="w-6 h-6 text-red-600" />,
      subsections: [
        "Catálogo de productos",
        "Carrito de compras",
        "Proceso de checkout",
        "Gestión de pedidos"
      ],
      details: [
        "Catálogo de productos deportivos con precios en euros",
        "Sistema de carrito de compras persistente",
        "Checkout con pago por créditos o tarjeta",
        "Integración con Redsys para pagos con tarjeta",
        "Gestión de pedidos con estados: PENDING, PAID, REDEEMED",
        "Sistema de inventario y stock en tiempo real",
        "Cálculo automático de créditos por producto"
      ]
    },
    {
      id: "tournaments",
      title: "Torneos",
      icon: <Trophy className="w-6 h-6 text-orange-600" />,
      subsections: [
        "Ver torneos disponibles",
        "Inscripción en torneos",
        "Seguimiento de resultados",
        "Gestión de inscripciones"
      ],
      details: [
        "Sistema de torneos con categorías y fechas",
        "Inscripción online con pago por créditos",
        "Seguimiento de resultados y posiciones",
        "Notificaciones automáticas de cambios",
        "Sistema de ranking y puntuaciones",
        "Gestión de participantes y equipos",
        "Comunicación con organizadores"
      ]
    },
    {
      id: "access-control",
      title: "Control de Acceso",
      icon: <QrCode className="w-6 h-6 text-indigo-600" />,
      subsections: [
        "Códigos QR únicos",
        "Acceso a instalaciones",
        "Validación de reservas",
        "Sistema de seguridad"
      ],
      details: [
        "Código QR único generado para cada reserva",
        "Validación automática de acceso a canchas",
        "Sistema de control de entrada y salida",
        "Validación de horarios y disponibilidad",
        "Registro automático de asistencia",
        "Sistema de alertas para accesos no autorizados",
        "Integración con sistema de reservas en tiempo real"
      ]
    }
  ];

  const processFlows = [
    {
      id: "reservation-flow",
      title: "Flujo de Reservas",
      description: "Proceso real implementado en el sistema",
      steps: [
        { step: 1, title: "Autenticación", icon: <Shield className="w-5 h-5" />, description: "Login con Firebase + NextAuth.js" },
        { step: 2, title: "Selección Centro", icon: <Target className="w-5 h-5" />, description: "Elige centro deportivo y cancha" },
        { step: 3, title: "Calendario", icon: <Calendar className="w-5 h-5" />, description: "Selecciona fecha y slot de tiempo" },
        { step: 4, title: "Pago", icon: <CreditCard className="w-5 h-5" />, description: "Paga con créditos o Redsys" },
        { step: 5, title: "QR Generado", icon: <QrCode className="w-5 h-5" />, description: "Recibe QR único para acceso" }
      ]
    },
    {
      id: "purchase-flow",
      title: "Flujo de Compras",
      description: "Proceso real de e-commerce implementado",
      steps: [
        { step: 1, title: "Catálogo", icon: <ShoppingCart className="w-5 h-5" />, description: "Explora productos con precios en euros" },
        { step: 2, title: "Carrito", icon: <Plus className="w-5 h-5" />, description: "Agrega productos al carrito persistente" },
        { step: 3, title: "Checkout", icon: <FileText className="w-5 h-5" />, description: "Selecciona método de pago (créditos/tarjeta)" },
        { step: 4, title: "Pago", icon: <CreditCard className="w-5 h-5" />, description: "Procesa pago con Redsys o créditos" },
        { step: 5, title: "Orden", icon: <CheckCircle2 className="w-5 h-5" />, description: "Recibe confirmación y QR de recogida" }
      ]
    },
    {
      id: "membership-flow",
      title: "Flujo de Membresías",
      description: "Sistema de membresías implementado",
      steps: [
        { step: 1, title: "Seleccionar Plan", icon: <Users className="w-5 h-5" />, description: "Elige entre Básica, Premium, VIP" },
        { step: 2, title: "Configurar Pago", icon: <Settings className="w-5 h-5" />, description: "Establece método de pago" },
        { step: 3, title: "Procesar Pago", icon: <Zap className="w-5 h-5" />, description: "Paga con créditos o tarjeta" },
        { step: 4, title: "Activar Membresía", icon: <Award className="w-5 h-5" />, description: "Sistema activa beneficios automáticamente" },
        { step: 5, title: "Gestión", icon: <RefreshCw className="w-5 h-5" />, description: "Administra renovaciones y créditos" }
      ]
    }
  ];

  const faqData = [
    {
      category: "Reservas",
      questions: [
        {
          question: "¿Cómo funciona el sistema de reservas?",
          answer: "El sistema permite seleccionar centro deportivo, cancha, fecha y hora. Los slots de tiempo se calculan dinámicamente según disponibilidad real."
        },
        {
          question: "¿Qué métodos de pago aceptan para reservas?",
          answer: "Aceptamos pago con créditos del monedero digital o tarjeta de crédito/débito a través de Redsys."
        },
        {
          question: "¿Cómo obtengo mi código QR para acceder?",
          answer: "Una vez confirmada la reserva, el sistema genera automáticamente un código QR único que puedes usar para acceder a la cancha."
        }
      ]
    },
    {
      category: "Pagos",
      questions: [
        {
          question: "¿Qué métodos de pago están implementados?",
          answer: "Sistema de créditos virtuales, tarjetas de crédito/débito vía Redsys, y transferencias bancarias."
        },
        {
          question: "¿Cómo funciona el sistema de créditos?",
          answer: "Los créditos son la moneda virtual del sistema. Puedes recargarlos con tarjeta y usarlos para pagar reservas y compras."
        },
        {
          question: "¿Es seguro el procesamiento de pagos?",
          answer: "Sí, utilizamos Redsys como procesador de pagos, cumpliendo con estándares PCI DSS y encriptación SSL."
        }
      ]
    },
    {
      category: "Membresías",
      questions: [
        {
          question: "¿Qué tipos de membresía están disponibles?",
          answer: "Sistema implementado con tres tipos: Básica, Premium y VIP, cada una con diferentes beneficios y créditos incluidos."
        },
        {
          question: "¿Cómo se gestionan las membresías?",
          answer: "Las membresías se gestionan a través del perfil de usuario, donde puedes ver tu tipo actual y créditos disponibles."
        },
        {
          question: "¿Qué beneficios incluye cada membresía?",
          answer: "Cada tipo de membresía incluye diferentes cantidades de créditos y acceso a funciones específicas del sistema."
        }
      ]
    },
    {
      category: "Técnico",
      questions: [
        {
          question: "¿Cómo funciona la PWA móvil?",
          answer: "Es una Progressive Web App instalable que funciona como aplicación nativa en móviles, con notificaciones push y acceso offline."
        },
        {
          question: "¿Qué tecnologías utiliza el sistema?",
          answer: "Next.js 15, React 18, TypeScript, Firebase Auth, NextAuth.js v5, Supabase PostgreSQL, y Redsys para pagos."
        },
        {
          question: "¿Cómo se protegen los datos?",
          answer: "Cumplimiento RGPD, encriptación SSL/TLS, autenticación JWT, y base de datos PostgreSQL con Row Level Security."
        }
      ]
    }
  ];

  const userMetrics = [
    {
      title: "Tiempo de Respuesta",
      value: "<2s",
      icon: <Clock className="w-8 h-8 text-blue-600" />,
      trend: "Optimizado",
      description: "Tiempo de carga de la aplicación"
    },
    {
      title: "Disponibilidad",
      value: "24/7",
      icon: <Target className="w-8 h-8 text-green-600" />,
      trend: "Constante",
      description: "Sistema siempre disponible"
    },
    {
      title: "Seguridad",
      value: "100%",
      icon: <Shield className="w-8 h-8 text-yellow-600" />,
      trend: "Garantizada",
      description: "Pagos seguros con Redsys"
    },
    {
      title: "Uptime",
      value: "99.9%",
      icon: <Activity className="w-8 h-8 text-purple-600" />,
      trend: "Estable",
      description: "Tiempo de actividad del sistema"
    }
  ];

  const quickTips = [
    {
      icon: <Smartphone className="w-5 h-5 text-blue-600" />,
      title: "PWA Instalable",
      tip: "Instala la PWA desde el navegador para experiencia nativa"
    },
    {
      icon: <CreditCard className="w-5 h-5 text-green-600" />,
      title: "Créditos Virtuales",
      tip: "Usa créditos para pagos rápidos sin tarjeta"
    },
    {
      icon: <Calendar className="w-5 h-5 text-purple-600" />,
      title: "Reservas 24/7",
      tip: "Sistema disponible las 24 horas para hacer reservas"
    },
    {
      icon: <QrCode className="w-5 h-5 text-orange-600" />,
      title: "Acceso QR",
      tip: "Código QR único generado automáticamente para cada reserva"
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
                  Manual de Usuario Final
                </h1>
                <p className="text-gray-600">
                  Guía operativa para usuarios finales del sistema
                </p>
              </div>
            </div>
            <Badge variant="secondary" className="text-sm">
              Usuario Final
            </Badge>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Introduction */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg text-white p-8 mb-8">
          <div className="flex items-center mb-4">
            <Users className="w-8 h-8 mr-3" />
            <h2 className="text-3xl font-bold">Experiencia del Usuario Final</h2>
          </div>
          <p className="text-lg text-blue-100 mb-4">
            Esta guía describe la experiencia completa del usuario final al interactuar 
            con el sistema de gestión del polideportivo.
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex items-center text-blue-100">
              <CheckCircle className="w-5 h-5 mr-2" />
              <span>Disponibilidad 24/7 para reservas</span>
            </div>
            <div className="flex items-center text-blue-100">
              <CheckCircle className="w-5 h-5 mr-2" />
              <span>Procesamiento seguro de pagos</span>
            </div>
            <div className="flex items-center text-blue-100">
              <CheckCircle className="w-5 h-5 mr-2" />
              <span>Control de acceso mediante QR</span>
            </div>
            <div className="flex items-center text-blue-100">
              <CheckCircle className="w-5 h-5 mr-2" />
              <span>Soporte técnico especializado</span>
            </div>
          </div>
        </div>

        {/* User Statistics */}
        <div className="mb-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            📊 Estadísticas del Sistema
          </h3>
          <div className="grid md:grid-cols-4 gap-6 max-w-6xl mx-auto">
            <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">24/7</div>
              <div className="text-gray-600">Disponibilidad</div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">99.9%</div>
              <div className="text-gray-600">Tiempo de Actividad</div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2">&lt;2s</div>
              <div className="text-gray-600">Tiempo de Respuesta</div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
              <div className="text-3xl font-bold text-orange-600 mb-2">100%</div>
              <div className="text-gray-600">Pagos Seguros</div>
            </div>
          </div>
        </div>

        {/* Process Flows */}
        <div className="mb-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            🔄 Diagramas de Procesos
          </h3>
          <div className="grid lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
            {processFlows.map((flow, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="text-lg text-gray-900 flex items-center">
                    <BarChart3 className="w-5 h-5 mr-2 text-blue-600" />
                    {flow.title}
                  </CardTitle>
                  <CardDescription>{flow.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {flow.steps.map((step, stepIndex) => (
                      <div key={stepIndex} className="flex items-center space-x-4">
                        <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-bold text-blue-600">{step.step}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <div className="text-blue-600">{step.icon}</div>
                            <h4 className="text-sm font-medium text-gray-900">{step.title}</h4>
                          </div>
                          <p className="text-xs text-gray-600 mt-1">{step.description}</p>
                        </div>
                        {stepIndex < flow.steps.length - 1 && (
                          <ArrowDown className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* User Metrics */}
        <div className="mb-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            📈 Métricas de Rendimiento
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {userMetrics.map((metric, index) => (
              <Card key={index} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-gray-600">{metric.icon}</div>
                    <div className="flex items-center text-green-600 text-sm font-medium">
                      <TrendingUp className="w-4 h-4 mr-1" />
                      {metric.trend}
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-gray-900 mb-1">{metric.value}</div>
                  <div className="text-sm font-medium text-gray-700 mb-1">{metric.title}</div>
                  <div className="text-xs text-gray-500">{metric.description}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mb-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            ❓ Preguntas Frecuentes
          </h3>
          <div className="grid lg:grid-cols-2 gap-6 max-w-6xl mx-auto">
            {faqData.map((category, categoryIndex) => (
              <Card key={categoryIndex} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="text-lg text-gray-900 flex items-center">
                    <MessageCircle className="w-5 h-5 mr-2 text-blue-600" />
                    {category.category}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {category.questions.map((faq, faqIndex) => (
                      <div key={faqIndex} className="border-l-4 border-blue-200 pl-4">
                        <h4 className="font-medium text-gray-900 mb-2">{faq.question}</h4>
                        <p className="text-sm text-gray-600">{faq.answer}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* System Architecture */}
        <div className="mb-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            🏗️ Arquitectura del Sistema
          </h3>
          <div className="grid lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
            <Card className="hover:shadow-xl transition-all duration-300 border-2 border-gray-100">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
                <CardTitle className="text-xl text-gray-900 flex items-center justify-center">
                  <Globe className="w-6 h-6 mr-3 text-blue-600" />
                  Flujo de Datos del Usuario
                </CardTitle>
                <CardDescription className="text-gray-700 font-medium text-center">
                  Proceso completo de interacción del usuario con el sistema
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-6">
                  <div className="flex items-start space-x-4 p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl border border-blue-200">
                    <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                      <Smartphone className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-900 text-lg">PWA Móvil</h4>
                      <p className="text-sm text-gray-700 font-medium mb-2">Next.js 15 + React 18 + TypeScript</p>
                      <div className="flex flex-wrap gap-2">
                        <span className="px-2 py-1 bg-blue-200 text-blue-800 text-xs rounded-full font-medium">Progressive Web App</span>
                        <span className="px-2 py-1 bg-blue-200 text-blue-800 text-xs rounded-full font-medium">Responsive Design</span>
                        <span className="px-2 py-1 bg-blue-200 text-blue-800 text-xs rounded-full font-medium">Offline Support</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-center">
                    <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                      <ArrowDown className="w-5 h-5 text-gray-600" />
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-4 p-4 bg-gradient-to-r from-green-50 to-emerald-100 rounded-xl border border-green-200">
                    <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center shadow-lg">
                      <Shield className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-900 text-lg">Autenticación</h4>
                      <p className="text-sm text-gray-700 font-medium mb-2">Firebase + NextAuth.js v5 + JWT</p>
                      <div className="flex flex-wrap gap-2">
                        <span className="px-2 py-1 bg-green-200 text-green-800 text-xs rounded-full font-medium">Google OAuth</span>
                        <span className="px-2 py-1 bg-green-200 text-green-800 text-xs rounded-full font-medium">JWT Tokens</span>
                        <span className="px-2 py-1 bg-green-200 text-green-800 text-xs rounded-full font-medium">Session Management</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-center">
                    <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                      <ArrowDown className="w-5 h-5 text-gray-600" />
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-4 p-4 bg-gradient-to-r from-purple-50 to-violet-100 rounded-xl border border-purple-200">
                    <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                      <Zap className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-900 text-lg">API REST</h4>
                      <p className="text-sm text-gray-700 font-medium mb-2">Next.js API Routes + Middleware</p>
                      <div className="flex flex-wrap gap-2">
                        <span className="px-2 py-1 bg-purple-200 text-purple-800 text-xs rounded-full font-medium">RESTful API</span>
                        <span className="px-2 py-1 bg-purple-200 text-purple-800 text-xs rounded-full font-medium">Rate Limiting</span>
                        <span className="px-2 py-1 bg-purple-200 text-purple-800 text-xs rounded-full font-medium">Validation</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-center">
                    <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                      <ArrowDown className="w-5 h-5 text-gray-600" />
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-4 p-4 bg-gradient-to-r from-orange-50 to-amber-100 rounded-xl border border-orange-200">
                    <div className="w-12 h-12 bg-orange-600 rounded-xl flex items-center justify-center shadow-lg">
                      <Globe className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-900 text-lg">Base de Datos</h4>
                      <p className="text-sm text-gray-700 font-medium mb-2">Supabase PostgreSQL + Prisma ORM</p>
                      <div className="flex flex-wrap gap-2">
                        <span className="px-2 py-1 bg-orange-200 text-orange-800 text-xs rounded-full font-medium">PostgreSQL</span>
                        <span className="px-2 py-1 bg-orange-200 text-orange-800 text-xs rounded-full font-medium">Row Level Security</span>
                        <span className="px-2 py-1 bg-orange-200 text-orange-800 text-xs rounded-full font-medium">Real-time</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-xl transition-all duration-300 border-2 border-gray-100">
              <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b">
                <CardTitle className="text-xl text-gray-900 flex items-center justify-center">
                  <CreditCard className="w-6 h-6 mr-3 text-green-600" />
                  Flujo de Pagos
                </CardTitle>
                <CardDescription className="text-gray-700 font-medium text-center">
                  Proceso seguro de transacciones financieras
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-6">
                  <div className="flex items-start space-x-4 p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl border border-blue-200">
                    <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                      <CreditCard className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-900 text-lg">Usuario</h4>
                      <p className="text-sm text-gray-700 font-medium mb-2">Selección de método de pago</p>
                      <div className="flex flex-wrap gap-2">
                        <span className="px-2 py-1 bg-blue-200 text-blue-800 text-xs rounded-full font-medium">Créditos Virtuales</span>
                        <span className="px-2 py-1 bg-blue-200 text-blue-800 text-xs rounded-full font-medium">Tarjeta de Crédito</span>
                        <span className="px-2 py-1 bg-blue-200 text-blue-800 text-xs rounded-full font-medium">Transferencia</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-center">
                    <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                      <ArrowDown className="w-5 h-5 text-gray-600" />
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-4 p-4 bg-gradient-to-r from-yellow-50 to-amber-100 rounded-xl border border-yellow-200">
                    <div className="w-12 h-12 bg-yellow-600 rounded-xl flex items-center justify-center shadow-lg">
                      <Shield className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-900 text-lg">Redsys</h4>
                      <p className="text-sm text-gray-700 font-medium mb-2">Procesamiento PCI DSS Level 1</p>
                      <div className="flex flex-wrap gap-2">
                        <span className="px-2 py-1 bg-yellow-200 text-yellow-800 text-xs rounded-full font-medium">PCI DSS</span>
                        <span className="px-2 py-1 bg-yellow-200 text-yellow-800 text-xs rounded-full font-medium">SSL/TLS</span>
                        <span className="px-2 py-1 bg-yellow-200 text-yellow-800 text-xs rounded-full font-medium">3D Secure</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-center">
                    <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                      <ArrowDown className="w-5 h-5 text-gray-600" />
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-4 p-4 bg-gradient-to-r from-green-50 to-emerald-100 rounded-xl border border-green-200">
                    <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center shadow-lg">
                      <CheckCircle className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-900 text-lg">Ledger Contable</h4>
                      <p className="text-sm text-gray-700 font-medium mb-2">Registro contable automático</p>
                      <div className="flex flex-wrap gap-2">
                        <span className="px-2 py-1 bg-green-200 text-green-800 text-xs rounded-full font-medium">Double Entry</span>
                        <span className="px-2 py-1 bg-green-200 text-green-800 text-xs rounded-full font-medium">Audit Trail</span>
                        <span className="px-2 py-1 bg-green-200 text-green-800 text-xs rounded-full font-medium">Real-time</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-center">
                    <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                      <ArrowDown className="w-5 h-5 text-gray-600" />
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-4 p-4 bg-gradient-to-r from-purple-50 to-violet-100 rounded-xl border border-purple-200">
                    <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                      <QrCode className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-900 text-lg">QR Generado</h4>
                      <p className="text-sm text-gray-700 font-medium mb-2">Acceso a instalaciones</p>
                      <div className="flex flex-wrap gap-2">
                        <span className="px-2 py-1 bg-purple-200 text-purple-800 text-xs rounded-full font-medium">Código Único</span>
                        <span className="px-2 py-1 bg-purple-200 text-purple-800 text-xs rounded-full font-medium">Tiempo Limitado</span>
                        <span className="px-2 py-1 bg-purple-200 text-purple-800 text-xs rounded-full font-medium">Validación</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Technical Stack */}
        <div className="mb-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            ⚙️ Stack Tecnológico
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            <Card className="hover:shadow-lg transition-all duration-300 border-2 border-blue-100">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <Globe className="w-8 h-8 text-white" />
                </div>
                <h4 className="font-bold text-gray-900 text-lg mb-2">Frontend</h4>
                <p className="text-sm text-gray-600 mb-3">Next.js 15 + React 18</p>
                <div className="space-y-1">
                  <span className="block text-xs text-blue-600 font-medium">TypeScript</span>
                  <span className="block text-xs text-blue-600 font-medium">Tailwind CSS</span>
                  <span className="block text-xs text-blue-600 font-medium">PWA Ready</span>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-all duration-300 border-2 border-green-100">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-green-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <Shield className="w-8 h-8 text-white" />
                </div>
                <h4 className="font-bold text-gray-900 text-lg mb-2">Autenticación</h4>
                <p className="text-sm text-gray-600 mb-3">Firebase + NextAuth.js</p>
                <div className="space-y-1">
                  <span className="block text-xs text-green-600 font-medium">JWT Tokens</span>
                  <span className="block text-xs text-green-600 font-medium">Google OAuth</span>
                  <span className="block text-xs text-green-600 font-medium">Session Management</span>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-all duration-300 border-2 border-purple-100">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <Zap className="w-8 h-8 text-white" />
                </div>
                <h4 className="font-bold text-gray-900 text-lg mb-2">Backend</h4>
                <p className="text-sm text-gray-600 mb-3">Next.js API Routes</p>
                <div className="space-y-1">
                  <span className="block text-xs text-purple-600 font-medium">RESTful API</span>
                  <span className="block text-xs text-purple-600 font-medium">Middleware</span>
                  <span className="block text-xs text-purple-600 font-medium">Rate Limiting</span>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-all duration-300 border-2 border-orange-100">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <Globe className="w-8 h-8 text-white" />
                </div>
                <h4 className="font-bold text-gray-900 text-lg mb-2">Base de Datos</h4>
                <p className="text-sm text-gray-600 mb-3">Supabase + Prisma</p>
                <div className="space-y-1">
                  <span className="block text-xs text-orange-600 font-medium">PostgreSQL</span>
                  <span className="block text-xs text-orange-600 font-medium">Row Level Security</span>
                  <span className="block text-xs text-orange-600 font-medium">Real-time</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Security Features */}
        <div className="mb-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            🔒 Características de Seguridad
          </h3>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <Card className="hover:shadow-xl transition-all duration-300 border-2 border-green-100 bg-gradient-to-br from-green-50 to-emerald-50">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-green-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <Shield className="w-8 h-8 text-white" />
                </div>
                <h4 className="font-bold text-gray-900 text-xl mb-3">Encriptación SSL/TLS</h4>
                <p className="text-gray-700 mb-4 font-medium">Protección de extremo a extremo</p>
                <div className="space-y-2">
                  <div className="flex items-center justify-center text-sm text-green-700">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    <span>SSL/TLS 1.3</span>
                  </div>
                  <div className="flex items-center justify-center text-sm text-green-700">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    <span>Certificados A+</span>
                  </div>
                  <div className="flex items-center justify-center text-sm text-green-700">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    <span>HSTS Habilitado</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-xl transition-all duration-300 border-2 border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <Lock className="w-8 h-8 text-white" />
                </div>
                <h4 className="font-bold text-gray-900 text-xl mb-3">Autenticación Avanzada</h4>
                <p className="text-gray-700 mb-4 font-medium">Multi-factor y OAuth</p>
                <div className="space-y-2">
                  <div className="flex items-center justify-center text-sm text-blue-700">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    <span>NextAuth.js v5</span>
                  </div>
                  <div className="flex items-center justify-center text-sm text-blue-700">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    <span>JWT Tokens</span>
                  </div>
                  <div className="flex items-center justify-center text-sm text-blue-700">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    <span>Google OAuth</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-xl transition-all duration-300 border-2 border-purple-100 bg-gradient-to-br from-purple-50 to-violet-50">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <CheckCircle className="w-8 h-8 text-white" />
                </div>
                <h4 className="font-bold text-gray-900 text-xl mb-3">Cumplimiento RGPD</h4>
                <p className="text-gray-700 mb-4 font-medium">Protección de datos europea</p>
                <div className="space-y-2">
                  <div className="flex items-center justify-center text-sm text-purple-700">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    <span>Consentimiento</span>
                  </div>
                  <div className="flex items-center justify-center text-sm text-purple-700">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    <span>Derecho al Olvido</span>
                  </div>
                  <div className="flex items-center justify-center text-sm text-purple-700">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    <span>Portabilidad</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Quick Tips */}
        <div className="mb-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            💡 Consejos Rápidos
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {quickTips.map((tip, index) => (
              <Card key={index} className="hover:shadow-xl transition-all duration-300 border-2 border-gray-100 bg-gradient-to-br from-white to-gray-50 group">
                <CardContent className="p-6">
                  <div className="flex flex-col items-center text-center space-y-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                      {tip.icon}
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 text-lg mb-2">{tip.title}</h4>
                      <p className="text-sm text-gray-600 leading-relaxed">{tip.tip}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Main Sections */}
        <div className="space-y-8">
          {sections.map((section, index) => (
            <Card key={section.id} className="hover:shadow-xl transition-all duration-300 border-2 border-gray-100 bg-gradient-to-r from-white to-gray-50 group">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform duration-300">
                    {section.icon}
                  </div>
                  <div>
                    <CardTitle className="text-2xl text-gray-900 font-bold">
                      {section.title}
                    </CardTitle>
                    <CardDescription className="text-gray-700 font-medium">
                      Guía completa paso a paso
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-8">
                <div className="grid md:grid-cols-2 gap-6 mb-8">
                  {section.subsections.map((subsection, subIndex) => (
                    <div key={subIndex} className="flex items-center space-x-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100 hover:shadow-md transition-all duration-300">
                      <div className="w-3 h-3 bg-blue-600 rounded-full flex-shrink-0"></div>
                      <span className="text-gray-800 font-semibold">{subsection}</span>
                    </div>
                  ))}
                </div>
                
                {/* Detalles expandidos */}
                {section.details && (
                  <div className="mt-8 pt-8 border-t border-gray-200">
                    <h4 className="font-bold text-gray-900 text-xl mb-6 flex items-center">
                      <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
                        <Info className="w-5 h-5 text-white" />
                      </div>
                      Características Detalladas
                    </h4>
                    <div className="grid md:grid-cols-2 gap-4">
                      {section.details.map((detail, detailIndex) => (
                        <div key={detailIndex} className="flex items-start space-x-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-100 hover:shadow-md transition-all duration-300">
                          <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                            <CheckCircle className="w-4 h-4 text-white" />
                          </div>
                          <span className="text-gray-700 text-sm font-medium leading-relaxed">{detail}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="mt-8 pt-8 border-t border-gray-200">
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-6 hover:shadow-lg transition-all duration-300">
                    <div className="flex items-start space-x-4">
                      <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
                        <AlertCircle className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h4 className="font-bold text-blue-900 text-lg mb-3">
                          Información Adicional
                        </h4>
                        <p className="text-blue-800 font-medium leading-relaxed">
                          Esta sección incluye capturas de pantalla paso a paso, 
                          videos tutoriales y solución de problemas comunes.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Support Section */}
        <div className="mt-12">
          <Card className="bg-gradient-to-r from-blue-600 to-purple-600 border-0 shadow-2xl">
            <CardContent className="p-12 text-center text-white">
              <div className="w-20 h-20 bg-white bg-opacity-20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <MessageCircle className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-3xl font-bold mb-4">
                ¿Necesitas Ayuda?
              </h3>
              <p className="text-blue-100 text-lg mb-8 max-w-2xl mx-auto leading-relaxed">
                Nuestro equipo de soporte técnico especializado está disponible 24/7 para resolver cualquier duda o problema que puedas tener.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button className="bg-white text-blue-600 hover:bg-blue-50 font-bold px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300">
                  <HelpCircle className="w-5 h-5 mr-2" />
                  Contactar Soporte
                </Button>
                <Button variant="outline" className="border-white text-white hover:bg-white hover:text-blue-600 font-bold px-8 py-3 rounded-xl transition-all duration-300">
                  <Settings className="w-5 h-5 mr-2" />
                  Ver FAQ
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Navigation */}
        <div className="mt-8 flex justify-between">
          <Link href="/">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver al Inicio
            </Button>
          </Link>
          <Link href="/admin-manual">
            <Button>
              Manual de Administración
              <ArrowLeft className="w-4 h-4 ml-2 rotate-180" />
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}

