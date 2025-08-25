"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import { X } from 'lucide-react';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  className?: string;
}

export function MobileDrawer({ 
  isOpen, 
  onClose, 
  children, 
  title,
  className = '' 
}: MobileDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const firstFocusableRef = useRef<HTMLButtonElement>(null);
  const lastFocusableRef = useRef<HTMLElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);
  
  // Estados para gestos de deslizamiento
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragCurrentX, setDragCurrentX] = useState(0);
  const [translateX, setTranslateX] = useState(0);
  const [isClient, setIsClient] = useState(false);

  // Efecto para detectar cliente y aplicar safe-area-insets
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Función para obtener elementos focusables
  const getFocusableElements = useCallback(() => {
    if (!drawerRef.current) return [];
    
    const focusableSelectors = [
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])'
    ].join(', ');
    
    return Array.from(drawerRef.current.querySelectorAll(focusableSelectors)) as HTMLElement[];
  }, []);

  // Focus trap mejorado
  const handleTabKey = useCallback((e: KeyboardEvent) => {
    const focusableElements = getFocusableElements();
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (e.shiftKey) {
      // Shift + Tab
      if (document.activeElement === firstElement && lastElement) {
        e.preventDefault();
        lastElement.focus();
      }
    } else {
      // Tab
      if (document.activeElement === lastElement && firstElement) {
        e.preventDefault();
        firstElement.focus();
      }
    }
  }, [getFocusableElements]);

  // Manejo de teclado (ESC y Tab)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Tab') {
        handleTabKey(e);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, handleTabKey]);

  // Focus management
  useEffect(() => {
    if (isOpen) {
      // Guardar el elemento activo actual
      previousActiveElement.current = document.activeElement as HTMLElement;
      
      // Focus inicial en el primer elemento focusable
      setTimeout(() => {
        const focusableElements = getFocusableElements();
        if (focusableElements.length > 0 && focusableElements[0]) {
          focusableElements[0].focus();
        } else if (firstFocusableRef.current) {
          firstFocusableRef.current.focus();
        }
      }, 100);
    } else {
      // Restaurar focus al elemento anterior
      if (previousActiveElement.current && typeof previousActiveElement.current.focus === 'function') {
        previousActiveElement.current.focus();
      }
    }
  }, [isOpen, getFocusableElements]);

  // Manejo de gestos de deslizamiento
  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!drawerRef.current || !e.touches[0]) return;
    
    const touch = e.touches[0];
    setIsDragging(true);
    setDragStartX(touch.clientX);
    setDragCurrentX(touch.clientX);
    setTranslateX(0);
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging || !drawerRef.current || !e.touches[0]) return;
    
    const touch = e.touches[0];
    const deltaX = touch.clientX - dragStartX;
    
    // Solo permitir deslizar hacia la izquierda (cerrar)
    if (deltaX < 0) {
      setDragCurrentX(touch.clientX);
      setTranslateX(deltaX);
    }
  }, [isDragging, dragStartX]);

  const handleTouchEnd = useCallback(() => {
    if (!isDragging) return;
    
    const deltaX = dragCurrentX - dragStartX;
    const threshold = -100; // Umbral para cerrar el drawer
    
    if (deltaX < threshold) {
      onClose();
    }
    
    setIsDragging(false);
    setTranslateX(0);
  }, [isDragging, dragCurrentX, dragStartX, onClose]);

  // Scroll lock mejorado con gestos táctiles
  useEffect(() => {
    if (!isOpen) return;

    const originalStyle = window.getComputedStyle(document.body);
    const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
    
    // Prevenir scroll en el body
    document.body.style.overflow = 'hidden';
    document.body.style.paddingRight = `${scrollBarWidth}px`;
    
    // Agregar event listeners para gestos
    if (drawerRef.current) {
      drawerRef.current.addEventListener('touchstart', handleTouchStart, { passive: true });
      drawerRef.current.addEventListener('touchmove', handleTouchMove, { passive: true });
      drawerRef.current.addEventListener('touchend', handleTouchEnd, { passive: true });
    }
    
    // Prevenir scroll en iOS Safari
    const preventDefault = (e: TouchEvent) => {
      if (e.target === overlayRef.current) {
        e.preventDefault();
      }
    };
    
    document.addEventListener('touchmove', preventDefault, { passive: false });

    return () => {
      document.body.style.overflow = originalStyle.overflow;
      document.body.style.paddingRight = originalStyle.paddingRight;
      document.removeEventListener('touchmove', preventDefault);
      
      const currentDrawerRef = drawerRef.current;
      if (currentDrawerRef) {
        currentDrawerRef.removeEventListener('touchstart', handleTouchStart);
        currentDrawerRef.removeEventListener('touchmove', handleTouchMove);
        currentDrawerRef.removeEventListener('touchend', handleTouchEnd);
      }
    };
  }, [isOpen, handleTouchStart, handleTouchMove, handleTouchEnd]);

  if (!isOpen) return null;

  return (
    <div 
      className="lg:hidden fixed inset-0 z-[9999] flex"
      style={isClient ? { 
        paddingTop: 'env(safe-area-inset-top)', 
        paddingBottom: 'env(safe-area-inset-bottom)' 
      } : {}}
      suppressHydrationWarning={true}
    >
      {/* Overlay */}
      <div 
        ref={overlayRef}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Drawer */}
      <div 
        ref={drawerRef}
        className={`relative flex flex-col w-full max-w-sm bg-white shadow-2xl ${className}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'drawer-title' : undefined}
        style={{ 
          ...(isClient ? {
            paddingTop: 'env(safe-area-inset-top)',
            paddingBottom: 'env(safe-area-inset-bottom)'
          } : {}),
          transform: isDragging ? `translateX(${translateX}px)` : undefined,
          willChange: 'transform',
          WebkitTransform: isDragging ? `translateX(${translateX}px)` : undefined
        }}
        suppressHydrationWarning={true}
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white/95 backdrop-blur-sm sticky top-0 z-10">
            <h2 id="drawer-title" className="text-lg font-semibold text-gray-900 truncate">
              {title}
            </h2>
            <button
              ref={firstFocusableRef}
              onClick={onClose}
              className="p-2 -mr-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all duration-200 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              aria-label="Cerrar menú"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}
        
        {/* Indicador visual de deslizamiento */}
        {!title && (
          <div className="flex justify-center py-2">
            <div className="w-8 h-1 bg-gray-300 rounded-full" />
          </div>
        )}
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {children}
        </div>
      </div>
    </div>
  );
}