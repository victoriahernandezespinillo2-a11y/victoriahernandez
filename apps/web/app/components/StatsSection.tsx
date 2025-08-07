"use client";

import { useState, useEffect, useRef } from "react";

export function StatsSection() {
  const [isVisible, setIsVisible] = useState(false);
  const [counters, setCounters] = useState({
    users: 0,
    reservations: 0,
    facilities: 0,
    satisfaction: 0
  });
  const sectionRef = useRef<HTMLElement>(null);

  const stats = [
    {
      id: 'users',
      value: 5000,
      suffix: '+',
      label: 'Usuarios Activos',
      description: 'Deportistas confían en nosotros',
      icon: 'fas fa-users',
      color: 'from-blue-500 to-indigo-600',
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-600'
    },
    {
      id: 'reservations',
      value: 25000,
      suffix: '+',
      label: 'Reservas Completadas',
      description: 'Experiencias deportivas exitosas',
      icon: 'fas fa-calendar-check',
      color: 'from-emerald-500 to-green-600',
      bgColor: 'bg-emerald-50',
      iconColor: 'text-emerald-600'
    },
    {
      id: 'facilities',
      value: 15,
      suffix: '',
      label: 'Instalaciones Premium',
      description: 'Espacios deportivos de alta calidad',
      icon: 'fas fa-building',
      color: 'from-purple-500 to-pink-600',
      bgColor: 'bg-purple-50',
      iconColor: 'text-purple-600'
    },
    {
      id: 'satisfaction',
      value: 98,
      suffix: '%',
      label: 'Satisfacción Cliente',
      description: 'Índice de satisfacción promedio',
      icon: 'fas fa-star',
      color: 'from-orange-500 to-red-600',
      bgColor: 'bg-orange-50',
      iconColor: 'text-orange-600'
    }
  ];

  const achievements = [
    {
      title: 'Centro Deportivo del Año',
      year: '2023',
      organization: 'Asociación Deportiva Nacional',
      icon: 'fas fa-trophy',
      color: 'text-yellow-600'
    },
    {
      title: 'Certificación ISO 9001',
      year: '2023',
      organization: 'Calidad en Servicios Deportivos',
      icon: 'fas fa-certificate',
      color: 'text-blue-600'
    },
    {
      title: 'Mejor Innovación Tecnológica',
      year: '2022',
      organization: 'Tech Sports Awards',
      icon: 'fas fa-microchip',
      color: 'text-purple-600'
    },
    {
      title: 'Compromiso Ambiental',
      year: '2023',
      organization: 'Green Sports Initiative',
      icon: 'fas fa-leaf',
      color: 'text-green-600'
    }
  ];

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.3 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (isVisible) {
      const duration = 2000; // 2 seconds
      const steps = 60;
      const stepDuration = duration / steps;

      stats.forEach((stat) => {
        let currentValue = 0;
        const increment = stat.value / steps;
        
        const timer = setInterval(() => {
          currentValue += increment;
          if (currentValue >= stat.value) {
            currentValue = stat.value;
            clearInterval(timer);
          }
          
          setCounters(prev => ({
            ...prev,
            [stat.id]: Math.floor(currentValue)
          }));
        }, stepDuration);
      });
    }
  }, [isVisible]);

  return (
    <section ref={sectionRef} className="py-24 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0">
        {/* Animated Background Circles */}
        <div className="absolute top-20 left-20 w-72 h-72 bg-blue-500/10 rounded-full filter blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500/10 rounded-full filter blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-emerald-500/10 rounded-full filter blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        
        {/* Grid Pattern */}
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M0 0h40v40H0z' fill='none'/%3E%3Cpath d='M0 20h40M20 0v40' stroke='%23ffffff' stroke-width='1'/%3E%3C/g%3E%3C/svg%3E")`,
        }}></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Section Header */}
        <div className={`text-center mb-20 transition-all duration-1000 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}>
          <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-sm text-white rounded-full px-6 py-2 mb-6">
            <i className="fas fa-chart-line text-emerald-400"></i>
            <span className="font-semibold text-sm">Números que Hablan</span>
          </div>
          
          <h2 className="text-4xl md:text-5xl font-black text-white mb-6">
            Resultados que nos
            <span className="gradient-text block">Enorgullecen</span>
          </h2>
          
          <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
            Más de una década construyendo la mejor experiencia deportiva, 
            respaldados por números que demuestran nuestro compromiso con la excelencia.
          </p>
        </div>

        {/* Main Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-20">
          {stats.map((stat, index) => (
            <div
              key={stat.id}
              className={`group relative bg-white/10 backdrop-blur-sm rounded-3xl p-8 border border-white/20 hover:bg-white/20 transition-all duration-500 hover:-translate-y-2 ${
                isVisible ? 'animate-slide-up' : 'opacity-0'
              }`}
              style={{ animationDelay: `${index * 150}ms` }}
            >
              {/* Background Gradient */}
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-0 group-hover:opacity-10 rounded-3xl transition-opacity duration-500`}></div>
              
              {/* Icon */}
              <div className={`relative w-16 h-16 ${stat.bgColor} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                <i className={`${stat.icon} text-2xl ${stat.iconColor}`}></i>
                <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-0 group-hover:opacity-20 rounded-2xl transition-opacity duration-300`}></div>
              </div>

              {/* Counter */}
              <div className="relative mb-4">
                <div className="text-4xl md:text-5xl font-black text-white mb-2">
                  {counters[stat.id as keyof typeof counters].toLocaleString()}{stat.suffix}
                </div>
                <div className="text-lg font-bold text-gray-300 mb-2">
                  {stat.label}
                </div>
                <div className="text-sm text-gray-400">
                  {stat.description}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="relative">
                <div className="w-full bg-white/10 rounded-full h-2">
                  <div 
                    className={`h-2 bg-gradient-to-r ${stat.color} rounded-full transition-all duration-2000 ease-out`}
                    style={{ 
                      width: isVisible ? '100%' : '0%',
                      transitionDelay: `${index * 150}ms`
                    }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Achievements Section */}
        <div className={`transition-all duration-1000 delay-500 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}>
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-white mb-4">
              Reconocimientos y Certificaciones
            </h3>
            <p className="text-gray-300 max-w-2xl mx-auto">
              Nuestro compromiso con la excelencia ha sido reconocido por organizaciones líderes en el sector deportivo.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {achievements.map((achievement, index) => (
              <div
                key={index}
                className={`group bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 hover:bg-white/10 transition-all duration-300 hover:-translate-y-1 ${
                  isVisible ? 'animate-slide-up' : 'opacity-0'
                }`}
                style={{ animationDelay: `${600 + index * 100}ms` }}
              >
                <div className="text-center">
                  <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-white/10 mb-4 group-hover:scale-110 transition-transform duration-300`}>
                    <i className={`${achievement.icon} text-xl ${achievement.color}`}></i>
                  </div>
                  
                  <h4 className="text-white font-bold text-sm mb-2 leading-tight">
                    {achievement.title}
                  </h4>
                  
                  <div className="text-gray-400 text-xs mb-1">
                    {achievement.organization}
                  </div>
                  
                  <div className="text-gray-500 text-xs font-semibold">
                    {achievement.year}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className={`text-center mt-20 transition-all duration-1000 delay-700 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}>
          <div className="bg-gradient-to-r from-emerald-500/20 to-blue-600/20 backdrop-blur-sm rounded-3xl p-12 border border-white/20">
            <h3 className="text-3xl font-bold text-white mb-4">
              ¿Quieres ser parte de estos números?
            </h3>
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Únete a nuestra comunidad deportiva y contribuye a hacer crecer estas estadísticas
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6">
              <button className="bg-gradient-to-r from-emerald-500 to-blue-600 text-white px-8 py-4 rounded-2xl font-bold text-lg shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 flex items-center space-x-3">
                <i className="fas fa-rocket"></i>
                <span>Comenzar Ahora</span>
              </button>
              
              <button className="border-2 border-white/30 text-white px-8 py-4 rounded-2xl font-semibold text-lg hover:bg-white/10 transition-all duration-300 flex items-center space-x-3">
                <i className="fas fa-chart-bar"></i>
                <span>Ver Más Estadísticas</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}