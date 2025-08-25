"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  CalendarPlus, 
  Eye, 
  UserPlus, 
  ArrowRight, 
  Compass, 
  Info, 
  Calendar, 
  ChevronDown, 
  ChevronLeft, 
  ChevronRight 
} from 'lucide-react';

export function HeroSection() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const router = useRouter();

  const heroSlides = [
    {
      title: "Polideportivo Victoria Hernandez",
      subtitle: "Centro Deportivo Premium",
      description: "Vive la pasión del deporte en nuestras instalaciones de clase mundial. Reserva, entrena y compite en el mejor ambiente deportivo de la región.",
      image: "bg-gradient-to-br from-emerald-600 via-blue-600 to-purple-700",
      cta: "Reservar Ahora",
      secondaryCta: "Explorar Instalaciones",
      primaryAction: () => router.push('/dashboard/reservations/new'),
      secondaryAction: () => handleSmoothScroll('#instalaciones')
    },
    {
      title: "Instalaciones Modernas",
      subtitle: "Tecnología de Vanguardia",
      description: "Canchas sintéticas, iluminación LED, sistemas de climatización y la mejor tecnología para una experiencia deportiva incomparable.",
      image: "bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700",
      cta: "Ver Instalaciones",
      secondaryCta: "Conocer Más",
      primaryAction: () => handleSmoothScroll('#instalaciones'),
      secondaryAction: () => handleSmoothScroll('#info')
    },
    {
      title: "Comunidad Deportiva",
      subtitle: "Únete a Nosotros",
      description: "Más de 5,000 deportistas confían en nosotros. Torneos, clases dirigidas, entrenamiento personal y eventos que transforman vidas.",
      image: "bg-gradient-to-br from-orange-500 via-red-500 to-pink-600",
      cta: "Unirse Ahora",
      secondaryCta: "Ver Eventos",
      primaryAction: () => router.push('/auth/signin'),
      secondaryAction: () => handleSmoothScroll('#actividades')
    }
  ];

  // Función para navegación suave
  const handleSmoothScroll = (targetId: string) => {
    const targetElement = document.getElementById(targetId.substring(1));
    if (targetElement) {
      const offsetTop = targetElement.offsetTop - 80; // Account for fixed navbar height
      window.scrollTo({
        top: offsetTop,
        behavior: 'smooth'
      });
    }
  };

  useEffect(() => {
    setIsVisible(true);
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [heroSlides.length]);

  if (heroSlides.length === 0) {
    return null;
  }
  const idx = currentSlide % heroSlides.length;
  const currentHero = heroSlides[idx];
  if (!currentHero) {
    return null;
  }

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Animated Background */}
      <div className={`absolute inset-0 ${currentHero.image} animate-gradient transition-all duration-1000`}>
        {/* Overlay Pattern */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M30 30c0-11.046-8.954-20-20-20s-20 8.954-20 20 8.954 20 20 20 20-8.954 20-20zm0 0c0 11.046 8.954 20 20 20s20-8.954 20-20-8.954-20-20-20-20 8.954-20 20z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}></div>
        </div>
        
        {/* Floating Elements */}
        <div className="absolute top-20 left-20 w-32 h-32 bg-white/10 rounded-full animate-float"></div>
        <div className="absolute top-40 right-32 w-24 h-24 bg-white/5 rounded-full animate-float" style={{ animationDelay: '1s' }}></div>
        <div className="absolute bottom-32 left-1/4 w-40 h-40 bg-white/5 rounded-full animate-float" style={{ animationDelay: '2s' }}></div>
        <div className="absolute bottom-20 right-20 w-20 h-20 bg-white/10 rounded-full animate-float" style={{ animationDelay: '0.5s' }}></div>
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className={`transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          {/* Badge */}
          <div className="inline-flex items-center space-x-2 bg-white/20 backdrop-blur-sm border border-white/30 rounded-full px-6 py-2 mb-8 animate-pulse-glow">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
            <span className="text-white font-medium text-sm">🏆 Centro Deportivo #1 en Victoria Hernandez</span>
          </div>

          {/* Main Title */}
          <h1 className="text-responsive-xl font-black text-white mb-6 leading-tight">
            <span className="block">{currentHero.title}</span>
            <span className="block gradient-text-warm animate-gradient">
              {currentHero.subtitle}
            </span>
          </h1>

          {/* Description */}
          <p className="text-responsive-md text-white/90 mb-12 max-w-4xl mx-auto leading-relaxed font-light">
            {currentHero.description}
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6 mb-16">
            <button 
              onClick={currentHero.primaryAction}
              className="group bg-white text-gray-900 px-8 py-4 rounded-2xl font-bold text-lg shadow-2xl hover:shadow-glow transition-all duration-300 hover:scale-105 hover:-translate-y-1 flex items-center space-x-3"
            >
              {currentSlide === 0 ? <CalendarPlus className="h-5 w-5 text-emerald-600 group-hover:scale-110 transition-transform duration-300" /> : 
               currentSlide === 1 ? <Eye className="h-5 w-5 text-emerald-600 group-hover:scale-110 transition-transform duration-300" /> : 
               <UserPlus className="h-5 w-5 text-emerald-600 group-hover:scale-110 transition-transform duration-300" />}
              <span>{currentHero.cta}</span>
              <ArrowRight className="h-5 w-5 text-emerald-600 group-hover:translate-x-1 transition-transform duration-300" />
            </button>
            
            <button 
              onClick={currentHero.secondaryAction}
              className="group bg-transparent border-2 border-white/50 text-white px-8 py-4 rounded-2xl font-semibold text-lg hover:bg-white/10 hover:border-white transition-all duration-300 hover:scale-105 flex items-center space-x-3"
            >
              {currentSlide === 0 ? <Compass className="h-5 w-5 group-hover:scale-110 transition-transform duration-300" /> : 
               currentSlide === 1 ? <Info className="h-5 w-5 group-hover:scale-110 transition-transform duration-300" /> : 
               <Calendar className="h-5 w-5 group-hover:scale-110 transition-transform duration-300" />}
              <span>{currentHero.secondaryCta}</span>
            </button>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
            <div className="glass rounded-2xl p-6 text-center hover:scale-105 transition-transform duration-300">
              <div className="text-3xl font-bold text-white mb-2">15+</div>
              <div className="text-white/80 text-sm font-medium">Deportes Disponibles</div>
            </div>
            <div className="glass rounded-2xl p-6 text-center hover:scale-105 transition-transform duration-300">
              <div className="text-3xl font-bold text-white mb-2">5K+</div>
              <div className="text-white/80 text-sm font-medium">Miembros Activos</div>
            </div>
            <div className="glass rounded-2xl p-6 text-center hover:scale-105 transition-transform duration-300">
              <div className="text-3xl font-bold text-white mb-2">24/7</div>
              <div className="text-white/80 text-sm font-medium">Disponibilidad</div>
            </div>
            <div className="glass rounded-2xl p-6 text-center hover:scale-105 transition-transform duration-300">
              <div className="text-3xl font-bold text-white mb-2">10</div>
              <div className="text-white/80 text-sm font-medium">Años de Experiencia</div>
            </div>
          </div>
        </div>
      </div>

      {/* Slide Indicators */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex space-x-3 z-20">
        {heroSlides.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            className={`w-3 h-3 rounded-full transition-all duration-300 ${
              index === currentSlide 
                ? 'bg-white scale-125 shadow-glow' 
                : 'bg-white/50 hover:bg-white/75'
            }`}
          />
        ))}
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 right-8 animate-bounce">
        <div className="flex flex-col items-center space-y-2 text-white/80">
          <span className="text-sm font-medium">Explorar</span>
          <ChevronDown className="h-6 w-6" />
        </div>
      </div>

      {/* Navigation Arrows */}
      <button 
        onClick={() => setCurrentSlide((prev) => (prev - 1 + heroSlides.length) % heroSlides.length)}
        className="absolute left-8 top-1/2 transform -translate-y-1/2 w-12 h-12 bg-white/20 backdrop-blur-sm border border-white/30 rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-all duration-300 hover:scale-110 z-20"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      
      <button 
        onClick={() => setCurrentSlide((prev) => (prev + 1) % heroSlides.length)}
        className="absolute right-8 top-1/2 transform -translate-y-1/2 w-12 h-12 bg-white/20 backdrop-blur-sm border border-white/30 rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-all duration-300 hover:scale-110 z-20"
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      {/* Live Status Indicator */}
      <div className="absolute top-8 right-8 flex items-center space-x-2 bg-emerald-500/20 backdrop-blur-sm border border-emerald-500/30 rounded-full px-4 py-2 z-20">
        <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
        <span className="text-white text-sm font-medium">En Vivo</span>
      </div>
    </section>
  );
}