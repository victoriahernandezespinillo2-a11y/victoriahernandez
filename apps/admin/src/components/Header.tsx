"use client";

import { useEffect, useMemo, useState } from 'react';
import { BellIcon, MagnifyingGlassIcon, UserCircleIcon, ChevronDownIcon, Cog6ToothIcon, ArrowRightOnRectangleIcon, Bars3Icon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useAdminNotifications } from '@/lib/hooks';
import { useSession, signOut } from 'next-auth/react';

interface HeaderProps {
  onToggleSidebar: () => void;
  isSidebarCollapsed: boolean;
}

export default function Header({ onToggleSidebar, isSidebarCollapsed }: HeaderProps) {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const { notifications, getNotifications, markAsRead } = useAdminNotifications();
  const { data: session } = useSession();
  const userName = session?.user?.name || session?.user?.email || 'Usuario';
  const userEmail = session?.user?.email || '';
  const userRole = (session?.user?.role || 'Administrador');

  useEffect(() => {
    getNotifications({ limit: 10, read: false }).catch(() => {});
    const i = setInterval(() => {
      getNotifications({ limit: 10, read: false }).catch(() => {});
    }, 30000);
    return () => clearInterval(i);
  }, [getNotifications]);

  const unreadCount = useMemo(() => (notifications || []).filter((n: any) => !n.readAt).length, [notifications]);

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4 sticky top-0 z-40">
      <div className="flex items-center justify-between">
        {/* Left side */}
        <div className="flex items-center space-x-4">
          {/* Mobile menu button */}
          <button
            onClick={onToggleSidebar}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <Bars3Icon className="h-6 w-6 text-gray-600" />
          </button>

          {/* Breadcrumb */}
          <div className="hidden sm:flex items-center space-x-2 text-sm text-gray-600">
            <span>Admin</span>
            <span>/</span>
            <span className="text-gray-900 font-medium">Dashboard</span>
          </div>
        </div>

        {/* Center - Search */}
        <div className="hidden md:flex flex-1 max-w-md mx-8">
          <div className="relative w-full">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar usuarios, reservas, canchas..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center space-x-4">
          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <BellIcon className="h-6 w-6 text-gray-600" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notifications dropdown */}
              {isNotificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Notificaciones</h3>
                </div>
                <div className="max-h-96 overflow-y-auto">
                    {(notifications || []).length === 0 && (
                      <div className="p-4 text-sm text-gray-500">No hay notificaciones</div>
                    )}
                    {(notifications || []).map((n: any) => (
                      <button
                        key={n.id}
                        onClick={async () => { await markAsRead(n.id); if (n.actionUrl) location.href = n.actionUrl; }}
                        className={`w-full text-left p-4 border-b border-gray-100 hover:bg-gray-50 ${!n.readAt ? 'bg-blue-50' : ''}`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h4 className="text-sm font-medium text-gray-900">{n.title}</h4>
                            <p className="text-sm text-gray-600 mt-1">{n.message}</p>
                          </div>
                          <span className="text-xs text-gray-500 ml-2">
                            {new Date(n.createdAt).toLocaleString('es-ES')}
                          </span>
                        </div>
                        {!n.readAt && <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>}
                      </button>
                    ))}
                </div>
                <div className="p-4 border-t border-gray-200">
                    <Link href="/notifications" className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                      Ver todas las notificaciones
                    </Link>
                </div>
              </div>
            )}
          </div>

          {/* User profile */}
          <div className="relative">
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center space-x-2">
                <UserCircleIcon className="h-8 w-8 text-gray-600" />
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-medium text-gray-900">{userName}</p>
                  <p className="text-xs text-gray-500">{userRole}</p>
                </div>
              </div>
              <ChevronDownIcon className="h-4 w-4 text-gray-600" />
            </button>

            {/* Profile dropdown */}
            {isProfileOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                <div className="p-4 border-b border-gray-200">
                  <p className="text-sm font-medium text-gray-900">{userName}</p>
                  <p className="text-xs text-gray-500">{userEmail}</p>
                </div>
                <div className="py-2">
                  <Link href="/profile" onClick={() => setIsProfileOpen(false)} className="flex items-center space-x-3 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    <UserCircleIcon className="h-4 w-4" />
                    <span>Mi Perfil</span>
                  </Link>
                  <Link href="/settings" onClick={() => setIsProfileOpen(false)} className="flex items-center space-x-3 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    <Cog6ToothIcon className="h-4 w-4" />
                    <span>Configuración</span>
                  </Link>
                </div>
                <div className="border-t border-gray-200 py-2">
                  <button onClick={() => signOut({ callbackUrl: '/auth/signin' })} className="flex items-center space-x-3 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50">
                    <ArrowRightOnRectangleIcon className="h-4 w-4" />
                    <span>Cerrar Sesión</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile search */}
      <div className="md:hidden mt-4">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>
    </header>
  );
}