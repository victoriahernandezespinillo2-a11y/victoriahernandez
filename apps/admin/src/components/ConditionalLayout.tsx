'use client';

import { usePathname } from 'next/navigation';
import AdminLayout from './AdminLayout';

interface ConditionalLayoutProps {
  children: React.ReactNode;
}

export default function ConditionalLayout({ children }: ConditionalLayoutProps) {
  const pathname = usePathname();
  
  // Si estamos en rutas de autenticación, no aplicar AdminLayout
  const isAuthRoute = pathname.startsWith('/auth');
  
  if (isAuthRoute) {
    return <>{children}</>;
  }
  
  // Para todas las demás rutas, aplicar AdminLayout
  return <AdminLayout>{children}</AdminLayout>;
}