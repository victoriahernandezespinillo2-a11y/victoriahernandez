"use client";

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  HomeIcon,
  UsersIcon,
  CreditCardIcon,
  WrenchScrewdriverIcon,
  ChartBarIcon,
  BellIcon,
  CogIcon,
  DocumentTextIcon,
  QrCodeIcon,
  GlobeAltIcon,
  PhotoIcon,
  ChatBubbleLeftRightIcon,
  StarIcon,
  QuestionMarkCircleIcon,
  TrophyIcon,
  CalendarIcon,
  InformationCircleIcon,
  FolderIcon,
  TagIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import { useAdminNotifications } from '@/lib/hooks';
import { useSidebarBadges } from '@/lib/hooks/useSidebarBadges';
import { SidebarBadge } from './Badge';

// Definir el tipo para los elementos del menú
interface MenuItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number | (() => number);
  submenu?: Omit<MenuItem, 'submenu'>[];
}

export default function Sidebar({ isCollapsed, onToggle }: { isCollapsed: boolean; onToggle: () => void }) {
  const pathname = usePathname();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const { notifications } = useAdminNotifications();
  const { badgeCounts, loading: badgesLoading } = useSidebarBadges();

  const menuItems: MenuItem[] = [
    {
      name: 'Dashboard',
      href: '/',
      icon: HomeIcon,
    },
    {
      name: 'Gestión',
      href: '#',
      icon: UsersIcon,
      badge: badgeCounts.pendingReservations + badgeCounts.newUsers,
      submenu: [
        { name: 'Reservas', href: '/reservations', icon: CalendarIcon, badge: badgeCounts.pendingReservations },
        { name: 'Nueva Reserva', href: '/reservations/new', icon: CalendarIcon },
        { name: 'Usuarios', href: '/users', icon: UsersIcon, badge: badgeCounts.newUsers },
        { name: 'Centros', href: '/centers', icon: GlobeAltIcon },
        { name: 'Canchas', href: '/courts', icon: TrophyIcon },
        { name: 'Productos', href: '/products', icon: FolderIcon },
        { name: 'Inventario', href: '/inventory', icon: FolderIcon },
      ],
    },
    {
      name: 'Finanzas',
      href: '#',
      icon: CreditCardIcon,
      badge: badgeCounts.pendingPayments + badgeCounts.pendingOrders,
      submenu: [
        { name: 'Pagos', href: '/payments', icon: CreditCardIcon, badge: badgeCounts.pendingPayments },
        { name: 'Pedidos', href: '/orders', icon: DocumentTextIcon, badge: badgeCounts.pendingOrders },
        { name: 'Créditos', href: '/credits', icon: CreditCardIcon },
        { name: 'Promociones', href: '/promotions', icon: StarIcon },
        { name: 'Precios', href: '/pricing', icon: ChartBarIcon },
        { name: 'Membresías', href: '/memberships', icon: UsersIcon },
        { name: 'Tarifas Reguladas', href: '/tariffs', icon: ShieldCheckIcon },
      ],
    },
    {
      name: 'Mantenimiento',
      href: '/maintenance',
      icon: WrenchScrewdriverIcon,
      badge: badgeCounts.maintenance,
    },
    {
      name: 'Torneos',
      href: '/tournaments',
      icon: TrophyIcon,
    },
    {
      name: 'Reportes',
      href: '#',
      icon: ChartBarIcon,
      submenu: [
        { name: 'Dashboard', href: '/reports', icon: ChartBarIcon },
        { name: 'Ingresos', href: '/reports/revenue', icon: CreditCardIcon },
        { name: 'Reservas', href: '/reports/reservations', icon: CalendarIcon },
        { name: 'Usuarios', href: '/reports/users', icon: UsersIcon },
        { name: 'Canchas', href: '/reports/courts', icon: TrophyIcon },
      ],
    },
    {
      name: 'Notificaciones',
      href: '/notifications',
      icon: BellIcon,
      badge: badgeCounts.notifications,
    },
    {
      name: 'Configuración',
      href: '/settings',
      icon: CogIcon,
    },
    {
      name: 'Auditoría',
      href: '/audit',
      icon: DocumentTextIcon,
      badge: badgeCounts.auditAlerts,
    },
    {
      name: 'Control de acceso',
      href: '/access-control',
      icon: QrCodeIcon,
    },
    {
      name: 'Landing Page',
      href: '#',
      icon: GlobeAltIcon,
      submenu: [
        { name: 'Hero Slides', href: '/landing/hero', icon: PhotoIcon },
        { name: 'Testimonios', href: '/landing/testimonials', icon: ChatBubbleLeftRightIcon },
        { name: 'Patrocinadores', href: '/landing/sponsors', icon: StarIcon },
        { name: 'Estadísticas', href: '/landing/stats', icon: ChartBarIcon },
        { name: 'FAQ', href: '/landing/faqs', icon: QuestionMarkCircleIcon },
        { name: 'Instalaciones Deportivas', href: '/landing/sports', icon: TrophyIcon },
        { name: 'Actividades & Eventos', href: '/landing/activities', icon: CalendarIcon },
        { name: 'Información General', href: '/landing/info-cards', icon: InformationCircleIcon },
      ],
    },
    {
      name: 'Blog',
      href: '#',
      icon: DocumentTextIcon,
      submenu: [
        { name: 'Posts', href: '/blog/posts', icon: DocumentTextIcon },
        { name: 'Categorías', href: '/blog/categories', icon: FolderIcon },
        { name: 'Tags', href: '/blog/tags', icon: TagIcon },
        { name: 'Comentarios', href: '/blog/comments', icon: ChatBubbleLeftRightIcon },
      ],
    },
  ];

  const toggleSubmenu = (itemName: string) => {
    setExpandedItems(prev => 
      prev.includes(itemName) 
        ? prev.filter(item => item !== itemName)
        : [...prev, itemName]
    );
  };

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(href);
  };

  return (
    <aside className={`bg-gray-900 text-white transition-all duration-300 flex flex-col h-screen overflow-y-auto border-r border-gray-800 ${
      isCollapsed ? 'w-16' : 'w-64'
    }`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <h1 className="text-xl font-bold text-blue-400">
              Admin Panel
            </h1>
          )}
          <button
            onClick={onToggle}
            className="p-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            {isCollapsed ? (
              <ChevronRightIcon className="h-5 w-5" />
            ) : (
              <ChevronLeftIcon className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => (
          <div key={item.name}>
            {item.submenu ? (
              <div>
                <button
                  onClick={() => !isCollapsed && toggleSubmenu(item.name)}
                  className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${
                    expandedItems.includes(item.name)
                      ? 'bg-gray-700 text-blue-400'
                      : 'hover:bg-gray-700'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <item.icon className="h-5 w-5 flex-shrink-0" />
                    {!isCollapsed && (
                      <span className="font-medium">{item.name}</span>
                    )}
                  </div>
                  {!isCollapsed && (
                    <ChevronRightIcon 
                      className={`h-4 w-4 transition-transform ${
                        expandedItems.includes(item.name) ? 'rotate-90' : ''
                      }`} 
                    />
                  )}
                </button>
                
                {/* Submenu */}
                {!isCollapsed && expandedItems.includes(item.name) && (
                  <div className="ml-6 mt-2 space-y-1">
                    {item.submenu.map((subItem) => (
                      <Link
                        key={subItem.name}
                        href={subItem.href}
                        className={`flex items-center justify-between p-2 rounded-lg transition-colors ${
                          isActive(subItem.href)
                            ? 'bg-blue-600 text-white'
                            : 'hover:bg-gray-700'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <subItem.icon className="h-4 w-4" />
                          <span className="text-sm">{subItem.name}</span>
                        </div>
                        {typeof subItem.badge === 'number' && subItem.badge > 0 && (
                          <SidebarBadge 
                            count={subItem.badge} 
                            variant={
                              subItem.name === 'Reservas' ? 'warning' :
                              subItem.name === 'Usuarios' ? 'info' :
                              subItem.name === 'Pagos' ? 'error' :
                              subItem.name === 'Pedidos' ? 'warning' :
                              'default'
                            }
                          />
                        )}
                        {typeof subItem.badge === 'function' && subItem.badge() > 0 && (
                          <SidebarBadge 
                            count={subItem.badge()} 
                            variant={
                              subItem.name === 'Reservas' ? 'warning' :
                              subItem.name === 'Usuarios' ? 'info' :
                              subItem.name === 'Pagos' ? 'error' :
                              subItem.name === 'Pedidos' ? 'warning' :
                              'default'
                            }
                          />
                        )}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <Link
                href={item.href}
                className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                  isActive(item.href)
                    ? 'bg-blue-600 text-white'
                    : 'hover:bg-gray-700'
                }`}
                title={isCollapsed ? item.name : undefined}
              >
                <div className="flex items-center space-x-3">
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  {!isCollapsed && (
                    <span className="font-medium">{item.name}</span>
                  )}
                </div>
                {badgesLoading ? (
                  <div className="w-5 h-5 bg-gray-400 rounded-full animate-pulse"></div>
                ) : (
                  <>
                    {typeof item.badge === 'number' && item.badge > 0 && (
                      <SidebarBadge 
                        count={item.badge} 
                        variant={
                          item.name === 'Gestión' ? 'info' :
                          item.name === 'Finanzas' ? 'error' :
                          item.name === 'Mantenimiento' ? 'maintenance' :
                          item.name === 'Notificaciones' ? 'notification' :
                          item.name === 'Auditoría' ? 'warning' :
                          'default'
                        }
                      />
                    )}
                    {typeof item.badge === 'function' && item.badge() > 0 && (
                      <SidebarBadge 
                        count={item.badge()} 
                        variant={
                          item.name === 'Gestión' ? 'info' :
                          item.name === 'Finanzas' ? 'error' :
                          item.name === 'Mantenimiento' ? 'maintenance' :
                          item.name === 'Notificaciones' ? 'notification' :
                          item.name === 'Auditoría' ? 'warning' :
                          'default'
                        }
                      />
                    )}
                  </>
                )}
              </Link>
            )}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-700">
        {!isCollapsed && (
          <div className="text-xs text-gray-400">
            <p>Polideportivo Victoria Hernandez</p>
            <p>v1.0.0</p>
          </div>
        )}
      </div>
    </aside>
  );
}