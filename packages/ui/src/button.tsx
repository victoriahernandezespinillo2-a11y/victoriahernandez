"use client";

import { ReactNode } from "react";
import { cn } from "./lib/utils";

interface ButtonProps {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'outline' | 'ghost' | 'destructive';
  size?: 'default' | 'sm' | 'lg';
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  title?: string;
}

export const Button = ({ 
  children, 
  className = '', 
  variant = 'default',
  size = 'default',
  onClick,
  disabled = false,
  type = 'button',
  title
}: ButtonProps) => {
  const baseClasses = "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none"
  
  const variantClasses = {
    // Cambiamos a colores seguros (azules) para asegurar visibilidad si no hay tokens CSS configurados
    default: "bg-blue-600 text-white hover:bg-blue-700",
    outline: "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:text-gray-900",
    ghost: "text-gray-700 hover:bg-gray-100 hover:text-gray-900",
    destructive: "bg-red-600 text-white hover:bg-red-700"
  }
  
  const sizeClasses = {
    default: "h-10 px-4 py-2",
    sm: "h-9 rounded-md px-3",
    lg: "h-11 rounded-md px-8"
  }
  
  const classes = cn(
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    className
  )
  
  return (
    <button
      type={type}
      className={classes}
      onClick={onClick}
      disabled={disabled}
      title={title}
    >
      {children}
    </button>
  );
};
