'use client';

import { ReactNode } from 'react';

interface BadgeProps {
  count: number;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'maintenance' | 'notification';
  size?: 'sm' | 'md' | 'lg';
  showZero?: boolean;
  children?: ReactNode;
  className?: string;
}

const badgeVariants = {
  default: 'bg-gray-500 text-white',
  success: 'bg-green-500 text-white',
  warning: 'bg-yellow-500 text-white',
  error: 'bg-red-500 text-white',
  info: 'bg-blue-500 text-white',
  maintenance: 'bg-orange-500 text-white',
  notification: 'bg-purple-500 text-white',
};

const badgeSizes = {
  sm: 'text-xs px-1.5 py-0.5',
  md: 'text-xs px-2 py-1',
  lg: 'text-sm px-2.5 py-1.5',
};

export default function Badge({ 
  count, 
  variant = 'default', 
  size = 'md', 
  showZero = false,
  children,
  className = ''
}: BadgeProps) {
  // No mostrar badge si el count es 0 y showZero es false
  if (count === 0 && !showZero) {
    return null;
  }

  // Si hay children, usar children en lugar del count
  const displayContent = children || count;

  return (
    <span 
      className={`
        inline-flex items-center justify-center rounded-full font-semibold
        ${badgeVariants[variant]}
        ${badgeSizes[size]}
        ${className}
      `}
    >
      {displayContent}
    </span>
  );
}

// Componente específico para badges del sidebar
export function SidebarBadge({ count, variant = 'default' }: { count: number; variant?: BadgeProps['variant'] }) {
  return (
    <Badge 
      count={count} 
      variant={variant} 
      size="sm" 
      className="min-w-[20px] h-5 flex items-center justify-center"
    />
  );
}
