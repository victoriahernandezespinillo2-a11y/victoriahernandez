"use client";

import { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import PWAInstaller from './PWAInstaller';
import PWAManager from './PWAManager';
import NotificationManager from './NotificationManager';
import BottomNav from './BottomNav';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Detect mobile screen size
  useEffect(() => {
    const checkScreenSize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) {
        setIsSidebarCollapsed(true);
      }
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  const toggleSidebar = () => {
    if (isMobile) {
      setIsMobileSidebarOpen(!isMobileSidebarOpen);
    } else {
      setIsSidebarCollapsed(!isSidebarCollapsed);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile overlay */}
      {isMobile && isMobileSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          ${isMobile ? 'fixed' : 'sticky'}
          top-0
          ${isMobile && !isMobileSidebarOpen ? '-translate-x-full' : 'translate-x-0'}
          transition-transform duration-300 ease-in-out z-50 h-screen
        `}
      >
        <Sidebar
          isCollapsed={isMobile ? false : isSidebarCollapsed}
          onToggle={toggleSidebar}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        {/* Header */}
        <Header 
          onToggleSidebar={toggleSidebar}
          isSidebarCollapsed={isSidebarCollapsed}
        />

        {/* Page content */}
        <main className="flex-1 p-6 overflow-y-auto">
          <div className="w-full">
            {children}
          </div>
        </main>

        {/* Footer (desktop) */}
        <footer className="hidden lg:block bg-white border-t border-gray-200 px-6 py-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-center text-sm text-gray-600">
              <div className="flex items-center space-x-4">
                <span>© 2024 Polideportivo Victoria Hernandez</span>
                <span>•</span>
                <span>Versión 1.0.0</span>
              </div>
              <div className="flex items-center space-x-4 mt-2 sm:mt-0">
                <button className="hover:text-gray-900 transition-colors">
                  Soporte
                </button>
                <span>•</span>
                <a 
                  href="https://victoriahernandez-docs.vercel.app/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:text-gray-900 transition-colors"
                >
                  Documentación
                </a>
              </div>
            </div>
          </div>
        </footer>
      </div>

      {/* PWA Components */}
      <PWAInstaller />
      
      {/* PWA Manager - Oculto visualmente pero funcional */}
      <div className="fixed top-4 right-4 z-50 opacity-0 pointer-events-none">
        <PWAManager />
      </div>

      {/* Notification Manager (oculto para evitar duplicar UI de campana). Mantener desactivado. */}
      {false && <NotificationManager />}

      {/* Bottom navigation (mobile) */}
      <BottomNav />
    </div>
  );
}