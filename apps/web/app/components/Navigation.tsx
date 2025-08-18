"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export function Navigation() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null);
  // Estado para controlar acordeones en móvil
  const [mobileAccordions, setMobileAccordions] = useState<Record<string, boolean>>({});
  const router = useRouter();

  const handleSmoothScroll = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    if (href.startsWith('#')) {
      const targetId = href.substring(1);
      const targetElement = document.getElementById(targetId);
      if (targetElement) {
        const offsetTop = targetElement.offsetTop - 80; // Account for fixed navbar height
        window.scrollTo({
          top: offsetTop,
          behavior: 'smooth'
        });
        setIsMobileMenuOpen(false); // Close mobile menu after navigation
        setActiveDropdown(null); // Close dropdown
        setMobileAccordions({}); // Reset mobile accordions
      } else {
        // Si no encuentra el elemento, navegar a la página principal
        router.push('/' + href);
      }
    } else {
      // Para rutas absolutas, usar router.push
      router.push(href);
      setIsMobileMenuOpen(false);
      setActiveDropdown(null);
      setMobileAccordions({}); // Reset mobile accordions
    }
  };

  // Función para manejar acordeones móviles
  const toggleMobileAccordion = (label: string) => {
    setMobileAccordions(prev => ({
      ...prev,
      [label]: !prev[label]
    }));
  };

  const handleMouseEnter = (label: string) => {
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
      setHoverTimeout(null);
    }
    setActiveDropdown(label);
  };

  const handleMouseLeave = () => {
    const timeout = setTimeout(() => {
      setActiveDropdown(null);
    }, 150); // 150ms delay before closing
    setHoverTimeout(timeout);
  };

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeout) {
        clearTimeout(hoverTimeout);
      }
    };
  }, [hoverTimeout]);

  const navigationItems = [
    {
      label: 'Inicio',
      href: '#inicio',
      icon: 'fas fa-home'
    },
    {
      label: 'Instalaciones',
      href: '#instalaciones',
      icon: 'fas fa-building',
      dropdown: [
        { label: 'Piscinas', href: '#instalaciones', icon: 'fas fa-swimmer' },
        { label: 'Gimnasio', href: '#instalaciones', icon: 'fas fa-dumbbell' },
        { label: 'Pistas Deportivas', href: '#instalaciones', icon: 'fas fa-running' },
        { label: 'Spa & Wellness', href: '#instalaciones', icon: 'fas fa-spa' }
      ]
    },
    {
      label: 'Deportes',
      href: '#deportes',
      icon: 'fas fa-futbol'
    },
    {
      label: 'Actividades',
      href: '#actividades',
      icon: 'fas fa-calendar-alt'
    },
    {
      label: 'Información',
      href: '#info',
      icon: 'fas fa-info-circle',
      dropdown: [
        { label: 'Sobre Nosotros', href: '#info', icon: 'fas fa-users' },
        { label: 'Horarios', href: '#info', icon: 'fas fa-clock' },
        { label: 'Ubicación', href: '#info', icon: 'fas fa-map-marker-alt' },
        { label: 'Contacto', href: '#info', icon: 'fas fa-phone' }
      ]
    }
  ];

  return (
    <>
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled 
          ? 'bg-white/95 backdrop-blur-lg shadow-xl border-b border-gray-200/50' 
          : 'bg-black/20 backdrop-blur-sm'
      }`}>
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 xl:px-16">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                  <i className="fas fa-running text-white text-xl"></i>
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full animate-pulse"></div>
              </div>
              <div>
                <h1 className={`font-bold text-xl transition-colors duration-300 ${
                  isScrolled ? 'text-gray-900' : 'text-white'
                }`}>
                  Polideportivo
                </h1>
                <p className={`text-sm font-medium transition-colors duration-300 ${
                  isScrolled ? 'text-emerald-600' : 'text-emerald-200'
                }`}>
                  Victoria Hernandez
                </p>
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center space-x-2 xl:space-x-4">
              {navigationItems.map((item, index) => (
                <div 
                  key={index} 
                  className="relative group"
                  onMouseEnter={() => item.dropdown && handleMouseEnter(item.label)}
                  onMouseLeave={() => item.dropdown && handleMouseLeave()}
                >
                  <a
                    href={item.href}
                    onClick={(e) => handleSmoothScroll(e, item.href)}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-300 hover:scale-105 ${
                      isScrolled 
                        ? 'text-gray-700 hover:text-emerald-600 hover:bg-emerald-50' 
                        : 'text-white hover:text-emerald-200 hover:bg-white/10'
                    }`}
                  >
                    <i className={`${item.icon} text-sm`}></i>
                    <span className="text-sm">{item.label}</span>
                    {item.dropdown && (
                      <i className={`fas fa-chevron-down text-xs transition-transform duration-300 ${
                        activeDropdown === item.label ? 'rotate-180' : ''
                      }`}></i>
                    )}
                  </a>
                  
                  {/* Dropdown Menu */}
                  {item.dropdown && activeDropdown === item.label && (
                    <div className="absolute top-full left-0 pt-2 z-50">
                      {/* Invisible bridge to prevent dropdown from closing */}
                      <div className="w-64 h-2 bg-transparent"></div>
                      <div className="w-64 bg-white rounded-xl shadow-2xl border border-gray-100 py-2 animate-in fade-in-0 zoom-in-95 duration-200">
                        {item.dropdown.map((dropdownItem, dropdownIndex) => (
                          <a
                            key={dropdownIndex}
                            href={dropdownItem.href}
                            onClick={(e) => handleSmoothScroll(e, dropdownItem.href)}
                            className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:text-emerald-600 hover:bg-emerald-50 transition-colors duration-200"
                          >
                            <i className={`${dropdownItem.icon} text-emerald-500 w-4`}></i>
                            <span className="text-sm font-medium">{dropdownItem.label}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* CTA Buttons */}
            <div className="hidden lg:flex items-center space-x-4 xl:space-x-6">
              <button 
                onClick={() => router.push('/auth/signin')}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 hover:scale-105 ${
                isScrolled 
                  ? 'text-gray-700 hover:text-emerald-600 hover:bg-emerald-50' 
                  : 'text-white hover:text-emerald-200 hover:bg-white/10'
              }`}>
                <i className="fas fa-user mr-2"></i>
                Iniciar Sesión
              </button>
              <button 
                onClick={() => router.push('/dashboard/reservations/new')}
                className="bg-gradient-to-r from-emerald-500 to-blue-600 text-white px-6 py-2 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 hover:from-emerald-600 hover:to-blue-700">
                <i className="fas fa-calendar-plus mr-2"></i>
                Reservar Ahora
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button
              className={`lg:hidden p-2 rounded-lg transition-colors duration-300 ${
                isScrolled ? 'text-gray-700 hover:bg-gray-100' : 'text-white hover:bg-white/10'
              }`}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              <i className={`fas ${isMobileMenuOpen ? 'fa-times' : 'fa-bars'} text-xl`}></i>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden bg-white border-t border-gray-200 shadow-xl">
            <div className="px-4 py-6 space-y-2">
              {navigationItems.map((item, index) => (
                <div key={index} className="border-b border-gray-100 last:border-b-0 pb-2 last:pb-0">
                  {/* Elemento principal del menú */}
                  {item.dropdown ? (
                    <button
                      onClick={() => toggleMobileAccordion(item.label)}
                      className="w-full flex items-center justify-between px-4 py-3 text-gray-700 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all duration-200"
                      aria-expanded={mobileAccordions[item.label] || false}
                      aria-controls={`mobile-submenu-${index}`}
                    >
                      <div className="flex items-center space-x-3">
                        <i className={`${item.icon} text-emerald-500 w-5`}></i>
                        <span className="font-medium">{item.label}</span>
                      </div>
                      <i className={`fas fa-chevron-down text-sm transition-transform duration-200 ${
                        mobileAccordions[item.label] ? 'rotate-180' : ''
                      }`}></i>
                    </button>
                  ) : (
                    <a
                      href={item.href}
                      onClick={(e) => handleSmoothScroll(e, item.href)}
                      className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors duration-200"
                    >
                      <i className={`${item.icon} text-emerald-500 w-5`}></i>
                      <span className="font-medium">{item.label}</span>
                    </a>
                  )}
                  
                  {/* Submenú acordeón */}
                  {item.dropdown && (
                    <div 
                      id={`mobile-submenu-${index}`}
                      className={`overflow-hidden transition-all duration-300 ease-in-out ${
                        mobileAccordions[item.label] 
                          ? 'max-h-96 opacity-100 mt-2' 
                          : 'max-h-0 opacity-0'
                      }`}
                      style={{
                        transitionProperty: 'max-height, opacity, margin-top'
                      }}
                    >
                      <div className="ml-8 space-y-1 bg-gray-50 rounded-lg p-2">
                        {item.dropdown.map((dropdownItem, dropdownIndex) => (
                          <a
                            key={dropdownIndex}
                            href={dropdownItem.href}
                            onClick={(e) => handleSmoothScroll(e, dropdownItem.href)}
                            className="flex items-center space-x-3 px-3 py-2 text-gray-600 hover:text-emerald-600 hover:bg-white rounded-md transition-all duration-200 text-sm"
                          >
                            <i className={`${dropdownItem.icon} text-emerald-400 w-4 text-xs`}></i>
                            <span className="font-medium">{dropdownItem.label}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              
              {/* Botones de acción principales */}
              <div className="pt-4 mt-4 border-t border-gray-200 space-y-3">
                <button 
                  onClick={() => {
                    router.push('/auth/signin');
                    setIsMobileMenuOpen(false);
                    setMobileAccordions({});
                  }}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-3 text-gray-700 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors duration-200 border border-gray-200 hover:border-emerald-200">
                  <i className="fas fa-user"></i>
                  <span className="font-medium">Iniciar Sesión</span>
                </button>
                <button 
                  onClick={() => {
                    router.push('/dashboard/reservations/new');
                    setIsMobileMenuOpen(false);
                    setMobileAccordions({});
                  }}
                  className="w-full bg-gradient-to-r from-emerald-500 to-blue-600 text-white px-4 py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:from-emerald-600 hover:to-blue-700">
                  <i className="fas fa-calendar-plus mr-2"></i>
                  Reservar Ahora
                </button>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Spacer for fixed navigation */}
      <div className="h-20"></div>
    </>
  );
}