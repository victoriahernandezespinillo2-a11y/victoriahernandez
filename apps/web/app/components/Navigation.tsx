"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { 
  Home, 
  Building, 
  Dumbbell, 
  Calendar, 
  Info, 
  Users, 
  Clock, 
  MapPin, 
  Phone, 
  Waves, 
  Zap, 
  User, 
  CalendarPlus,
  Activity,
  Search,
  Bell,
} from "lucide-react";
// Remove MobileNativeMenu import and use MobileLandingMenu named export
import { MobileLandingMenu } from "./MobileLandingMenu";
import { useMobileDrawer } from "../hooks/useMobileDrawer";

export function Navigation() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null);
  // Estado para controlar acordeones en móvil
  const [mobileAccordions, setMobileAccordions] = useState<Record<string, boolean>>({});
  const { isMobileDrawerOpen, openDrawer, closeDrawer } = useMobileDrawer();
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
        handleCloseDrawer(); // Close mobile drawer after navigation
        setActiveDropdown(null); // Close dropdown
      } else {
        // Si no encuentra el elemento, navegar a la página principal
        router.push('/' + href);
      }
    } else {
      // Para rutas absolutas, usar router.push
      router.push(href);
      handleCloseDrawer();
      setActiveDropdown(null);
    }
  };

  // Función adaptadora para MobileLandingMenu
  const handleMobileSmoothScroll = (section: string) => {
    const targetElement = document.getElementById(section);
    if (targetElement) {
      const offsetTop = targetElement.offsetTop - 80; // Account for fixed navbar height
      window.scrollTo({
        top: offsetTop,
        behavior: 'smooth'
      });
    }
  };

  // Función para cerrar drawer y resetear acordeones
  const handleCloseDrawer = () => {
    closeDrawer();
    setMobileAccordions({});
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
      const currentScrollY = window.scrollY;
      
      // Set scrolled state
      setIsScrolled(currentScrollY > 50);
      
      // Hide/show header elements (we'll use this to hide the hamburger button on mobile)
      if (window.innerWidth < 1024) { // lg breakpoint
        if (currentScrollY > lastScrollY && currentScrollY > 100) {
          // Scrolling down & past threshold
          setIsHeaderVisible(false);
        } else if (currentScrollY < lastScrollY || currentScrollY < 50) {
          // Scrolling up or near top
          setIsHeaderVisible(true);
        }
      } else {
        // Always visible on desktop
        setIsHeaderVisible(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

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
      icon: Home
    },
    {
      label: 'Instalaciones',
      href: '#instalaciones',
      icon: Building,
      dropdown: [
        { label: 'Piscinas', href: '#instalaciones', icon: Waves },
        { label: 'Gimnasio', href: '#instalaciones', icon: Dumbbell },
        { label: 'Pistas Deportivas', href: '#instalaciones', icon: Zap },
        { label: 'Spa & Wellness', href: '#instalaciones', icon: Waves }
      ]
    },
    {
      label: 'Deportes',
      href: '#deportes',
      icon: Zap
    },
    {
      label: 'Actividades',
      href: '#actividades',
      icon: Calendar
    },
    {
      label: 'Patrocinadores',
      href: '#patrocinadores',
      icon: Users
    },
    {
      label: 'Información',
      href: '#info',
      icon: Info,
      dropdown: [
        { label: 'Sobre Nosotros', href: '#info', icon: Users },
        { label: 'Horarios', href: '#info', icon: Clock },
        { label: 'Ubicación', href: '#info', icon: MapPin },
        { label: 'Contacto', href: '#info', icon: Phone }
      ]
    }
  ];

  return (
    <>
      <nav className={`fixed left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled 
          ? 'bg-white/95 backdrop-blur-lg shadow-xl border-b border-gray-200/50' 
          : 'bg-black/20 backdrop-blur-sm'
      } ${
        // En mobile mantenemos el header, pero ocultamos el botón de menú; en desktop siempre visible
        'top-0 translate-y-0'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 xl:px-16">
          <div className="flex items-center justify-between h-16 sm:h-20">
            {/* Logo */}
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="relative">
                <Image 
                  src="/images/logo.png" 
                  alt="Polideportivo Victoria Hernandez" 
                  width={48}
                  height={48}
                  className="w-8 h-8 sm:w-12 sm:h-12 object-contain rounded-lg sm:rounded-xl shadow-lg"
                  onError={(e) => {
                    // Fallback al diseño original si no carga la imagen
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                  }}
                />
                <div className="hidden w-8 h-8 sm:w-12 sm:h-12 bg-gradient-to-br from-emerald-500 to-blue-600 rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg">
                  <Activity className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                </div>
                <div className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 w-3 h-3 sm:w-4 sm:h-4 bg-orange-500 rounded-full animate-pulse"></div>
              </div>
              <div className="hidden sm:block">
                <h1 className={`font-bold text-lg sm:text-xl transition-colors duration-300 ${
                  isScrolled ? 'text-gray-900' : 'text-white'
                }`}>
                  Polideportivo
                </h1>
                <p className={`text-xs sm:text-sm font-medium transition-colors duration-300 ${
                  isScrolled ? 'text-emerald-600' : 'text-emerald-200'
                }`}>
                  Victoria Hernandez
                </p>
              </div>
              {/* Logo compacto solo para móvil */}
              <div className="block sm:hidden">
                <h1 className={`font-bold text-base transition-colors duration-300 ${
                  isScrolled ? 'text-gray-900' : 'text-white'
                }`}>
                  Polideportivo
                </h1>
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
                    <item.icon className="h-4 w-4" />
                    <span className="text-sm">{item.label}</span>
                    {item.dropdown && (
                      <svg className={`h-3 w-3 transition-transform duration-300 ${
                        activeDropdown === item.label ? 'rotate-180' : ''
                      }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
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
                            <dropdownItem.icon className="h-4 w-4 text-emerald-500" />
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
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-300 hover:scale-105 ${
                isScrolled 
                  ? 'text-gray-700 hover:text-emerald-600 hover:bg-emerald-50' 
                  : 'text-white hover:text-emerald-200 hover:bg-white/10'
              }`}>
                <User className="h-4 w-4" />
                <span>Iniciar Sesión</span>
              </button>
              <button 
                onClick={() => router.push('/dashboard/reservations/new')}
                className="flex items-center space-x-2 bg-gradient-to-r from-emerald-500 to-blue-600 text-white px-6 py-2 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 hover:from-emerald-600 hover:to-blue-700">
                <CalendarPlus className="h-4 w-4" />
                Reservar Ahora
              </button>
            </div>

            {/* Mobile Actions */}
            <div className="lg:hidden flex items-center space-x-2">
              {/* Search Button */}
              <button
                className={`p-2 rounded-lg transition-all duration-300 hover:scale-105 ${
                  isScrolled 
                    ? 'text-gray-700 hover:bg-gray-100' 
                    : 'text-white hover:bg-white/10'
                }`}
                aria-label="Buscar"
              >
                <Search className="h-5 w-5" />
              </button>
              
              {/* Notifications */}
              <button
                className={`relative p-2 rounded-lg transition-all duration-300 hover:scale-105 ${
                  isScrolled 
                    ? 'text-gray-700 hover:bg-gray-100' 
                    : 'text-white hover:bg-white/10'
                }`}
                aria-label="Notificaciones"
              >
                <Bell className="h-5 w-5" />
                <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              </button>
              
              {/* Login Button */}
              <button
                onClick={() => router.push('/auth/signin')}
                className={`p-2 rounded-lg transition-all duration-300 hover:scale-105 ${
                  isScrolled 
                    ? 'text-emerald-600 hover:bg-emerald-50' 
                    : 'text-emerald-200 hover:bg-white/10'
                }`}
                aria-label="Iniciar sesión"
              >
                <User className="h-5 w-5" />
              </button>
              
              {/* Hamburger Menu Button with Animation: ocultar al hacer scroll hacia abajo */}
              <button
                onClick={openDrawer}
                className={`relative p-2 rounded-lg transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
                  isScrolled 
                    ? 'text-gray-700 hover:bg-gray-100 focus:ring-offset-white' 
                    : 'text-white hover:bg-white/10 focus:ring-offset-transparent'
                } ${
                  isHeaderVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
                }`}
                aria-label="Abrir menú de navegación"
                aria-expanded={isMobileDrawerOpen}
              >
                <div className="w-6 h-6 flex flex-col justify-center items-center">
                  <span className={`block h-0.5 w-6 bg-current transform transition-all duration-300 ${
                    isMobileDrawerOpen ? 'rotate-45 translate-y-1.5' : '-translate-y-1'
                  }`}></span>
                  <span className={`block h-0.5 w-6 bg-current transform transition-all duration-300 ${
                    isMobileDrawerOpen ? 'opacity-0' : 'opacity-100'
                  }`}></span>
                  <span className={`block h-0.5 w-6 bg-current transform transition-all duration-300 ${
                    isMobileDrawerOpen ? '-rotate-45 -translate-y-1.5' : 'translate-y-1'
                  }`}></span>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Landing Menu (side drawer) */}
        <MobileLandingMenu 
          isOpen={isMobileDrawerOpen} 
          onClose={handleCloseDrawer}
          handleSmoothScroll={handleMobileSmoothScroll}
        />
      </nav>

      {/* Spacer for fixed navigation */}
      <div className="h-20"></div>
    </>
  );
}