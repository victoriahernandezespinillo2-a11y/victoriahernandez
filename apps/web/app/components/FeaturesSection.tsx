"use client";

import { useState, useEffect, useRef } from "react";

export function FeaturesSection() {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  const features = [
    {
      icon: "fas fa-calendar-check",
      title: "Reservas Inteligentes",
      description: "Sistema de reservas 24/7 con confirmación instantánea, recordatorios automáticos y gestión de pagos integrada.",
      color: "from-emerald-500 to-teal-600",
      bgColor: "bg-emerald-50",
      iconColor: "text-emerald-600",
      benefits: ["Reserva en tiempo real", "Notificaciones automáticas", "Historial completo"]
    },
    {
      icon: "fas fa-dumbbell",
      title: "Instalaciones Premium",
      description: "Canchas sintéticas de última generación, gimnasio completamente equipado y espacios diseñados para el máximo rendimiento.",
      color: "from-blue-500 to-indigo-600",
      bgColor: "bg-blue-50",
      iconColor: "text-blue-600",
      benefits: ["Tecnología avanzada", "Mantenimiento diario", "Equipos profesionales"]
    },
    {
      icon: "fas fa-users",
      title: "Comunidad Activa",
      description: "Únete a una comunidad vibrante de deportistas, participa en torneos y eventos que conectan personas.",
      color: "from-purple-500 to-pink-600",
      bgColor: "bg-purple-50",
      iconColor: "text-purple-600",
      benefits: ["Eventos regulares", "Networking deportivo", "Grupos de entrenamiento"]
    },
    {
      icon: "fas fa-trophy",
      title: "Programas Especializados",
      description: "Clases dirigidas, entrenamiento personal y programas deportivos diseñados por profesionales certificados.",
      color: "from-orange-500 to-red-600",
      bgColor: "bg-orange-50",
      iconColor: "text-orange-600",
      benefits: ["Entrenadores certificados", "Planes personalizados", "Seguimiento de progreso"]
    },
    {
      icon: "fas fa-shield-alt",
      title: "Seguridad Garantizada",
      description: "Protocolos de seguridad estrictos, personal capacitado y seguros de responsabilidad civil para tu tranquilidad.",
      color: "from-green-500 to-emerald-600",
      bgColor: "bg-green-50",
      iconColor: "text-green-600",
      benefits: ["Protocolos certificados", "Personal capacitado", "Seguros incluidos"]
    },
    {
      icon: "fas fa-mobile-alt",
      title: "App Móvil",
      description: "Controla todo desde tu smartphone: reservas, pagos, horarios y notificaciones en tiempo real.",
      color: "from-cyan-500 to-blue-600",
      bgColor: "bg-cyan-50",
      iconColor: "text-cyan-600",
      benefits: ["Control total", "Sincronización en tiempo real", "Interfaz intuitiva"]
    }
  ];

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="py-24 bg-gradient-to-br from-gray-50 to-white relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-20 left-20 w-72 h-72 bg-emerald-500 rounded-full filter blur-3xl"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-blue-500 rounded-full filter blur-3xl"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Section Header */}
        <div className={`text-center mb-20 transition-all duration-1000 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}>
          <div className="inline-flex items-center space-x-2 bg-emerald-100 text-emerald-800 rounded-full px-6 py-2 mb-6">
            <i className="fas fa-star text-emerald-600"></i>
            <span className="font-semibold text-sm">Características Premium</span>
          </div>
          
          <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-6">
            ¿Por qué elegir
            <span className="gradient-text block">Polideportivo Victoria Hernandez?</span>
          </h2>
          
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Ofrecemos una experiencia deportiva integral con tecnología de vanguardia, 
            instalaciones de primera clase y un servicio excepcional que supera todas las expectativas.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className={`group relative bg-white rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 border border-gray-100 overflow-hidden ${
                isVisible ? 'animate-slide-up' : 'opacity-0'
              }`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Background Gradient */}
              <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-5 transition-opacity duration-500`}></div>
              
              {/* Icon */}
              <div className={`relative w-16 h-16 ${feature.bgColor} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                <i className={`${feature.icon} text-2xl ${feature.iconColor}`}></i>
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-20 rounded-2xl transition-opacity duration-300`}></div>
              </div>

              {/* Content */}
              <div className="relative">
                <h3 className="text-xl font-bold text-gray-900 mb-4 group-hover:text-gray-800 transition-colors duration-300">
                  {feature.title}
                </h3>
                
                <p className="text-gray-600 leading-relaxed mb-6">
                  {feature.description}
                </p>

                {/* Benefits List */}
                <ul className="space-y-2 mb-6">
                  {feature.benefits.map((benefit, benefitIndex) => (
                    <li key={benefitIndex} className="flex items-center space-x-3 text-sm text-gray-700">
                      <div className={`w-2 h-2 bg-gradient-to-r ${feature.color} rounded-full`}></div>
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>

                {/* Learn More Link */}
                <button className={`group/btn flex items-center space-x-2 text-sm font-semibold ${feature.iconColor} hover:underline transition-all duration-300`}>
                  <span>Conocer más</span>
                  <i className="fas fa-arrow-right group-hover/btn:translate-x-1 transition-transform duration-300"></i>
                </button>
              </div>

              {/* Hover Effect Border */}
              <div className={`absolute inset-0 rounded-3xl border-2 border-transparent group-hover:border-gradient-to-r group-hover:${feature.color} opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none`}></div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className={`text-center mt-20 transition-all duration-1000 delay-500 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}>
          <div className="bg-gradient-to-r from-emerald-500 to-blue-600 rounded-3xl p-12 text-white relative overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute inset-0" style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M20 20c0-11.046-8.954-20-20-20s-20 8.954-20 20 8.954 20 20 20 20-8.954 20-20z'/%3E%3C/g%3E%3C/svg%3E")`,
              }}></div>
            </div>
            
            <div className="relative">
              <h3 className="text-3xl font-bold mb-4">
                ¿Listo para comenzar tu experiencia deportiva?
              </h3>
              <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
                Únete a miles de deportistas que ya disfrutan de nuestras instalaciones premium
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6">
                <button className="bg-white text-emerald-600 px-8 py-4 rounded-2xl font-bold text-lg shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 flex items-center space-x-3">
                  <i className="fas fa-rocket"></i>
                  <span>Comenzar Ahora</span>
                </button>
                
                <button className="border-2 border-white/50 text-white px-8 py-4 rounded-2xl font-semibold text-lg hover:bg-white/10 transition-all duration-300 flex items-center space-x-3">
                  <i className="fas fa-phone"></i>
                  <span>Contactar</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}