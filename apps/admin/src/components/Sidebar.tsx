"use client";

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  HomeIcon,
  UsersIcon,
  BuildingOfficeIcon,
  RectangleStackIcon,
  CalendarDaysIcon,
  TrophyIcon,
  CreditCardIcon,
  IdentificationIcon,
  CurrencyDollarIcon,
  WrenchScrewdriverIcon,
  ChartBarIcon,
  BellIcon,
  CogIcon,
  DocumentTextIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  Bars3Icon,
  QrCodeIcon,
  GlobeAltIcon,
  PhotoIcon,
  ChatBubbleLeftRightIcon,
  StarIcon,
  QuestionMarkCircleIcon,
  DocumentTextIcon as BlogIcon,
  TagIcon,
  FolderIcon,
  CalendarIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';

interface MenuItem {
  name: string;
  href: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  badge?: number;
  submenu?: MenuItem[];
}

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
    submenu: [
      { name: 'Usuarios', href: '/users', icon: UsersIcon },
      { name: 'Centros', href: '/centers', icon: BuildingOfficeIcon },
      { name: 'Canchas', href: '/courts', icon: RectangleStackIcon },
      { name: 'Reservas', href: '/reservations', icon: CalendarDaysIcon, badge: 5 },
      { name: 'Torneos', href: '/tournaments', icon: TrophyIcon },
    ],
  },
  {
    name: 'Finanzas',
    href: '#',
    icon: CreditCardIcon,
    submenu: [
      { name: 'Pagos', href: '/payments', icon: CreditCardIcon },
      { name: 'Membresías', href: '/memberships', icon: IdentificationIcon },
      { name: 'Precios', href: '/pricing', icon: CurrencyDollarIcon },
      { name: 'Productos', href: '/products', icon: RectangleStackIcon },
      { name: 'Inventario', href: '/inventory', icon: BuildingOfficeIcon },
      { name: 'Pedidos', href: '/orders', icon: CurrencyDollarIcon },
    ],
  },
  {
    name: 'Mantenimiento',
    href: '/maintenance',
    icon: WrenchScrewdriverIcon,
    badge: 2,
  },
  {
    name: 'Reportes',
    href: '/reports',
    icon: ChartBarIcon,
  },
  {
    name: 'Notificaciones',
    href: '/notifications',
    icon: BellIcon,
    badge: 12,
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
    icon: BlogIcon,
    submenu: [
      { name: 'Posts', href: '/blog/posts', icon: DocumentTextIcon },
      { name: 'Categorías', href: '/blog/categories', icon: FolderIcon },
      { name: 'Tags', href: '/blog/tags', icon: TagIcon },
      { name: 'Comentarios', href: '/blog/comments', icon: ChatBubbleLeftRightIcon },
    ],
  },
];

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

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
                        {subItem.badge && (
                          <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                            {subItem.badge}
                          </span>
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
                {!isCollapsed && item.badge && (
                  <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                    {item.badge}
                  </span>
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