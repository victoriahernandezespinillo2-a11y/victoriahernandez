"use client";

import { useState, useEffect, useRef } from "react";

export function TestimonialsSection() {
  const [isVisible, setIsVisible] = useState(false);
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const sectionRef = useRef<HTMLElement>(null);

  const testimonials = [
    {
      id: 1,
      name: "María González",
      role: "Entrenadora Personal",
      company: "Fitness Pro",
      image: "/api/placeholder/80/80",
      rating: 5,
      text: "Las instalaciones de Polideportivo Oroquieta superaron todas mis expectativas. La calidad del equipamiento y la atención al cliente son excepcionales. Mis clientes siempre salen satisfechos de cada sesión.",
      sport: "Fitness & Entrenamiento",
      experience: "3 años como usuario",
      highlight: "Equipamiento de última generación"
    },
    {
      id: 2,
      name: "Carlos Rodríguez",
      role: "Capitán de Equipo",
      company: "Club Deportivo Los Leones",
      image: "/api/placeholder/80/80",
      rating: 5,
      text: "Llevamos entrenando aquí desde hace 2 años y la diferencia es notable. Las canchas están siempre en perfecto estado y el sistema de reservas es muy eficiente. Recomendado al 100%.",
      sport: "Fútbol",
      experience: "2 años como usuario",
      highlight: "Canchas en perfecto estado"
    },
    {
      id: 3,
      name: "Ana Martínez",
      role: "Nadadora Profesional",
      company: "Equipo Nacional",
      image: "/api/placeholder/80/80",
      rating: 5,
      text: "La piscina olímpica es de clase mundial. He entrenado en muchas instalaciones y esta definitivamente está entre las mejores. El ambiente es profesional y motivador.",
      sport: "Natación",
      experience: "1 año como usuario",
      highlight: "Instalaciones de clase mundial"
    },
    {
      id: 4,
      name: "Roberto Silva",
      role: "Empresario",
      company: "Silva & Asociados",
      image: "/api/placeholder/80/80",
      rating: 5,
      text: "Perfecto para desestresarme después del trabajo. Las clases grupales son excelentes y el personal siempre está dispuesto a ayudar. Es mi escape diario del estrés laboral.",
      sport: "Clases Grupales",
      experience: "6 meses como usuario",
      highlight: "Excelente para el bienestar"
    },
    {
      id: 5,
      name: "Laura Fernández",
      role: "Estudiante Universitaria",
      company: "Universidad Nacional",
      image: "/api/placeholder/80/80",
      rating: 5,
      text: "Los precios son muy accesibles para estudiantes y la calidad es increíble. He mejorado mucho mi condición física desde que empecé a venir. ¡Totalmente recomendado!",
      sport: "Gimnasio",
      experience: "8 meses como usuario",
      highlight: "Excelente relación calidad-precio"
    },
    {
      id: 6,
      name: "Diego Morales",
      role: "Entrenador de Básquet",
      company: "Academia Deportiva Elite",
      image: "/api/placeholder/80/80",
      rating: 5,
      text: "Las canchas de básquet son espectaculares. El sonido, la iluminación, todo está pensado para brindar la mejor experiencia. Mis jugadores han mejorado notablemente.",
      sport: "Básquetbol",
      experience: "4 años como usuario",
      highlight: "Instalaciones profesionales"
    }
  ];

  const stats = [
    { value: "4.9", label: "Calificación Promedio", icon: "fas fa-star" },
    { value: "98%", label: "Recomendarían", icon: "fas fa-thumbs-up" },
    { value: "2,500+", label: "Reseñas Positivas", icon: "fas fa-heart" },
    { value: "95%", label: "Retención de Clientes", icon: "fas fa-users" }
  ];

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

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const nextTestimonial = () => {
    setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
  };

  const prevTestimonial = () => {
    setCurrentTestimonial((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  const currentTest = testimonials[currentTestimonial];

  return (
    <section ref={sectionRef} className="py-24 bg-gradient-to-br from-gray-50 to-white relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-20 left-20 w-72 h-72 bg-purple-500 rounded-full filter blur-3xl"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-blue-500 rounded-full filter blur-3xl"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Section Header */}
        <div className={`text-center mb-20 transition-all duration-1000 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}>
          <div className="inline-flex items-center space-x-2 bg-purple-100 text-purple-800 rounded-full px-6 py-2 mb-6">
            <i className="fas fa-quote-left text-purple-600"></i>
            <span className="font-semibold text-sm">Testimonios Reales</span>
          </div>
          
          <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-6">
            Lo que dicen nuestros
            <span className="gradient-text block">Deportistas</span>
          </h2>
          
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Miles de personas han transformado su experiencia deportiva con nosotros. 
            Descubre por qué somos la primera opción en la región.
          </p>
        </div>

        {/* Stats Row */}
        <div className={`grid grid-cols-2 md:grid-cols-4 gap-6 mb-16 transition-all duration-1000 delay-200 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}>
          {stats.map((stat, index) => (
            <div key={index} className="text-center bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                <i className={`${stat.icon} text-white text-lg`}></i>
              </div>
              <div className="text-2xl font-black text-gray-900 mb-1">{stat.value}</div>
              <div className="text-sm text-gray-600">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Main Testimonial */}
        <div className={`transition-all duration-1000 delay-400 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}>
          <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12 border border-gray-100 relative overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute top-0 right-0 w-64 h-64 opacity-5">
              <div className="w-full h-full bg-gradient-to-br from-purple-500 to-blue-600 rounded-full transform translate-x-32 -translate-y-32"></div>
            </div>

            <div className="relative">
              {/* Quote Icon */}
              <div className="absolute -top-4 -left-4 w-16 h-16 bg-gradient-to-r from-purple-500 to-blue-600 rounded-2xl flex items-center justify-center">
                <i className="fas fa-quote-left text-white text-2xl"></i>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
                {/* Testimonial Content */}
                <div className="lg:col-span-2">
                  {/* Rating */}
                  <div className="flex items-center space-x-1 mb-6">
                    {[...Array(currentTest.rating)].map((_, i) => (
                      <i key={i} className="fas fa-star text-yellow-500 text-lg"></i>
                    ))}
                    <span className="ml-2 text-gray-600 font-semibold">{currentTest.rating}.0</span>
                  </div>

                  {/* Testimonial Text */}
                  <blockquote className="text-xl md:text-2xl text-gray-800 leading-relaxed mb-8 font-medium">
                    "{currentTest.text}"
                  </blockquote>

                  {/* Highlight */}
                  <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-2xl p-4 mb-6">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-gradient-to-r from-purple-500 to-blue-600 rounded-full"></div>
                      <span className="text-gray-700 font-semibold">{currentTest.highlight}</span>
                    </div>
                  </div>

                  {/* Author Info */}
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-gray-200 to-gray-400 rounded-2xl flex items-center justify-center">
                      <i className="fas fa-user text-2xl text-gray-600"></i>
                    </div>
                    <div>
                      <div className="font-bold text-gray-900 text-lg">{currentTest.name}</div>
                      <div className="text-gray-600">{currentTest.role}</div>
                      <div className="text-sm text-gray-500">{currentTest.company}</div>
                    </div>
                  </div>
                </div>

                {/* Side Info */}
                <div className="space-y-6">
                  {/* Sport Badge */}
                  <div className="bg-gradient-to-r from-purple-500 to-blue-600 rounded-2xl p-6 text-white text-center">
                    <i className="fas fa-medal text-3xl mb-4"></i>
                    <div className="font-bold text-lg mb-2">{currentTest.sport}</div>
                    <div className="text-sm opacity-90">{currentTest.experience}</div>
                  </div>

                  {/* Navigation */}
                  <div className="flex items-center justify-between bg-gray-50 rounded-2xl p-4">
                    <button 
                      onClick={prevTestimonial}
                      className="w-12 h-12 bg-white rounded-xl shadow-md flex items-center justify-center text-gray-600 hover:text-purple-600 transition-colors duration-300"
                    >
                      <i className="fas fa-chevron-left"></i>
                    </button>
                    
                    <div className="flex space-x-2">
                      {testimonials.map((_, index) => (
                        <button
                          key={index}
                          onClick={() => setCurrentTestimonial(index)}
                          className={`w-3 h-3 rounded-full transition-all duration-300 ${
                            index === currentTestimonial 
                              ? 'bg-gradient-to-r from-purple-500 to-blue-600 w-8' 
                              : 'bg-gray-300 hover:bg-gray-400'
                          }`}
                        ></button>
                      ))}
                    </div>
                    
                    <button 
                      onClick={nextTestimonial}
                      className="w-12 h-12 bg-white rounded-xl shadow-md flex items-center justify-center text-gray-600 hover:text-purple-600 transition-colors duration-300"
                    >
                      <i className="fas fa-chevron-right"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Testimonials Grid */}
        <div className={`mt-16 transition-all duration-1000 delay-600 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.slice(0, 3).map((testimonial, index) => (
              <div key={testimonial.id} className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <div className="flex items-center space-x-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <i key={i} className="fas fa-star text-yellow-500 text-sm"></i>
                  ))}
                </div>
                
                <p className="text-gray-700 text-sm leading-relaxed mb-4 line-clamp-3">
                  "{testimonial.text}"
                </p>
                
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-gray-200 to-gray-400 rounded-xl flex items-center justify-center">
                    <i className="fas fa-user text-gray-600"></i>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 text-sm">{testimonial.name}</div>
                    <div className="text-xs text-gray-500">{testimonial.sport}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className={`text-center mt-16 transition-all duration-1000 delay-800 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}>
          <div className="bg-gradient-to-r from-purple-500 to-blue-600 rounded-3xl p-8 text-white">
            <h3 className="text-2xl font-bold mb-4">
              ¿Quieres ser el próximo en compartir tu experiencia?
            </h3>
            <p className="text-lg text-white/90 mb-6">
              Únete a nuestra comunidad y descubre por qué somos la primera opción
            </p>
            <button className="bg-white text-purple-600 px-8 py-3 rounded-2xl font-bold hover:shadow-lg transition-all duration-300 hover:scale-105">
              Comenzar Mi Experiencia
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}