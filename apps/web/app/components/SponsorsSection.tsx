"use client";

import { useState, useEffect, useRef } from "react";
import { useLandingData } from "@/src/hooks/useLandingData";

export function SponsorsSection() {
  const [isVisible, setIsVisible] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const { sponsors: sponsorsFromApi } = useLandingData();

  const handleSmoothScroll = (targetId: string) => {
    const id = targetId.replace('#', '');
    const el = document.getElementById(id);
    if (el) {
      const offsetTop = el.offsetTop - 80;
      window.scrollTo({ top: offsetTop, behavior: 'smooth' });
    } else {
      // fallback: navegar con hash
      window.location.hash = targetId;
    }
  };

  // Datos de sponsors/patrocinadores (fallback estático si aún no hay en API)
  const sponsorsFallback = [
    {
      id: 1,
      name: "Nike Sports",
      category: "Equipamiento Deportivo",
      logo: "/images/placeholder.svg",
      description: "Proveedor oficial de equipamiento deportivo de alta calidad para nuestras instalaciones.",
      website: "https://nike.com",
      partnership: "Patrocinador Principal",
      since: "2020",
      tier: "platinum",
      benefits: ["Equipamiento exclusivo", "Eventos especiales", "Descuentos para miembros"]
    },
    {
      id: 2,
      name: "Gatorade",
      category: "Nutrición Deportiva",
      logo: "/images/placeholder.svg",
      description: "Bebidas energéticas y suplementos nutricionales para deportistas de alto rendimiento.",
      website: "https://gatorade.com",
      partnership: "Socio Estratégico",
      since: "2019",
      tier: "gold",
      benefits: ["Estaciones de hidratación", "Productos especializados", "Asesoría nutricional"]
    },
    {
      id: 3,
      name: "TechnoGym",
      category: "Tecnología Fitness",
      logo: "/images/placeholder.svg",
      description: "Equipos de gimnasio de última generación y tecnología fitness innovadora.",
      website: "https://technogym.com",
      partnership: "Proveedor Tecnológico",
      since: "2021",
      tier: "platinum",
      benefits: ["Equipos de alta calidad", "Mantenimiento especializado", "Actualizaciones tecnológicas"]
    },
    {
      id: 4,
      name: "Coca-Cola",
      category: "Bebidas Refrescantes",
      logo: "/images/placeholder.svg",
      description: "Refrescos y bebidas para el disfrute de nuestros visitantes en eventos especiales.",
      website: "https://coca-cola.com",
      partnership: "Sponsor Oficial",
      since: "2018",
      tier: "gold",
      benefits: ["Máquinas expendedoras", "Eventos corporativos", "Promociones especiales"]
    },
    {
      id: 5,
      name: "Under Armour",
      category: "Ropa Deportiva",
      logo: "/images/placeholder.svg",
      description: "Indumentaria deportiva de alta calidad para atletas y entusiastas del fitness.",
      website: "https://underarmour.com",
      partnership: "Patrocinador Textil",
      since: "2022",
      tier: "silver",
      benefits: ["Uniformes oficiales", "Colecciones exclusivas", "Descuentos corporativos"]
    },
    {
      id: 6,
      name: "Wilson Sports",
      category: "Implementos Deportivos",
      logo: "/images/placeholder.svg",
      description: "Pelotas, raquetas y implementos deportivos profesionales para todas nuestras disciplinas.",
      website: "https://wilson.com",
      partnership: "Proveedor Oficial",
      since: "2020",
      tier: "gold",
      benefits: ["Implementos profesionales", "Mantenimiento incluido", "Renovación periódica"]
    },
    {
      id: 7,
      name: "Red Bull",
      category: "Bebidas Energéticas",
      logo: "/images/placeholder.svg",
      description: "Energía y rendimiento para atletas de alto nivel en competencias y entrenamientos.",
      website: "https://redbull.com",
      partnership: "Sponsor de Eventos",
      since: "2021",
      tier: "platinum",
      benefits: ["Eventos exclusivos", "Competencias patrocinadas", "Marketing conjunto"]
    },
    {
      id: 8,
      name: "Samsung Electronics",
      category: "Tecnología",
      logo: "/images/placeholder.svg",
      description: "Displays, sistemas de audio y tecnología para mejorar la experiencia de nuestros usuarios.",
      website: "https://samsung.com",
      partnership: "Socio Tecnológico",
      since: "2019",
      tier: "platinum",
      benefits: ["Sistemas audiovisuales", "Displays informativos", "Soporte técnico"]
    }
  ];

  const sponsors = (sponsorsFromApi && sponsorsFromApi.length > 0)
    ? sponsorsFromApi.map((s) => ({
        id: s.id,
        name: s.name,
        category: s.category || '',
        logo: s.logoUrl || '',
        description: s.description || '',
        website: s.website || '',
        partnership: s.partnership || s.tier,
        since: s.since || '',
        tier: (s.tier || 'SILVER').toLowerCase(),
        benefits: s.benefits || [],
      }))
    : sponsorsFallback;

  // Colores alineados al resto de la landing (emerald/blue)
  const tierColors = {
    platinum: {
      gradient: "from-emerald-500 to-blue-600",
      border: "border-emerald-200",
      bg: "bg-emerald-50",
      text: "text-emerald-800",
      icon: "text-emerald-600"
    },
    gold: {
      gradient: "from-emerald-400 to-blue-500",
      border: "border-emerald-200",
      bg: "bg-emerald-50",
      text: "text-emerald-800",
      icon: "text-emerald-600"
    },
    silver: {
      gradient: "from-emerald-300 to-blue-400",
      border: "border-emerald-100",
      bg: "bg-emerald-50",
      text: "text-emerald-700",
      icon: "text-emerald-500"
    }
  };

  // Agrupar sponsors por slides (4 por slide)
  const sponsorsPerSlide = 4;
  const totalSlides = Math.ceil(sponsors.length / sponsorsPerSlide);
  const slides = Array.from({ length: totalSlides }, (_, index) =>
    sponsors.slice(index * sponsorsPerSlide, (index + 1) * sponsorsPerSlide)
  );

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

  // Auto-slide functionality
  useEffect(() => {
    if (!isPaused) {
      const interval = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % totalSlides);
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [totalSlides, isPaused]);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % totalSlides);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + totalSlides) % totalSlides);
  };

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  return (
    <section 
      ref={sectionRef} 
      className="py-16 sm:py-24 bg-gradient-to-br from-white via-gray-50 to-blue-50 relative overflow-hidden pb-20"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Background Elements */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-20 w-72 h-72 bg-blue-500 rounded-full filter blur-3xl"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500 rounded-full filter blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-emerald-500 rounded-full filter blur-3xl"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Section Header */}
        <div className={`text-center mb-20 transition-all duration-1000 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}>
          <div className="inline-flex items-center space-x-2 bg-blue-100 text-blue-800 rounded-full px-6 py-2 mb-6">
            <i className="fas fa-handshake text-blue-600"></i>
            <span className="font-semibold text-sm">Alianzas Estratégicas</span>
          </div>
          
          <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-6">
            Nuestros
            <span className="gradient-text block">Patrocinadores</span>
          </h2>
          
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Trabajamos junto a las mejores marcas del mundo deportivo para ofrecerte 
            una experiencia única y de alta calidad en cada visita.
          </p>
        </div>

        {/* Main Slider */}
        <div className={`relative transition-all duration-1000 delay-200 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}>
          <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/40 overflow-hidden">
            {/* Slider Container */}
            <div className="relative min-h-[340px] md:h-96 overflow-hidden">
              <div 
                className="flex transition-transform duration-500 ease-in-out h-full"
                style={{ transform: `translateX(-${currentSlide * 100}%)` }}
              >
                {slides.map((slide, slideIndex) => (
                  <div key={slideIndex} className="w-full flex-shrink-0 p-6 sm:p-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 h-full">
                      {slide.map((sponsor, index) => (
                        <div
                          key={sponsor.id}
                          className={`group relative bg-white/80 backdrop-blur-xs rounded-2xl p-4 sm:p-6 border ${tierColors[sponsor.tier as keyof typeof tierColors].border} hover:shadow-xl transition-all duration-300 hover:-translate-y-2 cursor-pointer`}
                          onClick={() => { if (sponsor.website) window.open(sponsor.website, '_blank', 'noopener,noreferrer'); }}
                          role="button"
                          aria-label={`Abrir sitio de ${sponsor.name}`}
                        >
                          {/* Tier Badge */}
                          <div className={`absolute -top-3 -right-3 w-8 h-8 bg-gradient-to-r ${tierColors[sponsor.tier as keyof typeof tierColors].gradient} rounded-full flex items-center justify-center`}>
                            <i className={`fas fa-crown text-xs ${tierColors[sponsor.tier as keyof typeof tierColors].icon}`}></i>
                          </div>

                          {/* Logo Placeholder */}
                          <div className="w-full h-20 sm:h-24 bg-gray-50 rounded-2xl mb-3 sm:mb-4 flex items-center justify-center overflow-hidden ring-1 ring-gray-100">
                            {sponsor.logo ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={sponsor.logo} alt={`Logo ${sponsor.name}`} className="max-h-12 sm:max-h-16 object-contain" />
                            ) : (
                              <span className="text-gray-500 font-bold text-sm">{sponsor.name}</span>
                            )}
                          </div>

                          {/* Sponsor Info */}
                          <div className="text-center">
                            <h3 className="font-bold text-gray-900 text-sm mb-1 line-clamp-1">
                              {sponsor.name}
                            </h3>
                            <p className="text-xs text-gray-600 mb-2">
                              {sponsor.category}
                            </p>
                            <div className={`inline-block px-2 py-0.5 sm:px-3 sm:py-1 ${tierColors[sponsor.tier as keyof typeof tierColors].bg} ${tierColors[sponsor.tier as keyof typeof tierColors].text} rounded-full text-[10px] sm:text-xs font-semibold shadow-sm`}>
                              {sponsor.partnership}
                            </div>
                          </div>

                          {/* Hover Overlay */}
                          <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/95 to-blue-700/95 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                            <div className="text-center text-white p-3 sm:p-4">
                              <i className="fas fa-external-link-alt text-xl sm:text-2xl mb-2 opacity-90"></i>
                              <p className="text-[11px] sm:text-xs leading-tight">
                                {sponsor.description}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Navigation Controls */}
            <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex items-center space-x-3">
              <button 
                onClick={prevSlide}
                className="hidden sm:flex w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full shadow-lg items-center justify-center text-gray-600 hover:text-blue-600 transition-colors duration-300"
              >
                <i className="fas fa-chevron-left"></i>
              </button>
              
              <div className="flex space-x-2">
                {slides.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => goToSlide(index)}
                    className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full transition-all duration-300 ${
                      index === currentSlide 
                        ? 'bg-gradient-to-r from-blue-500 to-purple-600 w-6 sm:w-8' 
                        : 'bg-gray-300 hover:bg-gray-400'
                    }`}
                  ></button>
                ))}
              </div>
              
              <button 
                onClick={nextSlide}
                className="hidden sm:flex w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full shadow-lg items-center justify-center text-gray-600 hover:text-blue-600 transition-colors duration-300"
              >
                <i className="fas fa-chevron-right"></i>
              </button>
            </div>
          </div>
        </div>

        {/* Sponsor Tiers Legend */}
        <div className={`mt-16 transition-all duration-1000 delay-400 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}>
          <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
            <h3 className="text-2xl font-bold text-gray-900 text-center mb-8">
              Niveles de Patrocinio
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-6 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl">
                <div className="w-16 h-16 bg-gradient-to-r from-gray-400 via-gray-300 to-gray-400 rounded-full flex items-center justify-center mx-auto mb-4">
                  <i className="fas fa-crown text-2xl text-gray-600"></i>
                </div>
                <h4 className="font-bold text-gray-900 mb-2">Platinum</h4>
                <p className="text-sm text-gray-600">Socios estratégicos principales con beneficios avanzados</p>
              </div>
              
              <div className="text-center p-6 bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-2xl">
                <div className="w-16 h-16 bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-400 rounded-full flex items-center justify-center mx-auto mb-4">
                  <i className="fas fa-medal text-2xl text-yellow-600"></i>
                </div>
                <h4 className="font-bold text-gray-900 mb-2">Gold</h4>
                <p className="text-sm text-gray-600">Patrocinadores oficiales con colaboración activa</p>
              </div>
              
              <div className="text-center p-6 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl">
                <div className="w-16 h-16 bg-gradient-to-r from-gray-300 via-gray-200 to-gray-300 rounded-full flex items-center justify-center mx-auto mb-4">
                  <i className="fas fa-star text-2xl text-gray-500"></i>
                </div>
                <h4 className="font-bold text-gray-900 mb-2">Silver</h4>
                <p className="text-sm text-gray-600">Colaboradores que apoyan nuestras actividades</p>
              </div>
            </div>
          </div>
        </div>

        {/* Partnership CTA */}
        <div className={`text-center mt-16 transition-all duration-1000 delay-600 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}>
          <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 rounded-3xl p-12 text-white relative overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 left-0 w-full h-full" style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M30 30c0-11.046-8.954-20-20-20s-20 8.954-20 20 8.954 20 20 20 20-8.954 20-20z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              }}></div>
            </div>

            <div className="relative">
              <h3 className="text-3xl md:text-4xl font-bold mb-6">
                ¿Quieres ser nuestro próximo patrocinador?
              </h3>
              <p className="text-xl text-white/90 mb-8 max-w-3xl mx-auto">
                Únete a las marcas líderes que confían en nosotros. Construyamos juntos 
                el futuro del deporte y lleguemos a miles de deportistas apasionados.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6">
                <button
                  onClick={() => handleSmoothScroll('#info')}
                  className="bg-white text-blue-600 px-8 py-4 rounded-2xl font-bold text-lg shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 flex items-center space-x-3">
                  <i className="fas fa-handshake"></i>
                  <span>Ser Patrocinador</span>
                </button>
                
                <button
                  onClick={() => handleSmoothScroll('#info')}
                  className="border-2 border-white/30 text-white px-8 py-4 rounded-2xl font-semibold text-lg hover:bg-white/10 transition-all duration-300 flex items-center space-x-3">
                  <i className="fas fa-download"></i>
                  <span>Descargar Propuesta</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
