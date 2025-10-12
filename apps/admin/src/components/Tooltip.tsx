'use client';

/**
 * @file Tooltip Component
 * @description Componente de tooltip informativo reutilizable para mostrar ayuda contextual
 * 
 * @version 1.0.0
 * @since 2025-01-12
 */

import { useState } from 'react';
import { InformationCircleIcon } from '@heroicons/react/24/outline';

interface TooltipProps {
  /** Contenido del tooltip a mostrar */
  content: string;
  /** Posición del tooltip (default: 'top') */
  position?: 'top' | 'bottom' | 'left' | 'right';
}

/**
 * Componente Tooltip
 * 
 * @description Muestra información contextual al hacer hover o click.
 * Optimizado para móvil (click) y escritorio (hover).
 * 
 * @example
 * <Tooltip content="Este campo es opcional y acepta valores entre 0-100" />
 * 
 * @param {TooltipProps} props - Props del componente
 * @returns {JSX.Element} Icono con tooltip interactivo
 */
export function Tooltip({ content, position = 'top' }: TooltipProps) {
  const [show, setShow] = useState(false);

  const positionClasses = {
    top: 'bottom-full left-1/2 transform -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 transform -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 transform -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 transform -translate-y-1/2 ml-2'
  };

  const arrowClasses = {
    top: 'absolute top-full left-1/2 transform -translate-x-1/2 -mt-1',
    bottom: 'absolute bottom-full left-1/2 transform -translate-x-1/2 -mb-1',
    left: 'absolute left-full top-1/2 transform -translate-y-1/2 -ml-1',
    right: 'absolute right-full top-1/2 transform -translate-y-1/2 -mr-1'
  };

  const arrowBorder = {
    top: 'border-4 border-transparent border-t-gray-900',
    bottom: 'border-4 border-transparent border-b-gray-900',
    left: 'border-4 border-transparent border-l-gray-900',
    right: 'border-4 border-transparent border-r-gray-900'
  };

  return (
    <div className="relative inline-block ml-2">
      <button
        type="button"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onClick={(e) => {
          e.preventDefault();
          setShow(!show);
        }}
        onBlur={() => setShow(false)}
        className="text-gray-400 hover:text-gray-600 focus:outline-none transition-colors"
        aria-label="Más información"
      >
        <InformationCircleIcon className="h-5 w-5" />
      </button>
      
      {show && (
        <div 
          className={`absolute z-50 ${positionClasses[position]} w-72 px-4 py-3 text-sm text-white bg-gray-900 rounded-lg shadow-xl`}
          style={{ maxWidth: '90vw' }}
        >
          <div className="text-left leading-relaxed">
            {content}
          </div>
          <div className={arrowClasses[position]}>
            <div className={arrowBorder[position]}></div>
          </div>
        </div>
      )}
    </div>
  );
}


