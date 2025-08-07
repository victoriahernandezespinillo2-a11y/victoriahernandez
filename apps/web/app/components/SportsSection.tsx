"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export function SportsSection() {
  const [isVisible, setIsVisible] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const sectionRef = useRef<HTMLElement>(null);
  const router = useRouter();

  const handleReserveNow = () => {
    router.push('/dashboard/reservations/new');
  };

  const sportsCategories = [
    {
      id: "canchas",
      name: "Canchas Deportivas",
      icon: "fas fa-futbol",
      color: "from-green-500 to-emerald-600"
    },
    {
      id: "gimnasio",
      name: "Gimnasio & Fitness",
      icon: "fas fa-dumbbell",
      color: "from-blue-500 to-indigo-600"
    },
    {
      id: "acuaticos",
      name: "Deportes Acuáticos",
      icon: "fas fa-swimmer",
      color: "from-cyan-500 to-blue-600"
    },
    {
      id: "indoor",
      name: "Deportes Indoor",
      icon: "fas fa-table-tennis",
      color: "from-purple-500 to-pink-600"
    }
  ];

  const sportsData = {
    canchas: [
      {
        name: "Fútbol 11",
        image: "/api/placeholder/400/300",
        description: "Cancha de césped sintético de última generación con iluminación LED profesional.",
        features: ["Césped sintético premium", "Iluminación LED", "Gradas para 200 personas", "Vestuarios equipados"],
        price: "$80.000/hora",
        availability: "Disponible",
        rating: 4.9
      },
      {
        name: "Fútbol 7",
        image: "/api/placeholder/400/300",
        description: "Perfecta para partidos más dinámicos con amigos o entrenamientos técnicos.",
        features: ["Superficie antideslizante", "Portería reglamentaria", "Iluminación nocturna", "Área de descanso"],
        price: "$50.000/hora",
        availability: "Disponible",
        rating: 4.8
      },
      {
        name: "Básquetbol",
        image: "/api/placeholder/400/300",
        description: "Cancha reglamentaria con tableros profesionales y superficie de alto rendimiento.",
        features: ["Tableros profesionales", "Superficie deportiva", "Marcador electrónico", "Gradas laterales"],
        price: "$45.000/hora",
        availability: "Ocupado hasta 18:00",
        rating: 4.7
      }
    ],
    gimnasio: [
      {
        name: "Sala de Pesas",
        image: "/api/placeholder/400/300",
        description: "Equipamiento completo con máquinas de última tecnología y pesas libres.",
        features: ["Equipos Technogym", "Aire acondicionado", "Música ambiental", "Entrenador disponible"],
        price: "$25.000/día",
        availability: "Disponible",
        rating: 4.9
      },
      {
        name: "Sala Cardio",
        image: "/api/placeholder/400/300",
        description: "Zona especializada en ejercicio cardiovascular con equipos de alta gama.",
        features: ["Caminadoras premium", "Bicicletas estáticas", "Elípticas", "Monitores cardíacos"],
        price: "$20.000/día",
        availability: "Disponible",
        rating: 4.8
      },
      {
        name: "Clases Grupales",
        image: "/api/placeholder/400/300",
        description: "Espacio amplio para yoga, pilates, aeróbicos y entrenamientos funcionales.",
        features: ["Espejos profesionales", "Sistema de sonido", "Colchonetas incluidas", "Instructor certificado"],
        price: "$15.000/clase",
        availability: "Próxima clase: 19:00",
        rating: 4.9
      }
    ],
    acuaticos: [
      {
        name: "Piscina Olímpica",
        image: "/api/placeholder/400/300",
        description: "Piscina de 50 metros con 8 carriles para natación profesional y recreativa.",
        features: ["50m x 8 carriles", "Sistema de filtrado", "Cronómetro digital", "Salvavidas certificado"],
        price: "$30.000/hora",
        availability: "Disponible",
        rating: 4.8
      },
      {
        name: "Piscina Recreativa",
        image: "/api/placeholder/400/300",
        description: "Ideal para familias y actividades acuáticas recreativas.",
        features: ["Área infantil", "Tobogán", "Zona de descanso", "Bar acuático"],
        price: "$20.000/día",
        availability: "Disponible",
        rating: 4.7
      }
    ],
    indoor: [
      {
        name: "Tenis de Mesa",
        image: "/api/placeholder/400/300",
        description: "Mesas profesionales en ambiente climatizado para competencias y recreación.",
        features: ["Mesas reglamentarias", "Iluminación óptima", "Raquetas disponibles", "Área de espectadores"],
        price: "$25.000/hora",
        availability: "Disponible",
        rating: 4.6
      },
      {
        name: "Squash",
        image: "/api/placeholder/400/300",
        description: "Cancha profesional de squash con paredes de cristal templado.",
        features: ["Paredes de cristal", "Suelo profesional", "Raquetas incluidas", "Sistema de ventilación"],
        price: "$35.000/hora",
        availability: "Disponible",
        rating: 4.8
      }
    ]
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
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

  const currentSports = sportsData[sportsCategories[activeTab].id as keyof typeof sportsData];

  return (
    <section ref={sectionRef} className="py-24 bg-white relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-40 left-10 w-64 h-64 bg-green-500 rounded-full filter blur-3xl"></div>
        <div className="absolute bottom-40 right-10 w-80 h-80 bg-blue-500 rounded-full filter blur-3xl"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Section Header */}
        <div className={`text-center mb-16 transition-all duration-1000 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}>
          <div className="inline-flex items-center space-x-2 bg-green-100 text-green-800 rounded-full px-6 py-2 mb-6">
            <i className="fas fa-medal text-green-600"></i>
            <span className="font-semibold text-sm">Instalaciones Deportivas</span>
          </div>
          
          <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-6">
            Descubre nuestras
            <span className="gradient-text block">Instalaciones Premium</span>
          </h2>
          
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Desde canchas de fútbol hasta gimnasios completamente equipados, 
            tenemos todo lo que necesitas para alcanzar tus objetivos deportivos.
          </p>
        </div>

        {/* Category Tabs */}
        <div className={`flex flex-wrap justify-center mb-12 transition-all duration-1000 delay-200 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}>
          <div className="bg-gray-100 rounded-2xl p-2 flex flex-wrap gap-2">
            {sportsCategories.map((category, index) => (
              <button
                key={category.id}
                onClick={() => setActiveTab(index)}
                className={`flex items-center space-x-3 px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                  activeTab === index
                    ? `bg-gradient-to-r ${category.color} text-white shadow-lg scale-105`
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white'
                }`}
              >
                <i className={category.icon}></i>
                <span className="hidden sm:inline">{category.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Sports Grid */}
        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 transition-all duration-1000 delay-400 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}>
          {currentSports.map((sport, index) => (
            <div
              key={index}
              className="group bg-white rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 overflow-hidden border border-gray-100"
            >
              {/* Image */}
              <div className="relative h-48 bg-gradient-to-br from-gray-200 to-gray-300 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center">
                  <i className={`${sportsCategories[activeTab].icon} text-6xl text-white opacity-50`}></i>
                </div>
                
                {/* Availability Badge */}
                <div className="absolute top-4 left-4">
                  <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    sport.availability === 'Disponible' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-orange-100 text-orange-800'
                  }`}>
                    {sport.availability}
                  </div>
                </div>

                {/* Rating */}
                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg px-2 py-1 flex items-center space-x-1">
                  <i className="fas fa-star text-yellow-500 text-xs"></i>
                  <span className="text-xs font-semibold text-gray-900">{sport.rating}</span>
                </div>

                {/* Hover Overlay */}
                <div className={`absolute inset-0 bg-gradient-to-br ${sportsCategories[activeTab].color} opacity-0 group-hover:opacity-80 transition-opacity duration-300 flex items-center justify-center`}>
                  <button className="bg-white text-gray-900 px-6 py-3 rounded-xl font-semibold transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                    Ver Detalles
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xl font-bold text-gray-900">{sport.name}</h3>
                  <div className={`text-lg font-bold bg-gradient-to-r ${sportsCategories[activeTab].color} bg-clip-text text-transparent`}>
                    {sport.price}
                  </div>
                </div>
                
                <p className="text-gray-600 text-sm leading-relaxed mb-4">
                  {sport.description}
                </p>

                {/* Features */}
                <div className="space-y-2 mb-6">
                  {sport.features.slice(0, 3).map((feature, featureIndex) => (
                    <div key={featureIndex} className="flex items-center space-x-2 text-sm text-gray-700">
                      <div className={`w-2 h-2 bg-gradient-to-r ${sportsCategories[activeTab].color} rounded-full`}></div>
                      <span>{feature}</span>
                    </div>
                  ))}
                  {sport.features.length > 3 && (
                    <div className="text-xs text-gray-500 ml-4">
                      +{sport.features.length - 3} características más
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-3">
                  <button 
                    onClick={handleReserveNow}
                    className={`flex-1 bg-gradient-to-r ${sportsCategories[activeTab].color} text-white py-3 rounded-xl font-semibold text-sm hover:shadow-lg transition-all duration-300 hover:scale-105`}
                  >
                    Reservar Ahora
                  </button>
                  <button className="px-4 py-3 border border-gray-200 rounded-xl text-gray-600 hover:text-gray-900 hover:border-gray-300 transition-colors duration-300">
                    <i className="fas fa-heart"></i>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Stats */}
        <div className={`mt-20 transition-all duration-1000 delay-600 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}>
          <div className="bg-gradient-to-r from-gray-50 to-white rounded-3xl p-8 border border-gray-100">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              <div>
                <div className="text-3xl font-black text-gray-900 mb-2">15+</div>
                <div className="text-sm text-gray-600">Instalaciones Deportivas</div>
              </div>
              <div>
                <div className="text-3xl font-black text-gray-900 mb-2">24/7</div>
                <div className="text-sm text-gray-600">Disponibilidad</div>
              </div>
              <div>
                <div className="text-3xl font-black text-gray-900 mb-2">98%</div>
                <div className="text-sm text-gray-600">Satisfacción</div>
              </div>
              <div>
                <div className="text-3xl font-black text-gray-900 mb-2">5000+</div>
                <div className="text-sm text-gray-600">Usuarios Activos</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}