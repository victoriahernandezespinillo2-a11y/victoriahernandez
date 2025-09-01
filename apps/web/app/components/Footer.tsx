"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

export function Footer() {
  const pathname = usePathname();
  const currentYear = new Date().getFullYear();
  const [isVisible, setIsVisible] = useState(false);
  // Evitar hidratación no determinista: inicializar tras montar
  const [mounted, setMounted] = useState(false);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [email, setEmail] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);

  // Determinar si estamos en una ruta del dashboard
  const isDashboardRoute = pathname && (
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/reservas') ||
    pathname.startsWith('/nueva-reserva') ||
    pathname.startsWith('/actividades') ||
    pathname.startsWith('/perfil') ||
    pathname.startsWith('/admin')
  );

  // Marcar componente montado y configurar reloj
  useEffect(() => {
    setMounted(true);
    setCurrentTime(new Date());
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Scroll to top functionality
  useEffect(() => {
    const toggleVisibility = () => {
      if (window.pageYOffset > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility);
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setIsSubscribed(true);
      setEmail('');
      setTimeout(() => setIsSubscribed(false), 3000);
    }
  };

  const getCurrentStatus = () => {
    const now = currentTime ?? new Date();
    const hour = now.getHours();
    if (hour >= 6 && hour < 22) {
      return { status: 'Abierto', color: 'text-green-400', icon: 'fas fa-circle' };
    }
    return { status: 'Cerrado', color: 'text-red-400', icon: 'fas fa-circle' };
  };

  const footerSections = [
    {
      title: "Deportes & Instalaciones",
      icon: "fas fa-dumbbell",
      links: [
        { label: "Fútbol", href: "#futbol", icon: "fas fa-futbol", badge: "Popular" },
        { label: "Baloncesto", href: "#baloncesto", icon: "fas fa-basketball-ball" },
        { label: "Tenis", href: "#tenis", icon: "fas fa-table-tennis", badge: "Nuevo" },
        { label: "Gimnasio", href: "#gimnasio", icon: "fas fa-dumbbell" },
        { label: "Piscina", href: "#piscina", icon: "fas fa-swimmer", badge: "Premium" },
        { label: "Yoga & Pilates", href: "#yoga", icon: "fas fa-leaf" },
        { label: "Crossfit", href: "#crossfit", icon: "fas fa-fire" }
      ]
    },
    {
      title: "Servicios Digitales",
      icon: "fas fa-mobile-alt",
      links: [
        { label: "App Móvil", href: "#app", icon: "fas fa-mobile-alt", badge: "Gratis" },
        { label: "Reservas Online", href: "#reservas", icon: "fas fa-calendar-check" },
        { label: "Clases Virtuales", href: "#virtual", icon: "fas fa-video", badge: "Live" },
        { label: "Entrenamiento Personal", href: "#entrenamiento", icon: "fas fa-user-tie" },
        { label: "Nutrición Online", href: "#nutricion", icon: "fas fa-apple-alt" },
        { label: "Seguimiento Fitness", href: "#tracking", icon: "fas fa-chart-line" }
      ]
    },
    {
      title: "Información",
      icon: "fas fa-info-circle",
      links: [
        { label: "Sobre Nosotros", href: "#sobre", icon: "fas fa-building" },
        { label: "Horarios", href: "#horarios", icon: "fas fa-clock" },
        { label: "Membresías", href: "#membresias", icon: "fas fa-crown", badge: "Ofertas" },
        { label: "Reglamentos", href: "#reglamentos", icon: "fas fa-file-alt" },
        { label: "Blog Deportivo", href: "#blog", icon: "fas fa-blog" },
        { label: "Testimonios", href: "#testimonios", icon: "fas fa-star" },
        { label: "FAQ", href: "#faq", icon: "fas fa-question-circle" }
      ]
    }
  ];

  const contactInfo = {
    address: "Calle Principal #123, Victoria Hernandez, Andalucía, España",
    phone: "+34 (123) 456-7890",
    whatsapp: "+34 123 456 7890",
    email: "info@polideportivovictoriahernandez.com",
    hours: "Lunes a Domingo: 6:00 AM - 10:00 PM",
    emergency: "+34 (123) 456-7891"
  };

  const socialLinks = [
    { icon: "fab fa-facebook-f", href: "https://facebook.com/polideportivovictoriahernandez", label: "Facebook", color: "hover:text-blue-600", followers: "12.5K" },
    { icon: "fab fa-instagram", href: "https://instagram.com/polideportivovictoriahernandez", label: "Instagram", color: "hover:text-pink-600", followers: "8.2K" },
    { icon: "fab fa-twitter", href: "https://twitter.com/polideportivovictoriahernandez", label: "Twitter", color: "hover:text-blue-400", followers: "5.1K" },
    { icon: "fab fa-youtube", href: "https://youtube.com/polideportivovictoriahernandez", label: "YouTube", color: "hover:text-red-600", followers: "3.8K" },
    { icon: "fab fa-tiktok", href: "https://tiktok.com/@polideportivovictoriahernandez", label: "TikTok", color: "hover:text-gray-900", followers: "15.2K" },
    { icon: "fab fa-linkedin-in", href: "https://linkedin.com/company/polideportivovictoriahernandez", label: "LinkedIn", color: "hover:text-blue-700", followers: "2.1K" }
  ];

  const quickActions = [
    { icon: "fas fa-calendar-plus", label: "Reservar Ahora", href: "#reservas", color: "from-emerald-500 to-green-600" },
    { icon: "fas fa-mobile-alt", label: "Descargar App", href: "#app", color: "from-blue-500 to-indigo-600" },
    { icon: "fab fa-whatsapp", label: "WhatsApp", href: `https://wa.me/34${contactInfo.whatsapp.replace(/\D/g, '')}`, color: "from-green-500 to-emerald-600" },
    { icon: "fas fa-map-marker-alt", label: "Ubicación", href: "#mapa", color: "from-orange-500 to-red-600" }
  ];

  return (
    <footer className={`bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white relative overflow-hidden ${
      isDashboardRoute ? 'hidden md:block' : ''
    }`}>
      {/* Enhanced Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='40' cy='40' r='2'/%3E%3Ccircle cx='20' cy='20' r='1'/%3E%3Ccircle cx='60' cy='60' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")"
        }}></div>
      </div>

      {/* Floating Elements */}
      <div className="absolute top-10 left-10 w-20 h-20 bg-emerald-500/10 rounded-full blur-xl animate-pulse"></div>
      <div className="absolute bottom-20 right-20 w-32 h-32 bg-blue-500/10 rounded-full blur-xl animate-pulse delay-1000"></div>

      <div className="relative">
        {/* Quick Actions Bar */}
        <div className="bg-gradient-to-r from-emerald-600/20 to-blue-600/20 border-b border-emerald-500/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex flex-wrap items-center justify-center gap-4">
              {quickActions.map((action, index) => (
                <a
                  key={index}
                  href={action.href}
                  className={`flex items-center space-x-2 px-4 py-2 bg-gradient-to-r ${action.color} text-white rounded-lg font-semibold hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl`}
                >
                  <i className={`${action.icon} text-sm`}></i>
                  <span className="text-sm">{action.label}</span>
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Main Footer Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          {/* Top Section */}
          <div className="grid grid-cols-1 lg:grid-cols-6 gap-12 mb-12">
            {/* Enhanced Brand Section */}
            <div className="lg:col-span-2">
              <div className="flex items-center space-x-3 mb-6">
                <div className="relative">
                  <Image 
                    src="/images/logo.png" 
                    alt="Polideportivo Victoria Hernandez" 
                    width={64}
                    height={64}
                    className="w-16 h-16 object-contain rounded-2xl shadow-2xl hover:scale-110 transition-transform duration-300"
                    onError={(e) => {
                      // Fallback al diseño original si no carga la imagen
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                  <div className="hidden w-16 h-16 bg-gradient-to-br from-emerald-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-2xl hover:scale-110 transition-transform duration-300">
                    <i className="fas fa-running text-white text-2xl"></i>
                  </div>
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-orange-500 rounded-full animate-pulse flex items-center justify-center">
                    <i className="fas fa-star text-white text-xs"></i>
                  </div>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    Polideportivo Victoria Hernandez
                  </h2>
                    <div className="flex items-center space-x-2">
                    <p className="text-emerald-400 font-semibold">
                      Centro Deportivo Premium
                    </p>
                      {mounted && (
                        <div className={`flex items-center space-x-1 ${getCurrentStatus().color}`} suppressHydrationWarning>
                          <i className={`${getCurrentStatus().icon} text-xs animate-pulse`}></i>
                          <span className="text-xs font-medium">{getCurrentStatus().status}</span>
                        </div>
                      )}
                  </div>
                </div>
              </div>
              
              <p className="text-gray-300 text-lg leading-relaxed mb-6">
                El centro deportivo más moderno de Victoria Hernandez. Ofrecemos instalaciones de primera clase, 
                programas deportivos innovadores y una experiencia única para toda la familia.
              </p>
              
              {/* Enhanced Quick Stats */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 bg-white/5 rounded-xl backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all duration-300 group">
                  <div className="text-2xl font-bold text-emerald-400 group-hover:scale-110 transition-transform duration-300">15+</div>
                  <div className="text-sm text-gray-400">Deportes</div>
                  <i className="fas fa-dumbbell text-emerald-500/50 text-xs mt-1"></i>
                </div>
                <div className="text-center p-4 bg-white/5 rounded-xl backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all duration-300 group">
                  <div className="text-2xl font-bold text-blue-400 group-hover:scale-110 transition-transform duration-300">5000+</div>
                  <div className="text-sm text-gray-400">Miembros</div>
                  <i className="fas fa-users text-blue-500/50 text-xs mt-1"></i>
                </div>
                <div className="text-center p-4 bg-white/5 rounded-xl backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all duration-300 group">
                  <div className="text-2xl font-bold text-orange-400 group-hover:scale-110 transition-transform duration-300">24/7</div>
                  <div className="text-sm text-gray-400">Disponible</div>
                  <i className="fas fa-clock text-orange-500/50 text-xs mt-1"></i>
                </div>
              </div>

              {/* Enhanced Newsletter */}
              <div className="bg-gradient-to-r from-emerald-500/20 to-blue-600/20 p-6 rounded-2xl border border-emerald-500/30 hover:border-emerald-500/50 transition-all duration-300">
                <h3 className="text-lg font-semibold text-white mb-2">
                  <i className="fas fa-envelope mr-2 text-emerald-400"></i>
                  Newsletter Deportivo
                </h3>
                <p className="text-gray-300 text-sm mb-4">
                  Recibe noticias, promociones exclusivas y eventos especiales
                </p>
                {isSubscribed ? (
                  <div className="flex items-center space-x-2 text-green-400">
                    <i className="fas fa-check-circle"></i>
                    <span className="text-sm font-medium">¡Suscripción exitosa!</span>
                  </div>
                ) : (
                  <form onSubmit={handleNewsletterSubmit} className="flex space-x-2">
                    <input 
                      type="email" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="tu@email.com"
                      required
                      className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-300"
                    />
                    <button 
                      type="submit"
                      className="bg-gradient-to-r from-emerald-500 to-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:from-emerald-600 hover:to-blue-700 transition-all duration-300 hover:scale-105 disabled:opacity-50"
                      disabled={!email}
                    >
                      <i className="fas fa-paper-plane"></i>
                    </button>
                  </form>
                )}
                <div className="flex items-center justify-between mt-3 text-xs text-gray-400">
                  <span>📧 +2.1K suscriptores</span>
                  <span>🔒 Sin spam garantizado</span>
                </div>
              </div>

              {/* Contact Card */}
              <div className="bg-gradient-to-r from-gray-800/50 to-gray-700/50 p-6 rounded-2xl border border-gray-600/30">
                <h3 className="text-lg font-semibold text-white mb-4">
                  <i className="fas fa-phone mr-2 text-emerald-400"></i>
                  Contacto Directo
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3 text-sm">
                    <i className="fas fa-map-marker-alt text-emerald-500 w-4"></i>
                    <span className="text-gray-300">{contactInfo.address}</span>
                  </div>
                  <div className="flex items-center space-x-3 text-sm">
                    <i className="fas fa-clock text-blue-500 w-4"></i>
                    <span className="text-gray-300">{contactInfo.hours}</span>
                  </div>
                  <div className="flex items-center space-x-3 text-sm">
                    <i className="fas fa-phone text-orange-500 w-4"></i>
                    <a href={`tel:${contactInfo.phone}`} className="text-gray-300 hover:text-emerald-400 transition-colors duration-300">
                      {contactInfo.phone}
                    </a>
                  </div>
                  <div className="flex items-center space-x-3 text-sm">
                    <i className="fab fa-whatsapp text-green-500 w-4"></i>
                    <a href={`https://wa.me/57${contactInfo.whatsapp.replace(/\D/g, '')}`} className="text-gray-300 hover:text-emerald-400 transition-colors duration-300">
                      WhatsApp: {contactInfo.whatsapp}
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Enhanced Links Sections */}
            {footerSections.map((section, index) => (
              <div key={index} className="space-y-6">
                <h3 className="text-lg font-semibold text-white mb-6 relative flex items-center space-x-2">
                  <i className={`${section.icon} text-emerald-400`}></i>
                  <span>{section.title}</span>
                  <div className="absolute bottom-0 left-0 w-8 h-0.5 bg-gradient-to-r from-emerald-500 to-blue-600 rounded-full"></div>
                </h3>
                <ul className="space-y-3">
                  {section.links.map((link, linkIndex) => (
                    <li key={linkIndex}>
                      <a 
                        href={link.href}
                        className="flex items-center justify-between text-gray-300 hover:text-emerald-400 transition-all duration-300 hover:translate-x-1 group p-2 rounded-lg hover:bg-white/5"
                      >
                        <div className="flex items-center space-x-3">
                          <i className={`${link.icon} text-emerald-500 w-4 group-hover:scale-110 transition-transform duration-300`}></i>
                          <span className="text-sm">{link.label}</span>
                        </div>
                        {link.badge && (
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                            link.badge === 'Popular' ? 'bg-orange-500/20 text-orange-400' :
                            link.badge === 'Nuevo' ? 'bg-green-500/20 text-green-400' :
                            link.badge === 'Premium' ? 'bg-purple-500/20 text-purple-400' :
                            link.badge === 'Gratis' ? 'bg-blue-500/20 text-blue-400' :
                            link.badge === 'Live' ? 'bg-red-500/20 text-red-400 animate-pulse' :
                            link.badge === 'Ofertas' ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-gray-500/20 text-gray-400'
                          }`}>
                            {link.badge}
                          </span>
                        )}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Divider */}
          <div className="border-t border-gray-700 mb-8"></div>

          {/* Enhanced Bottom Section */}
          <div className="space-y-8">
            {/* Social Media Section */}
            <div className="text-center">
              <h4 className="text-lg font-semibold text-white mb-4">
                <i className="fas fa-share-alt mr-2 text-emerald-400"></i>
                Síguenos en Redes Sociales
              </h4>
              <div className="flex flex-wrap items-center justify-center gap-4">
                {socialLinks.map((social, index) => (
                  <a
                    key={index}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`group relative w-16 h-16 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl flex flex-col items-center justify-center text-gray-400 ${social.color} transition-all duration-300 hover:scale-110 hover:rotate-6`}
                    aria-label={social.label}
                  >
                    <i className={`${social.icon} text-xl group-hover:scale-110 transition-transform duration-300`}></i>
                    <span className="text-xs mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      {social.followers}
                    </span>
                    <div className="absolute -top-2 -right-2 w-4 h-4 bg-emerald-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                      <i className="fas fa-plus text-white text-xs"></i>
                    </div>
                  </a>
                ))}
              </div>
              <p className="text-gray-400 text-sm mt-4">
                Únete a nuestra comunidad deportiva de más de 25K seguidores
              </p>
            </div>

            {/* Interactive Map Preview */}
            <div className="bg-gradient-to-r from-gray-800/50 to-gray-700/50 p-6 rounded-2xl border border-gray-600/30">
              <h4 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                <i className="fas fa-map-marked-alt text-emerald-400"></i>
                <span>Nuestra Ubicación</span>
              </h4>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="flex items-start space-x-3 text-sm">
                    <i className="fas fa-map-marker-alt text-emerald-500 w-4 mt-1"></i>
                    <div>
                      <p className="text-white font-medium">Dirección Principal</p>
                      <p className="text-gray-300">{contactInfo.address}</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3 text-sm">
                    <i className="fas fa-clock text-blue-500 w-4 mt-1"></i>
                    <div>
                      <p className="text-white font-medium">Horarios de Atención</p>
                      <p className="text-gray-300">{contactInfo.hours}</p>
                      {mounted && (
                        <p className="text-xs text-gray-400 mt-1" suppressHydrationWarning>
                          Actualmente: <span className={getCurrentStatus().color}>{getCurrentStatus().status}</span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-600/30">
                  <div className="aspect-video bg-gradient-to-br from-emerald-500/20 to-blue-600/20 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <i className="fas fa-map text-4xl text-emerald-400 mb-2"></i>
                      <p className="text-white font-medium">Mapa Interactivo</p>
                      <p className="text-gray-400 text-sm">Haz clic para ver ubicación</p>
                    </div>
                  </div>
                  <button className="w-full mt-3 bg-gradient-to-r from-emerald-500 to-blue-600 text-white py-2 rounded-lg font-semibold hover:from-emerald-600 hover:to-blue-700 transition-all duration-300 hover:scale-105">
                    <i className="fas fa-directions mr-2"></i>
                    Cómo Llegar
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Final Section */}
          <div className="border-t border-gray-700 mt-8 pt-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-6">
              {/* Copyright & Legal */}
              <div className="lg:col-span-2">
                <div className="flex flex-col space-y-4">
                  <div className="flex items-center space-x-2">
                    <i className="fas fa-shield-alt text-emerald-400"></i>
                    <p className="text-white font-medium">© {currentYear} Polideportivo Victoria Hernandez</p>
                  </div>
                  <p className="text-gray-400 text-sm">
                    Todos los derechos reservados. Centro deportivo líder en Victoria Hernandez, Cesar.
                  </p>
                  <div className="flex flex-wrap items-center gap-4 text-sm">
                    <a href="/privacy" className="text-gray-400 hover:text-emerald-400 transition-colors duration-300 flex items-center space-x-1">
                      <i className="fas fa-lock text-xs"></i>
                      <span>Privacidad</span>
                    </a>
                    <a href="/terms" className="text-gray-400 hover:text-emerald-400 transition-colors duration-300 flex items-center space-x-1">
                      <i className="fas fa-file-contract text-xs"></i>
                      <span>Términos</span>
                    </a>
                    <a href="/cookies" className="text-gray-400 hover:text-emerald-400 transition-colors duration-300 flex items-center space-x-1">
                      <i className="fas fa-cookie-bite text-xs"></i>
                      <span>Cookies</span>
                    </a>
                    <a href="/accesibilidad" className="text-gray-400 hover:text-emerald-400 transition-colors duration-300 flex items-center space-x-1">
                      <i className="fas fa-universal-access text-xs"></i>
                      <span>Accesibilidad</span>
                    </a>
                  </div>
                </div>
              </div>

              {/* Development Credit */}
              <div className="text-center lg:text-right">
                <div className="bg-gradient-to-r from-gray-800/50 to-gray-700/50 p-4 rounded-xl border border-gray-600/30">
                  <div className="flex items-center justify-center lg:justify-end space-x-2 mb-2">
                    <span className="text-gray-400 text-sm">Desarrollado con</span>
                    <i className="fas fa-heart text-red-500 animate-pulse"></i>
                    <span className="text-gray-400 text-sm">en España</span>
                  </div>

                </div>
              </div>
            </div>

            {/* Final Stats */}
            <div className="text-center py-4 border-t border-gray-700/50">
              {mounted && currentTime && (
                <p className="text-gray-500 text-xs" suppressHydrationWarning>
                  Última actualización: {currentTime.toLocaleDateString('es-CO')} • 
                  Versión 2.1.0 • 
                  <span className="text-emerald-400">Sistema Activo</span>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Enhanced Floating Action Button */}
        {isVisible && (
          <div className={`fixed bottom-6 right-6 z-50 ${
            isDashboardRoute ? 'hidden md:block' : ''
          }`}>
            <button 
              onClick={scrollToTop}
              className="group relative w-14 h-14 bg-gradient-to-r from-emerald-500 to-blue-600 text-white rounded-full shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-110 hover:rotate-12 flex items-center justify-center"
              aria-label="Volver arriba"
            >
              <i className="fas fa-arrow-up text-xl group-hover:scale-110 transition-transform duration-300"></i>
              <div className="absolute -top-2 -left-2 w-4 h-4 bg-orange-500 rounded-full animate-ping"></div>
              <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
                Volver arriba
              </div>
            </button>
          </div>
        )}

        {/* Emergency Contact Floating Button */}
        <div className={`fixed bottom-6 left-6 z-50 ${
          isDashboardRoute ? 'hidden md:block' : ''
        }`}>
          <a
            href={`tel:${contactInfo.emergency}`}
            className="group relative w-12 h-12 bg-gradient-to-r from-red-500 to-orange-600 text-white rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-110 flex items-center justify-center"
            aria-label="Contacto de emergencia"
          >
            <i className="fas fa-phone text-sm group-hover:scale-110 transition-transform duration-300"></i>
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-400 rounded-full animate-pulse"></div>
            <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
              Emergencias
            </div>
          </a>
        </div>
      </div>
    </footer>
  );
}