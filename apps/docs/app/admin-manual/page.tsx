"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@repo/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/card";
import { Badge } from "@repo/ui/badge";
import { 
  ArrowLeft,
  Settings,
  Users,
  Calendar,
  CreditCard,
  BarChart3,
  Shield,
  Wrench,
  Bell,
  FileText,
  AlertTriangle,
  CheckCircle,
  Info,
  TrendingUp,
  DollarSign,
  Clock,
  Globe,
  Trophy,
  ChevronDown,
  ChevronUp
} from "lucide-react";

export default function AdminManual() {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [completedTasks, setCompletedTasks] = useState<Set<number>>(new Set());

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  const toggleTaskCompletion = (taskIndex: number) => {
    setCompletedTasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskIndex)) {
        newSet.delete(taskIndex);
      } else {
        newSet.add(taskIndex);
      }
      return newSet;
    });
  };

  const showGuideMessage = (sectionTitle: string) => {
    alert(`📖 Guía Detallada: ${sectionTitle}\n\nEsta guía contiene información completa sobre:\n• Procesos paso a paso\n• Tareas diarias recomendadas\n• Mejores prácticas\n• Alertas importantes\n\n¡Explora todos los detalles expandiendo la sección!`);
  };

  const mainSections = [
    {
      id: "dashboard",
      title: "Panel de Control Principal",
      icon: <BarChart3 className="w-6 h-6 text-blue-600" />,
      description: "Vista general del negocio y métricas clave",
      features: [
        "Resumen de ingresos y reservas",
        "Estadísticas de ocupación",
        "Alertas y notificaciones",
        "Acceso rápido a funciones principales"
      ],
      priority: "high",
      detailedGuide: {
        overview: "El Dashboard principal proporciona una vista consolidada de todas las métricas importantes del negocio en tiempo real.",
        keyMetrics: [
          "Ingresos totales del mes actual",
          "Número de reservas activas",
          "Usuarios registrados",
          "Ocupación promedio de canchas",
          "Pagos pendientes de confirmación",
          "Alertas de mantenimiento"
        ],
        quickActions: [
          "Crear nueva reserva manualmente",
          "Gestionar torneos activos",
          "Agregar nuevo usuario",
          "Administrar canchas",
          "Ver reportes detallados"
        ],
        dailyTasks: [
          "Revisar métricas del día anterior",
          "Confirmar reservas del día actual",
          "Verificar pagos pendientes",
          "Revisar alertas del sistema"
        ]
      }
    },
    {
      id: "courts-management",
      title: "Gestión de Canchas",
      icon: <Calendar className="w-6 h-6 text-green-600" />,
      description: "Administrar canchas, horarios y disponibilidad",
      features: [
        "Crear y editar canchas",
        "Configurar horarios de funcionamiento",
        "Gestionar mantenimiento",
        "Control de disponibilidad"
      ],
      priority: "high",
      detailedGuide: {
        overview: "Sistema completo para administrar todas las canchas deportivas, sus horarios, precios y estado de mantenimiento.",
        keyFeatures: [
          "Creación de nuevas canchas con especificaciones detalladas",
          "Configuración de horarios de funcionamiento por día de la semana",
          "Gestión de precios dinámicos según horario y temporada",
          "Control de disponibilidad en tiempo real",
          "Programación de mantenimiento preventivo y correctivo",
          "Asignación de canchas a centros deportivos específicos"
        ],
        stepByStep: [
          {
            step: 1,
            title: "Crear Nueva Cancha",
            description: "Acceder a Gestión > Canchas > Nueva Cancha",
            details: [
              "Seleccionar centro deportivo",
              "Definir tipo de deporte (fútbol, baloncesto, tenis, etc.)",
              "Configurar dimensiones y características",
              "Establecer capacidad máxima de jugadores",
              "Definir equipamiento incluido"
            ]
          },
          {
            step: 2,
            title: "Configurar Horarios",
            description: "Establecer disponibilidad por día y hora",
            details: [
              "Seleccionar días de la semana activos",
              "Definir horario de apertura y cierre",
              "Configurar duración de slots (30, 60, 90, 120 min)",
              "Establecer precios por horario",
              "Configurar descuentos para miembros"
            ]
          },
          {
            step: 3,
            title: "Gestionar Mantenimiento",
            description: "Programar y controlar tareas de mantenimiento",
            details: [
              "Crear tareas de mantenimiento programado",
              "Asignar técnicos responsables",
              "Establecer fechas de inicio y fin",
              "Marcar tareas como completadas",
              "Generar reportes de mantenimiento"
            ]
          }
        ],
        bestPractices: [
          "Revisar disponibilidad diariamente",
          "Programar mantenimiento en horarios de baja demanda",
          "Actualizar precios según temporada",
          "Mantener registro de incidencias",
          "Coordinar con equipos de limpieza"
        ]
      }
    },
    {
      id: "reservations",
      title: "Gestión de Reservas",
      icon: <Users className="w-6 h-6 text-purple-600" />,
      description: "Controlar todas las reservas del sistema",
      features: [
        "Ver todas las reservas",
        "Confirmar y cancelar reservas",
        "Gestionar pagos pendientes",
        "Control de acceso (check-in/check-out)"
      ],
      priority: "high",
      detailedGuide: {
        overview: "Sistema centralizado para gestionar todas las reservas del polideportivo, incluyendo confirmaciones, cancelaciones y control de acceso.",
        keyFeatures: [
          "Vista consolidada de todas las reservas activas y pendientes",
          "Filtros avanzados por fecha, estado, usuario y cancha",
          "Gestión de pagos pendientes y confirmaciones",
          "Control de check-in y check-out de usuarios",
          "Sistema de notificaciones automáticas",
          "Generación de códigos QR únicos para acceso"
        ],
        stepByStep: [
          {
            step: 1,
            title: "Revisar Reservas del Día",
            description: "Acceder a Gestión > Reservas",
            details: [
              "Ver lista de reservas del día actual",
              "Filtrar por estado: Confirmadas, Pendientes, Canceladas",
              "Revisar detalles de cada reserva",
              "Verificar información del usuario",
              "Comprobar estado de pago"
            ]
          },
          {
            step: 2,
            title: "Confirmar Reservas Pendientes",
            description: "Procesar reservas que requieren confirmación",
            details: [
              "Seleccionar reservas con estado 'Pendiente'",
              "Verificar disponibilidad de la cancha",
              "Confirmar pago recibido",
              "Enviar confirmación al usuario",
              "Generar código QR de acceso"
            ]
          },
          {
            step: 3,
            title: "Gestionar Check-in/Check-out",
            description: "Controlar acceso de usuarios a las instalaciones",
            details: [
              "Escanear código QR del usuario",
              "Verificar identidad y reserva activa",
              "Registrar hora de entrada",
              "Controlar tiempo de uso",
              "Registrar hora de salida"
            ]
          }
        ],
        dailyTasks: [
          "Revisar reservas del día a las 9:00 AM",
          "Confirmar reservas pendientes antes de las 10:00 AM",
          "Verificar check-ins durante el día",
          "Revisar reservas del día siguiente a las 6:00 PM"
        ],
        alerts: [
          "Reservas sin pago confirmado",
          "Usuarios que no han hecho check-in",
          "Reservas canceladas de último momento",
          "Canchas con mantenimiento programado"
        ]
      }
    },
    {
      id: "payments",
      title: "Gestión de Pagos",
      icon: <CreditCard className="w-6 h-6 text-yellow-600" />,
      description: "Administrar pagos, reembolsos y reportes financieros",
      features: [
        "Ver historial de pagos",
        "Procesar reembolsos",
        "Reportes financieros detallados",
        "Conciliación bancaria"
      ],
      priority: "high",
      detailedGuide: {
        overview: "Sistema completo de gestión financiera que integra pagos con Redsys, créditos virtuales y sistema de ledger contable automático.",
        keyFeatures: [
          "Historial completo de todos los pagos y transacciones",
          "Integración con Redsys para pagos con tarjeta",
          "Sistema de créditos virtuales para pagos internos",
          "Procesamiento de reembolsos automático y manual",
          "Reportes financieros detallados con exportación CSV",
          "Sistema de ledger contable con doble entrada",
          "Conciliación bancaria automática"
        ],
        stepByStep: [
          {
            step: 1,
            title: "Revisar Pagos Pendientes",
            description: "Acceder a Finanzas > Pagos",
            details: [
              "Ver lista de pagos pendientes de confirmación",
              "Filtrar por método de pago (tarjeta, créditos, transferencia)",
              "Verificar estado de transacciones con Redsys",
              "Confirmar pagos recibidos",
              "Marcar como procesados"
            ]
          },
          {
            step: 2,
            title: "Procesar Reembolsos",
            description: "Gestionar devoluciones de pagos",
            details: [
              "Seleccionar pago a reembolsar",
              "Verificar motivo del reembolso",
              "Calcular monto a devolver",
              "Procesar reembolso automático",
              "Registrar en sistema de ledger",
              "Notificar al usuario"
            ]
          },
          {
            step: 3,
            title: "Generar Reportes Financieros",
            description: "Crear reportes detallados de ingresos",
            details: [
              "Seleccionar período de reporte",
              "Filtrar por método de pago",
              "Exportar datos a CSV",
              "Revisar métricas de ingresos",
              "Analizar tendencias de pago"
            ]
          }
        ],
        paymentMethods: [
          {
            method: "Tarjeta de Crédito/Débito",
            provider: "Redsys",
            features: ["PCI DSS Level 1", "3D Secure", "SSL/TLS", "Procesamiento en tiempo real"]
          },
          {
            method: "Créditos Virtuales",
            provider: "Sistema Interno",
            features: ["Recarga por tarjeta", "Uso instantáneo", "Historial completo", "Sin comisiones"]
          },
          {
            method: "Transferencia Bancaria",
            provider: "Manual",
            features: ["Confirmación manual", "Registro en ledger", "Conciliación posterior"]
          }
        ],
        dailyTasks: [
          "Revisar pagos pendientes a las 10:00 AM",
          "Confirmar pagos recibidos",
          "Procesar reembolsos solicitados",
          "Revisar métricas del día a las 6:00 PM"
        ],
        alerts: [
          "Pagos fallidos que requieren atención",
          "Reembolsos pendientes de procesar",
          "Discrepancias en conciliación bancaria",
          "Transacciones sospechosas"
        ]
      }
    },
    {
      id: "users",
      title: "Gestión de Usuarios",
      icon: <Users className="w-6 h-6 text-indigo-600" />,
      description: "Administrar clientes y sus cuentas",
      features: [
        "Ver lista de usuarios",
        "Editar información de clientes",
        "Gestionar membresías",
        "Ajustar créditos de usuarios"
      ],
      priority: "medium",
      detailedGuide: {
        overview: "Sistema completo para administrar todos los usuarios del polideportivo, incluyendo sus datos personales, membresías y créditos virtuales.",
        keyFeatures: [
          "Lista completa de usuarios registrados con filtros avanzados",
          "Edición de información personal y de contacto",
          "Gestión de membresías (Básica, Premium, VIP)",
          "Administración de créditos virtuales",
          "Historial de reservas y transacciones por usuario",
          "Sistema de notificaciones personalizadas",
          "Control de acceso y permisos"
        ],
        stepByStep: [
          {
            step: 1,
            title: "Revisar Usuarios Nuevos",
            description: "Acceder a Gestión > Usuarios",
            details: [
              "Ver lista de usuarios recién registrados",
              "Verificar información de contacto",
              "Confirmar datos de identificación",
              "Activar cuentas pendientes",
              "Enviar bienvenida personalizada"
            ]
          },
          {
            step: 2,
            title: "Gestionar Membresías",
            description: "Administrar planes de membresía",
            details: [
              "Ver estado actual de membresías",
              "Procesar renovaciones",
              "Aplicar descuentos especiales",
              "Gestionar cancelaciones",
              "Actualizar beneficios incluidos"
            ]
          },
          {
            step: 3,
            title: "Administrar Créditos",
            description: "Controlar saldos de créditos virtuales",
            details: [
              "Ver saldo actual de cada usuario",
              "Ajustar créditos por promociones",
              "Procesar recargas manuales",
              "Gestionar reembolsos en créditos",
              "Revisar historial de transacciones"
            ]
          }
        ],
        membershipTypes: [
          {
            type: "Básica",
            price: "€29.99/mes",
            features: ["Acceso a canchas", "10% descuento", "Soporte estándar"],
            credits: "€20 incluidos"
          },
          {
            type: "Premium",
            price: "€49.99/mes",
            features: ["Acceso prioritario", "20% descuento", "Soporte prioritario"],
            credits: "€40 incluidos"
          },
          {
            type: "VIP",
            price: "€79.99/mes",
            features: ["Acceso exclusivo", "30% descuento", "Soporte 24/7"],
            credits: "€70 incluidos"
          }
        ],
        dailyTasks: [
          "Revisar usuarios nuevos a las 9:00 AM",
          "Procesar renovaciones de membresías",
          "Ajustar créditos por promociones",
          "Revisar actividad de usuarios a las 6:00 PM"
        ]
      }
    },
    {
      id: "products",
      title: "Gestión de Productos",
      icon: <Settings className="w-6 h-6 text-red-600" />,
      description: "Administrar la tienda online",
      features: [
        "Agregar y editar productos",
        "Gestionar inventario",
        "Configurar precios",
        "Ver pedidos de productos"
      ],
      priority: "medium",
      detailedGuide: {
        overview: "Sistema completo para administrar la tienda online del polideportivo, incluyendo productos deportivos, inventario y pedidos.",
        keyFeatures: [
          "Catálogo completo de productos deportivos",
          "Gestión de inventario en tiempo real",
          "Configuración de precios y descuentos",
          "Sistema de pedidos con estados automáticos",
          "Integración con sistema de pagos",
          "Cálculo automático de créditos por producto",
          "Reportes de ventas y stock"
        ],
        stepByStep: [
          {
            step: 1,
            title: "Agregar Nuevo Producto",
            description: "Acceder a Gestión > Productos > Nuevo",
            details: [
              "Definir nombre y descripción del producto",
              "Subir imágenes de alta calidad",
              "Establecer precio en euros",
              "Configurar equivalencia en créditos",
              "Definir categoría y etiquetas",
              "Establecer stock inicial"
            ]
          },
          {
            step: 2,
            title: "Gestionar Inventario",
            description: "Controlar stock de productos",
            details: [
              "Revisar niveles de stock actuales",
              "Actualizar cantidades disponibles",
              "Configurar alertas de stock bajo",
              "Registrar entradas de mercancía",
              "Procesar devoluciones"
            ]
          },
          {
            step: 3,
            title: "Procesar Pedidos",
            description: "Gestionar pedidos de clientes",
            details: [
              "Ver lista de pedidos pendientes",
              "Verificar disponibilidad de productos",
              "Confirmar pago recibido",
              "Marcar como enviado",
              "Actualizar estado de entrega"
            ]
          }
        ],
        productCategories: [
          "Equipamiento deportivo",
          "Ropa deportiva",
          "Accesorios",
          "Suplementos",
          "Regalos y merchandising"
        ],
        orderStates: [
          "PENDING - Pendiente de pago",
          "PAID - Pagado, preparando envío",
          "SHIPPED - Enviado",
          "DELIVERED - Entregado",
          "CANCELLED - Cancelado",
          "REFUNDED - Reembolsado"
        ],
        dailyTasks: [
          "Revisar pedidos nuevos a las 9:00 AM",
          "Actualizar inventario",
          "Procesar envíos",
          "Revisar stock bajo a las 6:00 PM"
        ]
      }
    },
    {
      id: "tournaments",
      title: "Gestión de Torneos",
      icon: <Trophy className="w-6 h-6 text-orange-600" />,
      description: "Crear y administrar torneos deportivos",
      features: [
        "Crear nuevos torneos",
        "Gestionar inscripciones",
        "Seguir resultados",
        "Configurar premios"
      ],
      priority: "medium",
      detailedGuide: {
        overview: "Sistema completo para crear, gestionar y administrar torneos deportivos con inscripciones online, seguimiento de resultados y sistema de premios.",
        keyFeatures: [
          "Creación de torneos con múltiples categorías",
          "Sistema de inscripciones online con pago por créditos",
          "Gestión de participantes y equipos",
          "Seguimiento de resultados en tiempo real",
          "Sistema de ranking y puntuaciones",
          "Comunicación con participantes",
          "Gestión de premios y reconocimientos"
        ],
        stepByStep: [
          {
            step: 1,
            title: "Crear Nuevo Torneo",
            description: "Acceder a Torneos > Nuevo Torneo",
            details: [
              "Definir nombre y descripción del torneo",
              "Seleccionar deporte y categoría",
              "Establecer fechas de inscripción y competición",
              "Configurar formato (eliminación directa, liga, etc.)",
              "Establecer precio de inscripción",
              "Definir premios y reconocimientos"
            ]
          },
          {
            step: 2,
            title: "Gestionar Inscripciones",
            description: "Administrar participantes del torneo",
            details: [
              "Revisar inscripciones recibidas",
              "Verificar pagos de inscripción",
              "Confirmar participantes",
              "Organizar equipos y grupos",
              "Enviar confirmaciones"
            ]
          },
          {
            step: 3,
            title: "Seguir Resultados",
            description: "Actualizar resultados y posiciones",
            details: [
              "Registrar resultados de partidos",
              "Actualizar tabla de posiciones",
              "Gestionar eliminatorias",
              "Comunicar avances a participantes",
              "Preparar finales"
            ]
          }
        ],
        tournamentTypes: [
          {
            type: "Eliminación Directa",
            description: "Perdedor queda eliminado",
            duration: "1-2 días",
            participants: "8, 16, 32, 64"
          },
          {
            type: "Liga",
            description: "Todos contra todos",
            duration: "1-2 semanas",
            participants: "4-8 equipos"
          },
          {
            type: "Mixto",
            description: "Fase de grupos + eliminatorias",
            duration: "2-3 semanas",
            participants: "16-32 equipos"
          }
        ],
        dailyTasks: [
          "Revisar inscripciones nuevas",
          "Actualizar resultados de partidos",
          "Comunicar con participantes",
          "Preparar próximas rondas"
        ]
      }
    },
    {
      id: "maintenance",
      title: "Mantenimiento",
      icon: <Wrench className="w-6 h-6 text-gray-600" />,
      description: "Programar y gestionar tareas de mantenimiento",
      features: [
        "Crear tareas de mantenimiento",
        "Asignar técnicos",
        "Seguir progreso",
        "Historial de mantenimiento"
      ],
      priority: "medium",
      detailedGuide: {
        overview: "Sistema completo para programar, gestionar y controlar todas las tareas de mantenimiento del polideportivo, tanto preventivo como correctivo.",
        keyFeatures: [
          "Programación de mantenimiento preventivo y correctivo",
          "Asignación de técnicos y equipos de trabajo",
          "Seguimiento de progreso en tiempo real",
          "Gestión de inventario de repuestos",
          "Historial completo de mantenimientos",
          "Alertas automáticas de vencimientos",
          "Reportes de costos y eficiencia"
        ],
        stepByStep: [
          {
            step: 1,
            title: "Crear Tarea de Mantenimiento",
            description: "Acceder a Mantenimiento > Nueva Tarea",
            details: [
              "Definir tipo de mantenimiento (preventivo/correctivo)",
              "Seleccionar cancha o área afectada",
              "Describir tarea a realizar",
              "Establecer fecha y hora programada",
              "Asignar técnico responsable",
              "Estimar duración y costos"
            ]
          },
          {
            step: 2,
            title: "Asignar Recursos",
            description: "Gestionar técnicos y materiales",
            details: [
              "Asignar técnico principal y ayudantes",
              "Verificar disponibilidad de herramientas",
              "Revisar inventario de repuestos",
              "Coordinar con proveedores si es necesario",
              "Establecer presupuesto de materiales"
            ]
          },
          {
            step: 3,
            title: "Seguir Progreso",
            description: "Controlar ejecución de tareas",
            details: [
              "Registrar inicio de trabajo",
              "Actualizar progreso en tiempo real",
              "Documentar incidencias encontradas",
              "Registrar materiales utilizados",
              "Marcar tarea como completada"
            ]
          }
        ],
        maintenanceTypes: [
          {
            type: "Preventivo",
            frequency: "Mensual/Trimestral",
            description: "Mantenimiento programado para prevenir fallos",
            examples: ["Limpieza profunda", "Revisión de equipos", "Calibración"]
          },
          {
            type: "Correctivo",
            frequency: "Según necesidad",
            description: "Reparación de fallos existentes",
            examples: ["Cambio de bombillas", "Reparación de cerraduras", "Arreglo de equipos"]
          },
          {
            type: "Emergencia",
            frequency: "Inmediato",
            description: "Reparaciones urgentes que afectan operación",
            examples: ["Fallo de iluminación", "Problemas de seguridad", "Averías críticas"]
          }
        ],
        dailyTasks: [
          "Revisar tareas programadas para el día",
          "Verificar progreso de trabajos en curso",
          "Actualizar inventario de repuestos",
          "Revisar alertas de mantenimiento a las 6:00 PM"
        ]
      }
    },
    {
      id: "notifications",
      title: "Notificaciones",
      icon: <Bell className="w-6 h-6 text-pink-600" />,
      description: "Enviar comunicaciones a usuarios",
      features: [
        "Enviar notificaciones masivas",
        "Recordatorios de reservas",
        "Promociones y ofertas",
        "Comunicados importantes"
      ],
      priority: "low",
      detailedGuide: {
        overview: "Sistema de comunicaciones integrado con SendGrid para enviar notificaciones automáticas y masivas a usuarios del polideportivo.",
        keyFeatures: [
          "Envío de notificaciones masivas segmentadas",
          "Recordatorios automáticos de reservas",
          "Promociones y ofertas personalizadas",
          "Comunicados importantes del polideportivo",
          "Integración con SendGrid para alta deliverabilidad",
          "Plantillas personalizables",
          "Seguimiento de apertura y clics"
        ],
        stepByStep: [
          {
            step: 1,
            title: "Crear Notificación Masiva",
            description: "Acceder a Notificaciones > Nueva Campaña",
            details: [
              "Definir asunto y contenido del mensaje",
              "Seleccionar segmento de usuarios",
              "Configurar fecha y hora de envío",
              "Personalizar plantilla de email",
              "Programar envío automático"
            ]
          },
          {
            step: 2,
            title: "Gestionar Recordatorios",
            description: "Configurar notificaciones automáticas",
            details: [
              "Activar recordatorios de reservas",
              "Configurar horarios de envío",
              "Personalizar mensajes por tipo de reserva",
              "Gestionar excepciones y cancelaciones"
            ]
          }
        ],
        notificationTypes: [
          "Recordatorios de reservas",
          "Confirmaciones de pago",
          "Promociones especiales",
          "Comunicados de mantenimiento",
          "Notificaciones de torneos",
          "Alertas de seguridad"
        ]
      }
    },
    {
      id: "reports",
      title: "Reportes Avanzados",
      icon: <FileText className="w-6 h-6 text-teal-600" />,
      description: "Análisis detallados y exportación de datos",
      features: [
        "Reportes de ingresos",
        "Análisis de ocupación",
        "Estadísticas de usuarios",
        "Exportar datos a Excel/PDF"
      ],
      priority: "low",
      detailedGuide: {
        overview: "Sistema completo de reportes y análisis que proporciona insights detallados sobre el rendimiento del polideportivo con exportación a múltiples formatos.",
        keyFeatures: [
          "Reportes de ingresos con análisis de tendencias",
          "Análisis de ocupación por cancha y horario",
          "Estadísticas detalladas de usuarios y membresías",
          "Exportación a Excel, PDF y CSV",
          "Dashboards interactivos en tiempo real",
          "Comparativas mensuales y anuales",
          "Métricas de ROI y rentabilidad"
        ],
        stepByStep: [
          {
            step: 1,
            title: "Generar Reporte de Ingresos",
            description: "Acceder a Reportes > Ingresos",
            details: [
              "Seleccionar período de análisis",
              "Filtrar por método de pago",
              "Configurar métricas específicas",
              "Exportar a Excel o PDF",
              "Analizar tendencias y patrones"
            ]
          },
          {
            step: 2,
            title: "Análisis de Ocupación",
            description: "Revisar utilización de canchas",
            details: [
              "Ver ocupación por cancha y horario",
              "Identificar horas pico y valle",
              "Analizar rentabilidad por slot",
              "Optimizar precios según demanda"
            ]
          }
        ],
        reportTypes: [
          "Reporte de Ingresos Diario/Mensual",
          "Análisis de Ocupación de Canchas",
          "Estadísticas de Usuarios y Membresías",
          "Reporte de Pagos y Reembolsos",
          "Análisis de Productos Más Vendidos",
          "Métricas de Torneos y Eventos"
        ]
      }
    }
  ];

  const dailyTasks = [
    {
      icon: <CheckCircle className="w-5 h-5 text-green-600" />,
      task: "Revisar reservas del día",
      time: "9:00 AM",
      description: "Confirmar que todas las reservas están correctas",
      href: "https://administradorpolideportivo.vercel.app/reservations",
      completed: false
    },
    {
      icon: <CreditCard className="w-5 h-5 text-blue-600" />,
      task: "Verificar pagos pendientes",
      time: "10:00 AM",
      description: "Revisar pagos que requieren confirmación",
      href: "https://administradorpolideportivo.vercel.app/payments",
      completed: false
    },
    {
      icon: <Users className="w-5 h-5 text-purple-600" />,
      task: "Check-in de usuarios",
      time: "Durante el día",
      description: "Confirmar llegada de usuarios a sus reservas",
      href: "https://administradorpolideportivo.vercel.app/access-control",
      completed: false
    },
    {
      icon: <BarChart3 className="w-5 h-5 text-orange-600" />,
      task: "Revisar métricas del día",
      time: "6:00 PM",
      description: "Analizar ocupación y ingresos del día",
      href: "https://administradorpolideportivo.vercel.app/reports",
      completed: false
    }
  ];

  const importantAlerts = [
    {
      icon: <AlertTriangle className="w-5 h-5 text-red-600" />,
      title: "Reservas sin Pago",
      description: "Revisar reservas que no han sido pagadas",
      action: "Ir a Gestión de Reservas",
      href: "https://administradorpolideportivo.vercel.app/reservations",
      priority: "high"
    },
    {
      icon: <Wrench className="w-5 h-5 text-orange-600" />,
      title: "Mantenimiento Pendiente",
      description: "Hay tareas de mantenimiento programadas",
      action: "Ver Mantenimiento",
      href: "https://administradorpolideportivo.vercel.app/maintenance",
      priority: "medium"
    },
    {
      icon: <Bell className="w-5 h-5 text-blue-600" />,
      title: "Notificaciones No Enviadas",
      description: "Algunas notificaciones están pendientes",
      action: "Revisar Notificaciones",
      href: "https://administradorpolideportivo.vercel.app/notifications",
      priority: "low"
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
                  ⚙️ Manual de Administración
                </h1>
                <p className="text-gray-600">
                  Guía completa para propietarios y administradores
                </p>
              </div>
            </div>
            <Badge variant="secondary" className="text-sm bg-green-100 text-green-800">
              Administrador
            </Badge>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Introduction */}
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-lg text-white p-8 mb-8">
          <div className="flex items-center mb-4">
            <Settings className="w-8 h-8 mr-3" />
            <h2 className="text-3xl font-bold">Panel de Administración</h2>
          </div>
          <p className="text-lg text-green-100 mb-4">
            Este manual te guiará para administrar eficientemente tu polideportivo 
            usando todas las herramientas disponibles en el sistema.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center text-green-100">
              <TrendingUp className="w-5 h-5 mr-2" />
              <span>Control total del negocio</span>
            </div>
            <div className="flex items-center text-green-100">
              <DollarSign className="w-5 h-5 mr-2" />
              <span>Reportes financieros detallados</span>
            </div>
            <div className="flex items-center text-green-100">
              <Users className="w-5 h-5 mr-2" />
              <span>Gestión de clientes</span>
            </div>
            <div className="flex items-center text-green-100">
              <Globe className="w-5 h-5 mr-2" />
              <span>Acceso desde cualquier dispositivo</span>
            </div>
          </div>
        </div>

        {/* Priority Sections */}
        <div className="mb-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-6">
            ⭐ Funciones Principales (Alta Prioridad)
          </h3>
          <div className="grid md:grid-cols-2 gap-6">
            {mainSections.filter(section => section.priority === "high").map((section, index) => (
              <Card key={section.id} className="hover:shadow-lg transition-shadow border-l-4 border-l-green-500">
                <CardHeader>
                  <div className="flex items-center space-x-4">
                    {section.icon}
                    <div>
                      <CardTitle className="text-xl text-gray-900">
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
                    {section.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center text-sm text-gray-600">
                        <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4 pt-4 border-t">
            <Button 
              onClick={() => {
                if (!expandedSections.has(section.id)) {
                  showGuideMessage(section.title);
                }
                toggleSection(section.id);
              }}
              className="w-full bg-green-600 hover:bg-green-700 flex items-center justify-center transition-all duration-200 hover:shadow-lg"
            >
              {expandedSections.has(section.id) ? (
                <>
                  <ChevronUp className="w-4 h-4 mr-2" />
                  Ocultar Guía Detallada
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4 mr-2" />
                  Ver Guía Detallada
                </>
              )}
            </Button>
                  </div>
                  
                  {/* Guía Detallada Expandida */}
                  {section.detailedGuide && expandedSections.has(section.id) && (
                    <div className="mt-6 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 animate-in slide-in-from-top-2 duration-300">
                      <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                        <Info className="w-5 h-5 mr-2 text-blue-600" />
                        Guía Detallada
                      </h4>
                      
                      <div className="space-y-6">
                        {/* Overview */}
                        <div>
                          <h5 className="font-semibold text-gray-900 mb-2">Descripción General</h5>
                          <p className="text-sm text-gray-700 leading-relaxed">
                            {section.detailedGuide.overview}
                          </p>
                        </div>

                        {/* Key Features */}
                        {section.detailedGuide.keyFeatures && (
                          <div>
                            <h5 className="font-semibold text-gray-900 mb-3">Características Principales</h5>
                            <ul className="space-y-2">
                              {section.detailedGuide.keyFeatures.map((feature, idx) => (
                                <li key={idx} className="flex items-start text-sm text-gray-700">
                                  <CheckCircle className="w-4 h-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                                  <span>{feature}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Step by Step */}
                        {section.detailedGuide.stepByStep && (
                          <div>
                            <h5 className="font-semibold text-gray-900 mb-3">Proceso Paso a Paso</h5>
                            <div className="space-y-4">
                              {section.detailedGuide.stepByStep.map((step, idx) => (
                                <div key={idx} className="bg-white p-4 rounded-lg border border-gray-200">
                                  <div className="flex items-start">
                                    <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3 flex-shrink-0">
                                      {step.step}
                                    </div>
                                    <div className="flex-1">
                                      <h6 className="font-semibold text-gray-900 mb-1">{step.title}</h6>
                                      <p className="text-sm text-gray-600 mb-2">{step.description}</p>
                                      <ul className="space-y-1">
                                        {step.details.map((detail, detailIdx) => (
                                          <li key={detailIdx} className="flex items-start text-xs text-gray-700">
                                            <div className="w-1.5 h-1.5 bg-blue-400 rounded-full mr-2 mt-1.5 flex-shrink-0"></div>
                                            <span>{detail}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Daily Tasks */}
                        {section.detailedGuide.dailyTasks && (
                          <div>
                            <h5 className="font-semibold text-gray-900 mb-3">Tareas Diarias Recomendadas</h5>
                            <ul className="space-y-2">
                              {section.detailedGuide.dailyTasks.map((task, idx) => (
                                <li key={idx} className="flex items-center text-sm text-gray-700">
                                  <Clock className="w-4 h-4 text-orange-600 mr-2 flex-shrink-0" />
                                  <span>{task}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Alerts */}
                        {section.detailedGuide.alerts && (
                          <div>
                            <h5 className="font-semibold text-gray-900 mb-3">Alertas Importantes</h5>
                            <ul className="space-y-2">
                              {section.detailedGuide.alerts.map((alert, idx) => (
                                <li key={idx} className="flex items-center text-sm text-gray-700">
                                  <AlertTriangle className="w-4 h-4 text-red-600 mr-2 flex-shrink-0" />
                                  <span>{alert}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Daily Tasks */}
        <div className="mb-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-6">
            📅 Tareas Diarias Recomendadas
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            {dailyTasks.map((task, index) => {
              const isCompleted = completedTasks.has(index);
              return (
                <div 
                  key={index} 
                  className={`hover:shadow-lg transition-all duration-300 cursor-pointer group ${
                    isCompleted ? 'bg-green-50 border-green-200' : ''
                  }`} 
                  onClick={() => window.open(task.href, '_blank')}
                >
                  <Card>
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      <div className="relative">
                        {task.icon}
                        {isCompleted && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-600 rounded-full flex items-center justify-center">
                            <CheckCircle className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className={`font-semibold transition-colors ${
                            isCompleted ? 'text-green-800 line-through' : 'text-gray-900 group-hover:text-blue-600'
                          }`}>
                            {task.task}
                          </h4>
                          <Badge variant="outline" className="text-xs">
                            <Clock className="w-3 h-3 mr-1" />
                            {task.time}
                          </Badge>
                        </div>
                        <p className={`text-sm mb-3 ${
                          isCompleted ? 'text-green-600' : 'text-gray-600'
                        }`}>
                          {task.description}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-blue-600 font-medium group-hover:text-blue-800">
                            Hacer clic para abrir →
                          </span>
                          <Button 
                            size="sm" 
                            variant={isCompleted ? "default" : "outline"}
                            className={`text-xs ${
                              isCompleted 
                                ? 'bg-green-600 hover:bg-green-700 text-white' 
                                : 'hover:bg-green-50 hover:border-green-300'
                            }`}
                            onClick={() => {
                              toggleTaskCompletion(index);
                            }}
                          >
                            {isCompleted ? '✓ Completada' : 'Marcar como completada'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>
        </div>

        {/* Important Alerts */}
        <div className="mb-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-6">
            ⚠️ Alertas Importantes
          </h3>
          <div className="space-y-4">
            {importantAlerts.map((alert, index) => (
              <Card key={index} className={`border-l-4 ${
                alert.priority === 'high' ? 'border-l-red-500 bg-red-50' :
                alert.priority === 'medium' ? 'border-l-orange-500 bg-orange-50' :
                'border-l-blue-500 bg-blue-50'
              } hover:shadow-lg transition-all duration-300`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {alert.icon}
                      <div>
                        <h4 className="font-semibold text-gray-900 flex items-center">
                          {alert.title}
                          {alert.priority === 'high' && (
                            <Badge className="ml-2 bg-red-100 text-red-800 text-xs">
                              URGENTE
                            </Badge>
                          )}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {alert.description}
                        </p>
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="hover:bg-white hover:shadow-md transition-all duration-200"
                      onClick={() => window.open(alert.href, '_blank')}
                    >
                      {alert.action}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Secondary Sections */}
        <div className="mb-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-6">
            📋 Funciones Secundarias
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mainSections.filter(section => section.priority !== "high").map((section, index) => (
              <Card key={section.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    {section.icon}
                    <div>
                      <CardTitle className="text-lg text-gray-900">
                        {section.title}
                      </CardTitle>
                      <CardDescription className="text-sm">
                        {section.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1 mb-4">
                    {section.features.slice(0, 2).map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center text-xs text-gray-600">
                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-2"></div>
                        {feature}
                      </li>
                    ))}
                  </ul>
            <Button 
              size="sm" 
              variant="outline" 
              className="w-full flex items-center justify-center hover:bg-blue-50 hover:border-blue-300 transition-all duration-200"
              onClick={() => {
                if (!expandedSections.has(section.id)) {
                  showGuideMessage(section.title);
                }
                toggleSection(section.id);
              }}
            >
              {expandedSections.has(section.id) ? (
                <>
                  <ChevronUp className="w-3 h-3 mr-1" />
                  Ocultar Detalles
                </>
              ) : (
                <>
                  <ChevronDown className="w-3 h-3 mr-1" />
                  Ver Detalles
                </>
              )}
            </Button>
                  
                  {/* Guía Detallada para Secciones Secundarias */}
                  {section.detailedGuide && expandedSections.has(section.id) && (
                    <div className="mt-4 p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg border border-gray-200 animate-in slide-in-from-top-2 duration-300">
                      <h5 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                        <Info className="w-4 h-4 mr-2 text-blue-600" />
                        Guía Rápida
                      </h5>
                      
                      <div className="space-y-3">
                        {/* Overview */}
                        <div>
                          <h6 className="text-xs font-semibold text-gray-800 mb-1">Descripción</h6>
                          <p className="text-xs text-gray-600 leading-relaxed">
                            {section.detailedGuide.overview}
                          </p>
                        </div>

                        {/* Key Features - Solo las primeras 3 */}
                        {section.detailedGuide.keyFeatures && (
                          <div>
                            <h6 className="text-xs font-semibold text-gray-800 mb-2">Características</h6>
                            <ul className="space-y-1">
                              {section.detailedGuide.keyFeatures.slice(0, 3).map((feature, idx) => (
                                <li key={idx} className="flex items-start text-xs text-gray-600">
                                  <CheckCircle className="w-3 h-3 text-green-600 mr-1.5 mt-0.5 flex-shrink-0" />
                                  <span>{feature}</span>
                                </li>
                              ))}
                              {section.detailedGuide.keyFeatures.length > 3 && (
                                <li className="text-xs text-gray-500 italic">
                                  +{section.detailedGuide.keyFeatures.length - 3} características más...
                                </li>
                              )}
                            </ul>
                          </div>
                        )}

                        {/* Daily Tasks - Solo las primeras 2 */}
                        {section.detailedGuide.dailyTasks && (
                          <div>
                            <h6 className="text-xs font-semibold text-gray-800 mb-2">Tareas Diarias</h6>
                            <ul className="space-y-1">
                              {section.detailedGuide.dailyTasks.slice(0, 2).map((task, idx) => (
                                <li key={idx} className="flex items-center text-xs text-gray-600">
                                  <Clock className="w-3 h-3 text-orange-600 mr-1.5 flex-shrink-0" />
                                  <span>{task}</span>
                                </li>
                              ))}
                              {section.detailedGuide.dailyTasks.length > 2 && (
                                <li className="text-xs text-gray-500 italic">
                                  +{section.detailedGuide.dailyTasks.length - 2} tareas más...
                                </li>
                              )}
                            </ul>
                          </div>
                        )}

                        {/* Alerts - Solo las primeras 2 */}
                        {section.detailedGuide.alerts && (
                          <div>
                            <h6 className="text-xs font-semibold text-gray-800 mb-2">Alertas</h6>
                            <ul className="space-y-1">
                              {section.detailedGuide.alerts.slice(0, 2).map((alert, idx) => (
                                <li key={idx} className="flex items-center text-xs text-gray-600">
                                  <AlertTriangle className="w-3 h-3 text-red-600 mr-1.5 flex-shrink-0" />
                                  <span>{alert}</span>
                                </li>
                              ))}
                              {section.detailedGuide.alerts.length > 2 && (
                                <li className="text-xs text-gray-500 italic">
                                  +{section.detailedGuide.alerts.length - 2} alertas más...
                                </li>
                              )}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Support Section */}
        <div className="mt-12 bg-white rounded-lg shadow-sm border p-8 text-center">
          <Shield className="w-12 h-12 text-green-600 mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-gray-900 mb-4">
            Soporte Técnico Especializado
          </h3>
          <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
            Como administrador, tienes acceso prioritario al soporte técnico. 
            Nuestro equipo de desarrollo está disponible para ayudarte con cualquier consulta.
          </p>
          <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-center space-x-6 text-sm">
              <div className="flex items-center space-x-2">
                <Shield className="w-4 h-4 text-blue-600" />
                <span className="text-gray-700 font-medium">Email:</span>
                <span className="text-blue-600 font-mono">soporteglobalmindt@gmail.com</span>
              </div>
              <div className="flex items-center space-x-2">
                <Shield className="w-4 h-4 text-blue-600" />
                <span className="text-gray-700 font-medium">Teléfono:</span>
                <span className="text-blue-600 font-mono">+34 692 835 646</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="bg-green-600 hover:bg-green-700 transition-all duration-200 hover:shadow-lg"
              onClick={() => {
                const subject = encodeURIComponent('Soporte Administrador - Urgente');
                const body = encodeURIComponent(`Hola,

Necesito soporte técnico para el panel de administración del polideportivo.

Detalles del problema:
- Sección afectada: 
- Descripción del problema: 
- Pasos para reproducir: 
- Fecha y hora: ${new Date().toLocaleString('es-ES')}

Gracias por su ayuda.

Saludos cordiales.`);
                window.open(`mailto:soporteglobalmindt@gmail.com?subject=${subject}&body=${body}`, '_blank');
              }}
            >
              <Shield className="w-5 h-5 mr-2" />
              Soporte Prioritario
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="hover:bg-blue-50 hover:border-blue-300 transition-all duration-200 hover:shadow-lg"
              onClick={() => window.open('/technical-docs', '_blank')}
            >
              <FileText className="w-5 h-5 mr-2" />
              Documentación Técnica
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
          <Link href="/technical-docs">
            <Button>
              Documentación Técnica
              <ArrowLeft className="w-4 h-4 ml-2 rotate-180" />
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
