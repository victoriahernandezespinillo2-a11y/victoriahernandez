"use client";

import Link from "next/link";
import { Button } from "@repo/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/card";
import { Badge } from "@repo/ui/badge";
import { 
  ArrowLeft,
  Shield,
  Clock,
  Phone,
  Mail,
  MessageCircle,
  CheckCircle,
  Star,
  Users,
  Zap,
  Globe,
  RefreshCw,
  Headphones,
  Award,
  TrendingUp,
  Heart
} from "lucide-react";

export default function WarrantySupport() {
  const warrantyItems = [
    {
      title: "Soporte Técnico Completo",
      duration: "3 meses",
      description: "Asistencia técnica especializada para problemas con funcionalidades implementadas",
      icon: <Headphones className="w-6 h-6 text-blue-600" />,
      includes: [
        "Soporte por email y teléfono",
        "Corrección de bugs en funcionalidades existentes",
        "Resolución de problemas técnicos",
        "Capacitación del personal"
      ]
    },
    {
      title: "Garantía de Funcionalidad",
      duration: "3 meses",
      description: "Garantía de que las funcionalidades implementadas funcionen correctamente",
      icon: <Shield className="w-6 h-6 text-green-600" />,
      includes: [
        "Corrección de bugs sin costo",
        "Reparación de fallas técnicas",
        "Compatibilidad con navegadores",
        "Funcionalidad móvil garantizada"
      ]
    },
    {
      title: "Nuevas Funcionalidades",
      duration: "Costo extra",
      description: "Desarrollo de nuevas características o mejoras adicionales",
      icon: <Zap className="w-6 h-6 text-purple-600" />,
      includes: [
        "Desarrollo personalizado",
        "Integraciones adicionales",
        "Mejoras de funcionalidad",
        "Nuevas características"
      ]
    }
  ];

  const supportChannels = [
    {
      channel: "Email de Soporte",
      icon: <Mail className="w-6 h-6 text-blue-600" />,
      response: "24 horas",
      description: "Para consultas técnicas y problemas no urgentes",
      contact: "soporteglobalmindt@gmail.com",
      availability: "24/7"
    },
    {
      channel: "Teléfono de Emergencia",
      icon: <Phone className="w-6 h-6 text-green-600" />,
      response: "Inmediato",
      description: "Para problemas críticos que afecten el funcionamiento",
      contact: "+34 692 835 646",
      availability: "24/7"
    },
    {
      channel: "Chat en Vivo",
      icon: <MessageCircle className="w-6 h-6 text-purple-600" />,
      response: "15 minutos",
      description: "Asistencia inmediata durante horario comercial",
      contact: "Disponible en el panel de administración",
      availability: "9:00 - 18:00 (L-V)"
    },
    {
      channel: "Soporte Prioritario",
      icon: <Award className="w-6 h-6 text-orange-600" />,
      response: "1 hora",
      description: "Para administradores - respuesta garantizada",
      contact: "Acceso directo al equipo técnico",
      availability: "24/7"
    }
  ];

  const slaMetrics = [
    {
      metric: "Tiempo de Respuesta",
      target: "≤ 1 hora",
      description: "Tiempo máximo para respuesta inicial",
      icon: <Clock className="w-5 h-5 text-blue-600" />
    },
    {
      metric: "Tiempo de Resolución",
      target: "≤ 24 horas",
      description: "Tiempo máximo para resolver problemas críticos",
      icon: <Zap className="w-5 h-5 text-green-600" />
    },
    {
      metric: "Disponibilidad del Sistema",
      target: "99.9%",
      description: "Uptime garantizado del sistema",
      icon: <Globe className="w-5 h-5 text-purple-600" />
    },
    {
      metric: "Tiempo de Recuperación",
      target: "≤ 4 horas",
      description: "Tiempo máximo para restaurar servicio",
      icon: <RefreshCw className="w-5 h-5 text-orange-600" />
    }
  ];

  const updatePolicy = [
    {
      type: "Corrección de Bugs",
      frequency: "Durante garantía (3 meses)",
      description: "Corrección de fallas en funcionalidades implementadas",
      notice: "Sin costo adicional"
    },
    {
      type: "Actualizaciones de Seguridad",
      frequency: "Durante garantía (3 meses)",
      description: "Parches críticos de seguridad",
      notice: "Sin costo adicional"
    },
    {
      type: "Nuevas Funcionalidades",
      frequency: "Bajo solicitud",
      description: "Desarrollo de características adicionales",
      notice: "Costo extra - presupuesto personalizado"
    },
    {
      type: "Mantenimiento Programado",
      frequency: "Durante garantía (3 meses)",
      description: "Mantenimiento del servidor y optimizaciones",
      notice: "Sin costo adicional"
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
                  🛡️ Garantías y Soporte
                </h1>
                <p className="text-gray-600">
                  Información sobre garantías y soporte técnico
                </p>
              </div>
            </div>
            <Badge variant="secondary" className="text-sm bg-orange-100 text-orange-800">
              Soporte
            </Badge>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Introduction */}
        <div className="bg-gradient-to-r from-orange-600 to-red-600 rounded-lg text-white p-8 mb-8">
          <div className="flex items-center mb-4">
            <Shield className="w-8 h-8 mr-3" />
            <h2 className="text-3xl font-bold">Garantía y Soporte Completo</h2>
          </div>
          <p className="text-lg text-orange-100 mb-4">
            Tu tranquilidad es nuestra prioridad. Ofrecemos garantías sólidas y soporte 
            técnico especializado para asegurar el éxito de tu polideportivo.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center text-orange-100">
              <Shield className="w-5 h-5 mr-2" />
              <span>Garantía de 3 meses</span>
            </div>
            <div className="flex items-center text-orange-100">
              <Headphones className="w-5 h-5 mr-2" />
              <span>Soporte 24/7</span>
            </div>
            <div className="flex items-center text-orange-100">
              <Zap className="w-5 h-5 mr-2" />
              <span>Respuesta en 1 hora</span>
            </div>
            <div className="flex items-center text-orange-100">
              <RefreshCw className="w-5 h-5 mr-2" />
              <span>Nuevas funcionalidades (costo extra)</span>
            </div>
          </div>
        </div>

        {/* Warranty Details */}
        <div className="mb-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-6">
            🛡️ Detalles de la Garantía
          </h3>
          <div className="grid md:grid-cols-3 gap-6">
            {warrantyItems.map((item, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center space-x-3 mb-3">
                    {item.icon}
                    <div>
                      <CardTitle className="text-lg text-gray-900">
                        {item.title}
                      </CardTitle>
                      <Badge variant="secondary" className="mt-1">
                        {item.duration}
                      </Badge>
                    </div>
                  </div>
                  <CardDescription>
                    {item.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {item.includes.map((include, includeIndex) => (
                      <li key={includeIndex} className="flex items-center text-sm text-gray-600">
                        <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                        {include}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Support Channels */}
        <div className="mb-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-6">
            📞 Canales de Soporte
          </h3>
          <div className="grid md:grid-cols-2 gap-6">
            {supportChannels.map((channel, index) => (
              <Card key={index} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4">
                    {channel.icon}
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-gray-900">
                          {channel.channel}
                        </h4>
                        <Badge variant="outline" className="text-xs">
                          <Clock className="w-3 h-3 mr-1" />
                          {channel.response}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">
                        {channel.description}
                      </p>
                      <div className="space-y-2">
                        <div className="flex items-center text-sm">
                          <span className="font-medium text-gray-700 w-20">Contacto:</span>
                          <span className="text-gray-900">{channel.contact}</span>
                        </div>
                        <div className="flex items-center text-sm">
                          <span className="font-medium text-gray-700 w-20">Disponible:</span>
                          <span className="text-gray-900">{channel.availability}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* SLA Metrics */}
        <div className="mb-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-6">
            ⏱️ Compromisos de Servicio (SLA)
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {slaMetrics.map((metric, index) => (
              <Card key={index} className="hover:shadow-md transition-shadow text-center">
                <CardContent className="p-6">
                  <div className="flex justify-center mb-4">
                    {metric.icon}
                  </div>
                  <h4 className="font-bold text-lg text-gray-900 mb-2">
                    {metric.target}
                  </h4>
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    {metric.metric}
                  </p>
                  <p className="text-xs text-gray-600">
                    {metric.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* New Features Policy */}
        <div className="mb-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-6">
            ⚡ Nuevas Funcionalidades y Desarrollo
          </h3>
          <Card className="bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Zap className="w-6 h-6 text-purple-600" />
                </div>
                <div className="flex-1">
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">
                    Desarrollo de Nuevas Funcionalidades
                  </h4>
                  <p className="text-gray-600 mb-4">
                    Para solicitar nuevas funcionalidades, mejoras o desarrollos adicionales, 
                    contacta con nuestro equipo de desarrollo para obtener un presupuesto personalizado.
                  </p>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <h5 className="font-medium text-gray-900">¿Qué incluye?</h5>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• Desarrollo personalizado</li>
                        <li>• Integraciones adicionales</li>
                        <li>• Nuevas características</li>
                        <li>• Mejoras de funcionalidad</li>
                      </ul>
                    </div>
                    <div className="space-y-2">
                      <h5 className="font-medium text-gray-900">Proceso</h5>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• Consulta inicial gratuita</li>
                        <li>• Presupuesto detallado</li>
                        <li>• Desarrollo según especificaciones</li>
                        <li>• Pruebas y entrega</li>
                      </ul>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t">
                    <Button 
                      className="bg-purple-600 hover:bg-purple-700"
                      onClick={() => {
                        const subject = encodeURIComponent('Solicitud de Nueva Funcionalidad');
                        const body = encodeURIComponent(`Hola,

Me interesa solicitar una nueva funcionalidad para el sistema de gestión del polideportivo.

Detalles de la solicitud:
- Funcionalidad deseada: 
- Descripción detallada: 
- Justificación del negocio: 
- Fecha de entrega deseada: 

Por favor, envíenme un presupuesto detallado.

Gracias.

Saludos cordiales.`);
                        window.open(`mailto:soporteglobalmindt@gmail.com?subject=${subject}&body=${body}`, '_blank');
                      }}
                    >
                      <Zap className="w-4 h-4 mr-2" />
                      Solicitar Nueva Funcionalidad
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Update Policy */}
        <div className="mb-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-6">
            🔄 Política de Actualizaciones
          </h3>
          <div className="space-y-4">
            {updatePolicy.map((update, index) => (
              <Card key={index} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <RefreshCw className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">
                          {update.type}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {update.description}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className="mb-2">
                        {update.frequency}
                      </Badge>
                      <p className="text-xs text-gray-500">
                        Aviso: {update.notice}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Customer Satisfaction */}
        <div className="mb-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-6">
            ⭐ Compromiso con la Satisfacción
          </h3>
          <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
            <CardContent className="p-8">
              <div className="grid md:grid-cols-3 gap-8 text-center">
                <div>
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Star className="w-8 h-8 text-green-600" />
                  </div>
                  <h4 className="font-bold text-lg text-gray-900 mb-2">
                    Satisfacción Garantizada
                  </h4>
                  <p className="text-sm text-gray-600">
                    Si no estás satisfecho, trabajamos contigo hasta resolverlo
                  </p>
                </div>
                <div>
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Users className="w-8 h-8 text-blue-600" />
                  </div>
                  <h4 className="font-bold text-lg text-gray-900 mb-2">
                    Equipo Especializado
                  </h4>
                  <p className="text-sm text-gray-600">
                    Desarrolladores con experiencia en sistemas deportivos
                  </p>
                </div>
                <div>
                  <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <TrendingUp className="w-8 h-8 text-purple-600" />
                  </div>
                  <h4 className="font-bold text-lg text-gray-900 mb-2">
                    Mejora Continua
                  </h4>
                  <p className="text-sm text-gray-600">
                    Evolucionamos el sistema según tus necesidades
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Contact Support */}
        <div className="mt-12 bg-white rounded-lg shadow-sm border p-8 text-center">
          <Heart className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-gray-900 mb-4">
            ¿Necesitas Ayuda Inmediata?
          </h3>
          <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
            Nuestro equipo de soporte está disponible 24/7 para ayudarte. 
            No dudes en contactarnos para cualquier consulta o problema.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="bg-orange-600 hover:bg-orange-700 transition-all duration-200 hover:shadow-lg"
              onClick={() => window.open('tel:+34692835646', '_self')}
            >
              <Phone className="w-5 h-5 mr-2" />
              Llamar Ahora
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="hover:bg-blue-50 hover:border-blue-300 transition-all duration-200 hover:shadow-lg"
              onClick={() => {
                const subject = encodeURIComponent('Soporte Técnico - Consulta');
                const body = encodeURIComponent(`Hola,

Necesito soporte técnico para el sistema de gestión del polideportivo.

Detalles de la consulta:
- Tipo de problema: 
- Descripción: 
- Fecha y hora: ${new Date().toLocaleString('es-ES')}

Gracias por su ayuda.

Saludos cordiales.`);
                window.open(`mailto:soporteglobalmindt@gmail.com?subject=${subject}&body=${body}`, '_blank');
              }}
            >
              <Mail className="w-5 h-5 mr-2" />
              Enviar Email
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="hover:bg-purple-50 hover:border-purple-300 transition-all duration-200 hover:shadow-lg"
              onClick={() => alert('💬 Chat en Vivo\n\nEl chat en vivo está disponible en el panel de administración del sistema.\n\nAccede a: https://administradorpolideportivo.vercel.app\n\n¡Estamos aquí para ayudarte!')}
            >
              <MessageCircle className="w-5 h-5 mr-2" />
              Chat en Vivo
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
          <Link href="/user-manual">
            <Button>
              Manual de Usuario
              <ArrowLeft className="w-4 h-4 ml-2 rotate-180" />
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}

