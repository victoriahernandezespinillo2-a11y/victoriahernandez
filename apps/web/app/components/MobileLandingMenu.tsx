'use client';

import React, { useState, useRef, useEffect } from 'react';
import { X, Home, Info, Calendar, Phone, MapPin, Users } from 'lucide-react';

interface MobileLandingMenuProps {
  isOpen: boolean;
  onClose: () => void;
  handleSmoothScroll: (section: string) => void;
}

export function MobileLandingMenu({ isOpen, onClose, handleSmoothScroll }: MobileLandingMenuProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchCurrentX, setTouchCurrentX] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const isVisible = isOpen;

  // Constantes para gestos nativos
  const SWIPE_THRESHOLD = 50;
  const MENU_WIDTH = 320;
  const MAX_DRAG = MENU_WIDTH * 0.8;

  // Detectar orientación y viewport
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [isLandscape, setIsLandscape] = useState(false);

  useEffect(() => {
    const updateViewport = () => {
      setViewport({ 
        width: window.innerWidth, 
        height: window.innerHeight 
      });
      setIsLandscape(window.innerWidth > window.innerHeight);
    };

    updateViewport();
    window.addEventListener('resize', updateViewport);
    window.addEventListener('orientationchange', updateViewport);

    return () => {
      window.removeEventListener('resize', updateViewport);
      window.removeEventListener('orientationchange', updateViewport);
    };
  }, []);

  // Haptic feedback nativo
  const triggerHaptic = (type: 'light' | 'medium' | 'heavy' = 'light') => {
    if ('vibrate' in navigator) {
      const patterns = {
        light: [10],
        medium: [20],
        heavy: [30]
      };
      navigator.vibrate(patterns[type]);
    }
  };

  // Gestos táctiles nativos
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (touch) {
      setTouchStartX(touch.clientX);
      setTouchCurrentX(touch.clientX);
      setIsDragging(true);
      triggerHaptic('light');
      
      // Optimización de performance
      if (menuRef.current) {
        menuRef.current.style.willChange = 'transform';
        menuRef.current.style.transition = 'none';
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !touchStartX) return;
    
    const touch = e.touches[0];
    if (touch) {
      const currentX = touch.clientX;
      const deltaX = currentX - touchStartX;
      
      // Solo permitir arrastre hacia la izquierda (cerrar)
      if (deltaX < 0) {
        const clampedDelta = Math.max(deltaX, -MAX_DRAG);
        setDragOffset(clampedDelta);
        setTouchCurrentX(currentX);
        
        // Aplicar transformación en tiempo real con transform3d
        if (menuRef.current) {
          const translateX = clampedDelta;
          menuRef.current.style.transform = `translate3d(${translateX}px, 0, 0)`;
        }
        
        // Reducir opacidad del overlay
        if (overlayRef.current) {
          const progress = Math.abs(clampedDelta) / MAX_DRAG;
          const opacity = 0.6 * (1 - progress);
          overlayRef.current.style.opacity = opacity.toString();
        }
      }
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging || !touchStartX || !touchCurrentX) {
      setIsDragging(false);
      return;
    }
    
    const deltaX = touchCurrentX - touchStartX;
    const shouldClose = Math.abs(deltaX) > SWIPE_THRESHOLD && deltaX < 0;
    
    // Restaurar optimizaciones
    if (menuRef.current) {
      menuRef.current.style.willChange = 'auto';
      menuRef.current.style.transition = 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
    }
    
    if (shouldClose) {
      triggerHaptic('medium');
      onClose();
    } else {
      // Volver a la posición original
      if (menuRef.current) {
        menuRef.current.style.transform = 'translate3d(0, 0, 0)';
      }
      if (overlayRef.current) {
        overlayRef.current.style.opacity = '0.6';
      }
    }
    
    setIsDragging(false);
    setTouchStartX(null);
    setTouchCurrentX(null);
    setDragOffset(0);
  };

  const menuItems = [
    { icon: Home, label: 'Inicio', action: () => { handleSmoothScroll('inicio'); triggerHaptic('light'); } },
    { icon: Info, label: 'Información', action: () => { handleSmoothScroll('info'); triggerHaptic('light'); } },
    { icon: Calendar, label: 'Actividades', action: () => { handleSmoothScroll('actividades'); triggerHaptic('light'); } },
    { icon: Users, label: 'Patrocinadores', action: () => { handleSmoothScroll('patrocinadores'); triggerHaptic('light'); } },
    { icon: MapPin, label: 'Ubicación', action: () => { handleSmoothScroll('info'); triggerHaptic('light'); } },
    { icon: Phone, label: 'Contacto', action: () => { handleSmoothScroll('contacto'); triggerHaptic('light'); } },
  ];

  if (!isVisible) return null;

  // Calcular dimensiones responsivas
  const menuWidth = isLandscape ? Math.min(400, viewport.width * 0.5) : Math.min(MENU_WIDTH, viewport.width * 0.85);
  const headerHeight = isLandscape ? 60 : 80;

  return (
    <div 
      className="fixed inset-0 z-[9999] lg:hidden"
      style={{
        height: '100vh', // Dynamic viewport height para móviles
      }}
    >
      {/* Overlay nativo con blur */}
      <div 
        ref={overlayRef}
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-all duration-300 ease-out ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={() => {
          triggerHaptic('light');
          onClose();
        }}
        style={{
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}
      />
      
      {/* Panel del menú nativo PWA */}
      <div 
        ref={menuRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`absolute top-0 left-0 bg-white shadow-2xl transform transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{
          width: `${menuWidth}px`,
          height: '100dvh',
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'env(safe-area-inset-bottom)',
          paddingLeft: 'env(safe-area-inset-left)',
          boxShadow: '4px 0 24px rgba(0, 0, 0, 0.15)',
          transform: isOpen ? 'translate3d(0, 0, 0)' : 'translate3d(-100%, 0, 0)',
        }}
      >
        {/* Header adaptativo */}
        <div 
          className="relative bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 flex items-center justify-between"
          style={{ height: `${headerHeight}px` }}
        >
          <div className="flex items-center space-x-3 flex-1">
            <img 
              src="/images/logo.png" 
              alt="Polideportivo Victoria Hernandez" 
              className="w-10 h-10 object-contain bg-white rounded-xl shadow-sm"
              onError={(e) => {
                // Fallback al diseño original si no carga la imagen
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling?.classList.remove('hidden');
              }}
            />
            <div className="hidden w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
              <span className="text-emerald-600 font-bold text-lg">P</span>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className={`font-semibold text-white truncate ${
                isLandscape ? 'text-base' : 'text-lg'
              }`}>Polideportivo</h2>
              <p className={`text-emerald-100 truncate ${
                isLandscape ? 'text-xs' : 'text-sm'
              }`}>Victoria Hernández</p>
            </div>
          </div>
          
          <button
            onClick={() => {
              triggerHaptic('medium');
              onClose();
            }}
            className="p-2 rounded-xl bg-white/20 backdrop-blur-sm active:bg-white/30 transition-all duration-200 active:scale-95"
            aria-label="Cerrar menú"
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            <X className={`text-white ${
              isLandscape ? 'h-5 w-5' : 'h-6 w-6'
            }`} />
          </button>
        </div>

        {/* Lista de navegación nativa */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          <nav className="py-2">
            {menuItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <button
                  key={index}
                  onClick={() => {
                    item.action();
                    onClose();
                  }}
                  className={`w-full flex items-center gap-4 px-6 py-4 text-gray-800 active:bg-gray-100 transition-all duration-150 active:scale-[0.98] ${
                    isLandscape ? 'py-3' : 'py-4'
                  }`}
                  style={{
                    WebkitTapHighlightColor: 'transparent',
                    minHeight: isLandscape ? '48px' : '56px',
                  }}
                >
                  <div className={`flex items-center justify-center rounded-xl bg-emerald-50 ${
                    isLandscape ? 'w-8 h-8' : 'w-10 h-10'
                  }`}>
                    <Icon className={`text-emerald-600 ${
                      isLandscape ? 'h-4 w-4' : 'h-5 w-5'
                    }`} />
                  </div>
                  <span className={`font-medium text-gray-900 ${
                    isLandscape ? 'text-sm' : 'text-base'
                  }`}>
                    {item.label}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Botones de acción adaptativos */}
        <div className={`px-4 border-t border-gray-100 bg-white ${
          isLandscape ? 'py-3' : 'py-4'
        }`}>
          <div className={`space-y-3 ${
            isLandscape ? 'space-y-2' : 'space-y-3'
          }`}>
            <button 
              onClick={() => {
                triggerHaptic('light');
                window.location.href = '/auth/signin';
                onClose();
              }}
              className={`w-full border-2 border-emerald-200 text-emerald-600 rounded-2xl font-semibold active:bg-emerald-50 active:scale-[0.98] transition-all duration-200 flex items-center justify-center ${
                isLandscape ? 'py-3 text-sm' : 'py-4 text-base'
              }`}
              style={{
                WebkitTapHighlightColor: 'transparent'
              }}
            >
              <span>Iniciar Sesión</span>
            </button>
            <button 
              onClick={() => {
                triggerHaptic('medium');
                window.location.href = '/dashboard/reservations/new';
                onClose();
              }}
              className={`w-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-2xl font-semibold active:from-emerald-600 active:to-emerald-700 active:scale-[0.98] transition-all duration-200 shadow-lg flex items-center justify-center ${
                isLandscape ? 'py-3 text-sm' : 'py-4 text-base'
              }`}
              style={{
                WebkitTapHighlightColor: 'transparent'
              }}
            >
              <span>Reservar Ahora</span>
            </button>
          </div>
        </div>

        {/* Indicador de arrastre */}
        <div className="absolute top-2 right-4 opacity-30">
          <div className="w-1 h-8 bg-white rounded-full" />
        </div>
      </div>
    </div>
  );
}