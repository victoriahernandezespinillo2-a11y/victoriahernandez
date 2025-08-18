"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export function CTASection() {
  const [isVisible, setIsVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const router = useRouter();

  const benefits = [
    {
      icon: 'fas fa-clock',
      title: 'Reservas 24/7',
      description: 'Sistema disponible las 24 horas'
    },
    {
      icon: 'fas fa-mobile-alt',
      title: 'App Móvil',
      description: 'Control total desde tu smartphone'
    },
    {
      icon: 'fas fa-credit-card',
      title: 'Pagos Seguros',
      description: 'Múltiples métodos de pago'
    },
    {
      icon: 'fas fa-headset',
      title: 'Soporte 24/7',
      description: 'Atención personalizada siempre'
    }
  ];

  const plans = [
    {
      name: 'Básico',
      price: '50.000',
      period: '/mes',
      description: 'Perfecto para comenzar',
      features: [
        'Acceso al gimnasio',
        '2 reservas de cancha/mes',
        'Clases grupales básicas',
        'App móvil incluida'
      ],
      color: 'from-blue-500 to-indigo-600',
      popular: false
    },
    {
      name: 'Premium',
      price: '80.000',
      period: '/mes',
      description: 'La opción más popular',
      features: [
        'Acceso completo a instalaciones',
        'Reservas ilimitadas',
        'Todas las clases grupales',
        'Entrenador personal 2h/mes',
        'Descuentos en eventos',
        'Invitado gratis/mes'
      ],
      color: 'from-emerald-500 to-green-600',
      popular: true
    },
    {
      name: 'Elite',
      price: '120.000',
      period: '/mes',
      description: 'Experiencia VIP completa',
      features: [
        'Acceso VIP a todas las áreas',
        'Reservas prioritarias',
        'Entrenador personal 8h/mes',
        'Nutricionista incluido',
        'Casillero personal',
        'Toallas y amenities',
        'Invitados ilimitados'
      ],
      color: 'from-purple-500 to-pink-600',
      popular: false
    }
  ];

  const urgencyFactors = [
    {
      icon: 'fas fa-fire',
      text: '¡Solo quedan 15 cupos disponibles este mes!',
      color: 'text-red-500'
    },
    {
      icon: 'fas fa-gift',
      text: 'Primer mes GRATIS para nuevos miembros',
      color: 'text-green-500'
    },
    {
      icon: 'fas fa-clock',
      text: 'Oferta válida hasta fin de mes',
      color: 'text-orange-500'
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setIsSubmitting(false);
    setEmail('');
    alert('¡Gracias! Te contactaremos pronto.');
  };

  // Función para manejar selección de planes
  const handlePlanSelection = (planName: string) => {
    // Redirigir a la página de registro con el plan seleccionado
    router.push(`/auth/signin?plan=${planName.toLowerCase()}`);
  };

  // Función para navegación suave
  const handleSmoothScroll = (targetId: string) => {
    const targetElement = document.getElementById(targetId.substring(1));
    if (targetElement) {
      const offsetTop = targetElement.offsetTop - 80;
      window.scrollTo({
        top: offsetTop,
        behavior: 'smooth'
      });
    }
  };

  return (
    <section ref={sectionRef} className="py-24 bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0">
        {/* Animated Background */}
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute top-20 left-20 w-96 h-96 bg-blue-500/20 rounded-full filter blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-20 w-80 h-80 bg-purple-500/20 rounded-full filter blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-emerald-500/20 rounded-full filter blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        </div>
        
        {/* Grid Pattern */}
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Urgency Alerts */}
        <div className={`flex flex-wrap justify-center gap-4 mb-12 transition-all duration-1000 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}>
          {urgencyFactors.map((factor, index) => (
            <div key={index} className="bg-white/10 backdrop-blur-sm rounded-2xl px-6 py-3 border border-white/20">
              <div className="flex items-center space-x-3">
                <i className={`${factor.icon} ${factor.color} animate-pulse`}></i>
                <span className="text-white font-semibold text-sm">{factor.text}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Main CTA Header */}
        <div className={`text-center mb-16 transition-all duration-1000 delay-200 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}>
          <div className="inline-flex items-center space-x-2 bg-emerald-500/20 backdrop-blur-sm text-emerald-300 rounded-full px-6 py-2 mb-6 border border-emerald-500/30">
            <i className="fas fa-rocket text-emerald-400"></i>
            <span className="font-semibold text-sm">¡Comienza Hoy Mismo!</span>
          </div>
          
          <h2 className="text-4xl md:text-6xl font-black text-white mb-6 leading-tight">
            Transforma tu vida
            <span className="gradient-text block">deportiva ahora</span>
          </h2>
          
          <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed mb-8">
            No esperes más para alcanzar tus objetivos. Únete a la comunidad deportiva 
            más grande de la región y descubre todo tu potencial.
          </p>

          {/* Quick Benefits */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {benefits.map((benefit, index) => (
              <div key={index} className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
                <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-blue-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <i className={`${benefit.icon} text-white text-lg`}></i>
                </div>
                <h3 className="text-white font-bold text-sm mb-1">{benefit.title}</h3>
                <p className="text-gray-300 text-xs">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Pricing Plans */}
        <div className={`mb-16 transition-all duration-1000 delay-400 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}>
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-white mb-4">
              Elige el plan perfecto para ti
            </h3>
            <p className="text-gray-300 max-w-2xl mx-auto">
              Todos nuestros planes incluyen acceso completo a la plataforma digital y soporte 24/7
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {plans.map((plan, index) => (
              <div
                key={index}
                className={`relative bg-white/10 backdrop-blur-sm rounded-3xl p-8 border border-white/20 hover:bg-white/20 transition-all duration-500 hover:-translate-y-2 ${
                  plan.popular ? 'ring-2 ring-emerald-500 scale-105' : ''
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <div className="bg-gradient-to-r from-emerald-500 to-green-600 text-white px-6 py-2 rounded-full text-sm font-bold">
                      Más Popular
                    </div>
                  </div>
                )}

                <div className="text-center mb-8">
                  <h4 className="text-2xl font-bold text-white mb-2">{plan.name}</h4>
                  <p className="text-gray-300 text-sm mb-4">{plan.description}</p>
                  <div className="flex items-baseline justify-center">
                    <span className="text-4xl font-black text-white">${plan.price}</span>
                    <span className="text-gray-300 ml-1">{plan.period}</span>
                  </div>
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center space-x-3">
                      <div className={`w-5 h-5 bg-gradient-to-r ${plan.color} rounded-full flex items-center justify-center flex-shrink-0`}>
                        <i className="fas fa-check text-white text-xs"></i>
                      </div>
                      <span className="text-gray-300 text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button 
                  onClick={() => handlePlanSelection(plan.name)}
                  className={`w-full bg-gradient-to-r ${plan.color} text-white py-4 rounded-2xl font-bold text-lg hover:shadow-2xl transition-all duration-300 hover:scale-105 flex items-center justify-center space-x-2`}
                >
                  <i className={`fas ${plan.popular ? 'fa-rocket' : 'fa-check'}`}></i>
                  <span>{plan.popular ? 'Comenzar Ahora' : 'Seleccionar Plan'}</span>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Contact Form */}
        <div className={`transition-all duration-1000 delay-600 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}>
          <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-8 md:p-12 border border-white/20 max-w-4xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              {/* Left Side - Info */}
              <div>
                <h3 className="text-3xl font-bold text-white mb-4">
                  ¿Tienes dudas? ¡Hablemos!
                </h3>
                <p className="text-gray-300 mb-6 leading-relaxed">
                  Nuestro equipo de expertos está listo para ayudarte a encontrar 
                  la mejor opción para tus necesidades deportivas.
                </p>
                
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-blue-600 rounded-xl flex items-center justify-center">
                      <i className="fas fa-phone text-white"></i>
                    </div>
                    <div>
                      <div className="text-white font-semibold">+57 300 123 4567</div>
                      <div className="text-gray-300 text-sm">Lun - Dom: 6:00 AM - 10:00 PM</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-blue-600 rounded-xl flex items-center justify-center">
                      <i className="fas fa-envelope text-white"></i>
                    </div>
                    <div>
                      <div className="text-white font-semibold">info@polideportivovictoriahernandez.com</div>
                      <div className="text-gray-300 text-sm">Respuesta en menos de 2 horas</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-blue-600 rounded-xl flex items-center justify-center">
                      <i className="fas fa-map-marker-alt text-white"></i>
                    </div>
                    <div>
                      <div className="text-white font-semibold">Calle 123 #45-67, Victoria Hernandez</div>
                      <div className="text-gray-300 text-sm">A 5 min del centro de la ciudad</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Side - Form */}
              <div>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <input
                      type="text"
                      placeholder="Tu nombre"
                      className="w-full px-4 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      required
                    />
                    <input
                      type="tel"
                      placeholder="Tu teléfono"
                      className="w-full px-4 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      required
                    />
                  </div>
                  
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Tu email"
                    className="w-full px-4 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    required
                  />
                  
                  <select className="w-full px-4 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent">
                    <option value="" className="text-gray-900">Selecciona tu interés</option>
                    <option value="gimnasio" className="text-gray-900">Gimnasio y Fitness</option>
                    <option value="canchas" className="text-gray-900">Canchas Deportivas</option>
                    <option value="natacion" className="text-gray-900">Natación</option>
                    <option value="clases" className="text-gray-900">Clases Grupales</option>
                    <option value="todos" className="text-gray-900">Todas las instalaciones</option>
                  </select>
                  
                  <textarea
                    placeholder="Cuéntanos sobre tus objetivos deportivos..."
                    rows={3}
                    className="w-full px-4 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
                  ></textarea>
                  
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-gradient-to-r from-emerald-500 to-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:shadow-2xl transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-3"
                  >
                    {isSubmitting ? (
                      <>
                        <i className="fas fa-spinner animate-spin"></i>
                        <span>Enviando...</span>
                      </>
                    ) : (
                      <>
                        <i className="fas fa-paper-plane"></i>
                        <span>¡Quiero comenzar ahora!</span>
                      </>
                    )}
                  </button>
                </form>
                
                <p className="text-gray-400 text-xs text-center mt-4">
                  Al enviar este formulario aceptas nuestros términos y condiciones. 
                  Te contactaremos en menos de 24 horas.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Final CTA */}
        <div className={`text-center mt-16 transition-all duration-1000 delay-800 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}>
          <div className="max-w-3xl mx-auto">
            <h3 className="text-3xl md:text-4xl font-bold text-white mb-6">
              Tu mejor versión te está esperando
            </h3>
            <p className="text-xl text-gray-300 mb-8">
              Más de 5,000 personas ya han transformado su vida con nosotros. 
              ¡Es tu turno de brillar!
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6">
              <button 
                onClick={() => router.push('/dashboard/reservations/new')}
                className="bg-gradient-to-r from-emerald-500 to-blue-600 text-white px-10 py-5 rounded-2xl font-bold text-xl shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-105 flex items-center space-x-3"
              >
                <i className="fas fa-rocket"></i>
                <span>Reservar Ahora</span>
              </button>
              
              <button 
                onClick={() => handleSmoothScroll('#info')}
                className="border-2 border-white/50 text-white px-10 py-5 rounded-2xl font-semibold text-xl hover:bg-white/10 transition-all duration-300 flex items-center space-x-3"
              >
                <i className="fas fa-calendar-alt"></i>
                <span>Agendar Visita</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}