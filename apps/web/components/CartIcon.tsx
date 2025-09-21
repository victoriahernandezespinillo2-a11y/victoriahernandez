'use client';

import { ShoppingCartIcon } from '@heroicons/react/24/outline';
import { useCart } from '@/lib/contexts/CartContext';

interface CartIconProps {
  className?: string;
  onClick?: () => void;
}

export default function CartIcon({ className = '', onClick }: CartIconProps) {
  const { state } = useCart();
  const { itemCount } = state;

  return (
    <div className={`relative ${className}`} onClick={onClick}>
      <ShoppingCartIcon className="w-6 h-6 text-gray-700 hover:text-blue-600 transition-colors cursor-pointer" />
      
      {/* Badge con cantidad de items */}
      {itemCount > 0 && (
        <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold animate-pulse">
          {itemCount > 99 ? '99+' : itemCount}
        </div>
      )}
    </div>
  );
}



























