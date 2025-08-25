'use client';

import React, { useEffect, useRef, useState } from 'react';
import { X, Home, Info, Calendar, Users, MapPin, Phone, LogIn, Calendar as CalendarIcon } from 'lucide-react';

interface MobileNativeMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

const MobileNativeMenu: React.FC<MobileNativeMenuProps> = ({ isOpen, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [startY, setStartY] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      document.body.style.overflow = 'hidden';
      // Haptic feedback para iOS
      if ('vibrate' in navigator) {
        navigator.vibrate(10);
      }
    } else {
      const timer = setTimeout(() => {
        setIsVisible(false);
        document.body.style.overflow = 'unset';
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length > 0 && e.touches[0]) {
      setIsDragging(true);
      setStartY(e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length === 0 || !e.touches[0]) return;
    
    const currentY = e.touches[0].clientY;
    const deltaY = currentY - startY;
    
    if (deltaY > 0) {
      setDragY(deltaY);
    }
  };

  const handleTouchEnd = () => {
    if (dragY > 100) {
      onClose();
    }
    setIsDragging(false);
    setDragY(0);
    setStartY(0);
  };

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      onClose();
    }
  };

  const menuItems = [
    { icon: Home, label: 'Inicio', action: () => scrollToSection('hero') },
    { icon: Info, label: 'Sobre Nosotros', action: () => scrollToSection('about') },
    { icon: Calendar, label: 'Instalaciones', action: () => scrollToSection('facilities') },
    { icon: Users, label: 'Comunidad', action: () => scrollToSection('community') },
    { icon: MapPin, label: 'Ubicación', action: () => scrollToSection('location') },
    { icon: Phone, label: 'Contacto', action: () => scrollToSection('contact') },
  ];

  if (!isVisible) return null;

  return (
    <>
      {/* Overlay con blur nativo */}
      <div
        ref={overlayRef}
        className={`fixed inset-0 z-40 transition-all duration-300 ease-out ${
          isOpen ? 'backdrop-blur-md bg-black/30' : 'backdrop-blur-0 bg-black/0'
        }`}
        onClick={onClose}
        style={{
          backdropFilter: isOpen ? 'blur(8px)' : 'blur(0px)',
          WebkitBackdropFilter: isOpen ? 'blur(8px)' : 'blur(0px)',
        }}
      />

      {/* Bottom Sheet Menu */}
      <div
        ref={menuRef}
        className={`fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl transition-all duration-300 ease-out transform ${
          isOpen && !isDragging
            ? 'translate-y-0'
            : isDragging
            ? `translate-y-${Math.min(dragY, 400)}px`
            : 'translate-y-full'
        }`}
        style={{
          maxHeight: '85vh',
          paddingBottom: 'env(safe-area-inset-bottom)',
          transform: isDragging 
            ? `translateY(${Math.min(dragY, 400)}px)` 
            : isOpen 
            ? 'translateY(0)' 
            : 'translateY(100%)',
          boxShadow: '0 -10px 40px rgba(0, 0, 0, 0.15)',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Handle para arrastrar */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Menú</h2>
            <p className="text-sm text-gray-500">Polideportivo Victoria Hernández</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors duration-200"
          >
            <X className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        {/* Navigation Items */}
        <div className="px-6 py-4 space-y-2 max-h-96 overflow-y-auto">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <button
                key={index}
                onClick={item.action}
                className="w-full flex items-center space-x-4 p-4 rounded-2xl hover:bg-gray-50 active:bg-gray-100 transition-all duration-200 group"
                style={{
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-50 to-blue-50 rounded-xl flex items-center justify-center group-hover:from-emerald-100 group-hover:to-blue-100 transition-all duration-200">
                  <Icon className="h-6 w-6 text-emerald-600" />
                </div>
                <div className="flex-1 text-left">
                  <span className="text-gray-900 font-medium text-lg group-hover:text-emerald-600 transition-colors duration-200">
                    {item.label}
                  </span>
                </div>
                <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-emerald-100 transition-colors duration-200">
                  <div className="w-2 h-2 bg-gray-400 rounded-full group-hover:bg-emerald-500 transition-colors duration-200" />
                </div>
              </button>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="px-6 py-6 border-t border-gray-100 space-y-3">
          <button className="w-full py-4 px-6 border-2 border-emerald-200 text-emerald-600 rounded-2xl font-semibold hover:bg-emerald-50 active:bg-emerald-100 transition-all duration-200 flex items-center justify-center space-x-2">
            <LogIn className="h-5 w-5" />
            <span>Iniciar Sesión</span>
          </button>
          <button className="w-full py-4 px-6 bg-gradient-to-r from-emerald-500 to-blue-600 text-white rounded-2xl font-bold hover:from-emerald-600 hover:to-blue-700 active:from-emerald-700 active:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2">
            <CalendarIcon className="h-5 w-5" />
            <span>Reservar Ahora</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default MobileNativeMenu;