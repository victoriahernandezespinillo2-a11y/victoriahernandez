'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Home, Calendar, Plus, Activity, User, Wallet, Award } from 'lucide-react';
import { ShoppingBagIcon } from '@heroicons/react/24/outline';
import { useMobileDrawer } from '../hooks/useMobileDrawer';

interface NavigationItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  badge?: number;
}

export default function BottomNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const { isMobileDrawerOpen } = useMobileDrawer();
  const { isVisible } = useBottomNavigation(isMobileDrawerOpen);
  const [activeTab, setActiveTab] = useState('inicio');

  // Determinar si estamos en la landing page
  const isLandingPage = pathname === '/';
  
  const navigationItems: NavigationItem[] = isLandingPage ? [
    {
      id: 'inicio',
      label: 'Inicio',
      icon: Home,
      href: '#inicio',
    },
    {
      id: 'instalaciones',
      label: 'Instalaciones',
      icon: Calendar,
      href: '#instalaciones',
    },
    {
      id: 'reservar',
      label: 'Reservar',
      icon: Plus,
      href: '/auth/signin',
    },
    {
      id: 'actividades',
      label: 'Actividades',
      icon: Activity,
      href: '#actividades',
    },
    {
      id: 'patrocinadores',
      label: 'Sponsors',
      icon: Award,
      href: '#patrocinadores',
    },
  ] : [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: Home,
      href: '/dashboard',
    },
    {
      id: 'reservas',
      label: 'Reservas',
      icon: Calendar,
      href: '/dashboard/reservations',
      badge: 2,
    },
    {
      id: 'tienda',
      label: 'Tienda',
      icon: ShoppingBagIcon,
      href: '/dashboard/shop',
    },
    {
      id: 'billetera',
      label: 'Billetera',
      icon: Wallet,
      href: '/dashboard/wallet',
    },
    {
      id: 'actividades',
      label: 'Actividades',
      icon: Activity,
      href: '/dashboard/tournaments',
    },
    {
      id: 'perfil',
      label: 'Perfil',
      icon: User,
      href: '/dashboard/profile',
      badge: 1,
    },
  ];

  // Actualizar tab activo basado en la ruta actual o sección visible
  useEffect(() => {
    if (isLandingPage) {
      // Para la landing page, detectar sección visible
      const handleScroll = () => {
        const sections = ['inicio', 'instalaciones', 'actividades', 'info'];
        let currentSection = 'inicio';
        
        for (const sectionId of sections) {
          const element = document.getElementById(sectionId);
          if (element) {
            const rect = element.getBoundingClientRect();
            if (rect.top <= 100 && rect.bottom >= 100) {
              currentSection = sectionId === 'info' ? 'contacto' : sectionId;
              break;
            }
          }
        }
        
        setActiveTab(currentSection);
      };
      
      window.addEventListener('scroll', handleScroll, { passive: true });
      handleScroll(); // Ejecutar una vez al montar
      
      return () => window.removeEventListener('scroll', handleScroll);
    } else {
      // Para otras páginas, usar la ruta
      const currentItem = navigationItems.find(item => {
        if (item.href === '/' && pathname === '/') return true;
        if (item.href !== '/' && pathname.startsWith(item.href)) return true;
        return false;
      });
      
      if (currentItem) {
        setActiveTab(currentItem.id);
      }
    }
  }, [pathname, isLandingPage]);

  const handleNavigation = (item: NavigationItem) => {
    setActiveTab(item.id);
    
    // Navegación suave para secciones de la landing page
    if (item.href.startsWith('#')) {
      const targetId = item.href.substring(1);
      const targetElement = document.getElementById(targetId);
      if (targetElement) {
        const offsetTop = targetElement.offsetTop - 80;
        window.scrollTo({
          top: offsetTop,
          behavior: 'smooth'
        });
      }
    } else {
      // Navegación normal para rutas
      router.push(item.href);
    }
  };

  return (
    <>
      {/* Bottom Navigation */}
      <nav className={`
        fixed bottom-0 left-0 right-0 z-50
        bg-white/95 border-t border-gray-200
        bottom-nav-blur pb-safe
        transition-transform duration-300 ease-in-out
        ${isVisible ? 'translate-y-0' : 'translate-y-full'}
        md:hidden
      `}>
        <div className="flex items-center justify-around px-2 py-2 pb-1 max-w-md mx-auto">
          {navigationItems.map((item) => {
            const isActive = activeTab === item.id;
            const IconComponent = item.icon;
            
            return (
              <button
                key={item.id}
                onClick={() => handleNavigation(item)}
                className={`
                  relative flex flex-col items-center justify-center
                  min-w-0 flex-1 px-2 py-2 rounded-xl
                  transition-all duration-300 ease-in-out
                  ripple-effect
                  ${isActive 
                    ? 'bg-emerald-50 text-emerald-600 scale-105' 
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50 active:scale-95'
                  }
                `}
                aria-label={item.label}
              >
                {/* Badge de notificaciones */}
                {item.badge && item.badge > 0 && (
                  <div className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
                    {item.badge > 99 ? '99+' : item.badge}
                  </div>
                )}
                
                {/* Icono */}
                <div className={`relative transition-transform duration-300 ${
                  isActive ? 'scale-110' : 'scale-100'
                }`}>
                  <IconComponent className={`h-6 w-6 transition-colors duration-300 ${
                    isActive ? 'text-emerald-600' : 'text-current'
                  }`} />
                  
                  {/* Indicador activo */}
                  {isActive && (
                    <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-emerald-600 rounded-full" />
                  )}
                </div>
                
                {/* Label */}
                <span className={`text-xs font-medium mt-1 transition-all duration-300 truncate ${
                  isActive 
                    ? 'text-emerald-600 font-semibold' 
                    : 'text-current'
                }`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}

// Hook para usar el bottom navigation
export function useBottomNavigation(isMobileDrawerOpen: boolean = false) {
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    // Si el menú lateral está abierto, ocultar el bottom navigation
    if (isMobileDrawerOpen) {
      setIsVisible(false);
      return;
    }

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const pathname = window.location.pathname;
      
      // Solo en móviles
      if (window.innerWidth < 768) {
        // En el dashboard, mantener siempre visible
        if (pathname !== '/') {
          setIsVisible(true);
        } else {
          // En landing page, comportamiento normal de scroll
          if (currentScrollY > lastScrollY && currentScrollY > 100) {
            // Scrolling down
            setIsVisible(false);
          } else if (currentScrollY < lastScrollY || currentScrollY < 50) {
            // Scrolling up or near top
            setIsVisible(true);
          }
        }
      } else {
        setIsVisible(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY, isMobileDrawerOpen]);

  return { isVisible };
}