'use client';

import { useState, useCallback } from 'react';

/**
 * Hook personalizado para gestionar el estado del drawer móvil
 * Proporciona funciones para abrir, cerrar y alternar el estado del drawer
 */
export function useMobileDrawer() {
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  const openDrawer = useCallback(() => {
    setIsMobileDrawerOpen(true);
  }, []);

  const closeDrawer = useCallback(() => {
    setIsMobileDrawerOpen(false);
  }, []);

  const toggleDrawer = useCallback(() => {
    setIsMobileDrawerOpen(prev => !prev);
  }, []);

  return {
    isMobileDrawerOpen,
    openDrawer,
    closeDrawer,
    toggleDrawer,
  };
}