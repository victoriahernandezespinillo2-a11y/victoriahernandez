'use client';

import { useState } from 'react';
import Badge, { SidebarBadge } from './Badge';

export default function BadgeDemo() {
  const [count, setCount] = useState(5);

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Demo de Badges</h2>
      
      {/* Contador dinámico */}
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setCount(Math.max(0, count - 1))}
            className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
          >
            -
          </button>
          <span className="text-lg font-medium">Contador: {count}</span>
          <button 
            onClick={() => setCount(count + 1)}
            className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
          >
            +
          </button>
        </div>
      </div>

      {/* Badges básicos */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Badges Básicos</h3>
        <div className="flex flex-wrap gap-4">
          <Badge count={count} variant="default" />
          <Badge count={count} variant="success" />
          <Badge count={count} variant="warning" />
          <Badge count={count} variant="error" />
          <Badge count={count} variant="info" />
          <Badge count={count} variant="maintenance" />
          <Badge count={count} variant="notification" />
        </div>
      </div>

      {/* Badges de sidebar */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Badges de Sidebar</h3>
        <div className="flex flex-wrap gap-4">
          <SidebarBadge count={count} variant="default" />
          <SidebarBadge count={count} variant="success" />
          <SidebarBadge count={count} variant="warning" />
          <SidebarBadge count={count} variant="error" />
          <SidebarBadge count={count} variant="info" />
          <SidebarBadge count={count} variant="maintenance" />
          <SidebarBadge count={count} variant="notification" />
        </div>
      </div>

      {/* Diferentes tamaños */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Diferentes Tamaños</h3>
        <div className="flex flex-wrap items-center gap-4">
          <Badge count={count} variant="error" size="sm" />
          <Badge count={count} variant="error" size="md" />
          <Badge count={count} variant="error" size="lg" />
        </div>
      </div>

      {/* Badge con cero */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Badge con Cero (showZero=false)</h3>
        <div className="flex flex-wrap gap-4">
          <Badge count={0} variant="error" />
          <Badge count={0} variant="error" showZero={true} />
        </div>
      </div>

      {/* Badge personalizado */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Badge Personalizado</h3>
        <div className="flex flex-wrap gap-4">
          <Badge count={count} variant="error" className="animate-pulse">
            🔥
          </Badge>
          <Badge count={count} variant="info" className="animate-bounce">
            ⚡
          </Badge>
        </div>
      </div>

      {/* Simulación de sidebar */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Simulación de Sidebar</h3>
        <div className="bg-gray-900 text-white p-4 rounded-lg w-64">
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 hover:bg-gray-700 rounded">
              <div className="flex items-center gap-2">
                <span>🔔</span>
                <span>Notificaciones</span>
              </div>
              <SidebarBadge count={count} variant="notification" />
            </div>
            <div className="flex items-center justify-between p-2 hover:bg-gray-700 rounded">
              <div className="flex items-center gap-2">
                <span>🔧</span>
                <span>Mantenimiento</span>
              </div>
              <SidebarBadge count={count} variant="maintenance" />
            </div>
            <div className="flex items-center justify-between p-2 hover:bg-gray-700 rounded">
              <div className="flex items-center gap-2">
                <span>📊</span>
                <span>Auditoría</span>
              </div>
              <SidebarBadge count={count} variant="warning" />
            </div>
            <div className="flex items-center justify-between p-2 hover:bg-gray-700 rounded">
              <div className="flex items-center gap-2">
                <span>💰</span>
                <span>Finanzas</span>
              </div>
              <SidebarBadge count={count} variant="error" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
