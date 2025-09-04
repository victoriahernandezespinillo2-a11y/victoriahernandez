'use client';

import Link from 'next/link';
import type { ComponentType } from 'react';
import { usePathname } from 'next/navigation';
import {
  HomeIcon,
  BellIcon,
  UsersIcon,
  ChartBarIcon,
  CogIcon,
} from '@heroicons/react/24/outline';

interface NavItem {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
}

const items: NavItem[] = [
  { href: '/', label: 'Inicio', icon: (p) => <HomeIcon {...p} /> },
  { href: '/users', label: 'Usuarios', icon: (p) => <UsersIcon {...p} /> },
  { href: '/reports', label: 'Reportes', icon: (p) => <ChartBarIcon {...p} /> },
  { href: '/notifications', label: 'Alertas', icon: (p) => <BellIcon {...p} /> },
  { href: '/settings', label: 'Ajustes', icon: (p) => <CogIcon {...p} /> },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-50 border-t border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <ul className="grid grid-cols-5">
        {items.map((item) => {
          const active = pathname === item.href || pathname?.startsWith(item.href + '/');
          const Icon = item.icon;
          return (
            <li key={item.href} className="flex items-center justify-center py-2">
              <Link href={item.href} className="flex flex-col items-center gap-1">
                <Icon className={`h-5 w-5 ${active ? 'text-blue-600' : 'text-gray-500'}`} />
                <span className={`text-[11px] ${active ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}


