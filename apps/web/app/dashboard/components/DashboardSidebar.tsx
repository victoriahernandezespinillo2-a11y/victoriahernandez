'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Calendar,
  User,
  CreditCard,
  Clock,
  Trophy,
  Settings,
  Menu,
  ShoppingCart,
  Wallet,
  ListOrdered,
} from 'lucide-react';
import { MobileDrawer } from '../../components/MobileDrawer';
import { useMobileDrawer } from '../../hooks/useMobileDrawer';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Mis Reservas', href: '/dashboard/reservations', icon: Calendar },
  { name: 'Perfil', href: '/dashboard/profile', icon: User },
  { name: 'Membresías', href: '/dashboard/memberships', icon: CreditCard },
  { name: 'Monedero', href: '/dashboard/wallet', icon: Wallet },
  { name: 'Tienda', href: '/dashboard/shop', icon: ShoppingCart },
  { name: 'Pedidos', href: '/dashboard/orders', icon: ListOrdered },
  { name: 'Historial', href: '/dashboard/history', icon: Clock },
  { name: 'Torneos', href: '/dashboard/tournaments', icon: Trophy },
  { name: 'Configuración', href: '/dashboard/settings', icon: Settings },
];

export function DashboardSidebar() {
  const { isMobileDrawerOpen, openDrawer, closeDrawer } = useMobileDrawer();
  const pathname = usePathname();

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button
          type="button"
          className="bg-white p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 shadow-lg"
          onClick={openDrawer}
        >
          <Menu className="h-6 w-6" />
        </button>
      </div>

      {/* Mobile Drawer */}
      <MobileDrawer 
        isOpen={isMobileDrawerOpen} 
        onClose={closeDrawer}
        title="Dashboard"
      >
        <SidebarContent pathname={pathname} />
      </MobileDrawer>

      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0">
        <div className="flex-1 flex flex-col min-h-0 bg-white border-r border-gray-200">
          <SidebarContent pathname={pathname} />
        </div>
      </div>
    </>
  );
}

function SidebarContent({ pathname }: { pathname: string }) {
  return (
    <>
      {/* Logo */}
      <div className="flex items-center h-16 flex-shrink-0 px-4 bg-blue-600">
        <Link href="/" className="flex items-center">
          <div className="flex-shrink-0">
            <img 
              src="/images/logo.png" 
              alt="Polideportivo Victoria Hernandez" 
              className="h-8 w-8 object-contain bg-white rounded-lg"
              onError={(e) => {
                // Fallback al diseño original si no carga la imagen
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling?.classList.remove('hidden');
              }}
            />
            <div className="hidden h-8 w-8 bg-white rounded-lg flex items-center justify-center">
              <span className="text-blue-600 font-bold text-lg">P</span>
            </div>
          </div>
          <div className="ml-3">
            <p className="text-white text-sm font-medium">Polideportivo</p>
            <p className="text-blue-200 text-xs">Victoria Hernandez</p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <div className="flex-1 flex flex-col overflow-y-auto">
        <nav className="flex-1 px-2 py-4 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors ${
                  isActive
                    ? 'bg-blue-100 text-blue-900'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <item.icon
                  className={`mr-3 flex-shrink-0 h-5 w-5 ${
                    isActive ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'
                  }`}
                />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* User info section */}
        <div className="flex-shrink-0 p-4 border-t border-gray-200">
          <div className="bg-blue-50 rounded-lg p-3">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="h-4 w-4 text-blue-600" />
                </div>
              </div>
              <div className="ml-3 flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  Panel de Usuario
                </p>
                <p className="text-xs text-gray-500">
                  Gestiona tu cuenta
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}