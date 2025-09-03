'use client';

import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { BellIcon, XMarkIcon, CheckCircleIcon, ExclamationTriangleIcon, InformationCircleIcon } from '@heroicons/react/24/outline';

interface Notification {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
}

export default function NotificationManager() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  // Simular notificaciones del sistema
  useEffect(() => {
    const systemNotifications: Notification[] = [
      {
        id: '1',
        type: 'info',
        title: 'Sistema Operativo',
        message: 'El sistema está funcionando correctamente',
        timestamp: new Date(),
        read: false
      },
      {
        id: '2',
        type: 'success',
        title: 'Reserva Confirmada',
        message: 'Nueva reserva confirmada para la cancha 1',
        timestamp: new Date(Date.now() - 300000), // 5 minutos atrás
        read: false,
        actionUrl: '/reservations'
      },
      {
        id: '3',
        type: 'warning',
        title: 'Mantenimiento Programado',
        message: 'Cancha 2 en mantenimiento mañana de 8:00 a 12:00',
        timestamp: new Date(Date.now() - 600000), // 10 minutos atrás
        read: false,
        actionUrl: '/maintenance'
      }
    ];

    setNotifications(systemNotifications);
  }, []);

  // Función para marcar como leída
  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  // Función para eliminar notificación
  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // Función para enviar notificación push
  const sendPushNotification = async (notification: Notification) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        await new Notification(notification.title, {
          body: notification.message,
          icon: '/icons/icon-192x192.png',
          badge: '/icons/icon-72x72.png',
          tag: `notification-${notification.id}`,
          requireInteraction: true
        });
        
        toast.success('Notificación push enviada');
      } catch (error) {
        console.error('Error enviando notificación push:', error);
        toast.error('Error enviando notificación push');
      }
    } else {
      toast.error('Permisos de notificación no concedidos');
    }
  };

  // Función para obtener el icono según el tipo
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return CheckCircleIcon;
      case 'warning':
        return ExclamationTriangleIcon;
      case 'error':
        return ExclamationTriangleIcon;
      case 'info':
        return InformationCircleIcon;
      default:
        return InformationCircleIcon;
    }
  };

  // Función para obtener el color según el tipo
  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'warning':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'error':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'info':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="fixed top-4 right-4 z-50">
      {/* Botón de notificaciones */}
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="relative p-3 bg-white rounded-lg shadow-lg border border-gray-200 hover:bg-gray-50 transition-colors"
      >
        <BellIcon className="h-6 w-6 text-gray-600" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Panel de notificaciones */}
      {isVisible && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Notificaciones</h3>
              <button
                onClick={() => setIsVisible(false)}
                className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <XMarkIcon className="h-5 w-5 text-gray-500" />
              </button>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-sm text-gray-500 text-center">
                No hay notificaciones
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                    !notification.read ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div className={`flex-shrink-0 p-2 rounded-full ${getNotificationColor(notification.type).split(' ')[1]}`}>
                      {React.createElement(getNotificationIcon(notification.type), {
                        className: `h-4 w-4 ${getNotificationColor(notification.type).split(' ')[0]}`
                      })}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-gray-900">
                          {notification.title}
                        </h4>
                        <div className="flex items-center space-x-2">
                          {!notification.read && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          )}
                          <button
                            onClick={() => removeNotification(notification.id)}
                            className="p-1 rounded hover:bg-gray-200 transition-colors"
                          >
                            <XMarkIcon className="h-3 w-3 text-gray-400" />
                          </button>
                        </div>
                      </div>
                      
                      <p className="text-sm text-gray-600 mt-1">
                        {notification.message}
                      </p>
                      
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-gray-500">
                          {notification.timestamp.toLocaleTimeString('es-ES', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                        
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => sendPushNotification(notification)}
                            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                          >
                            Enviar Push
                          </button>
                          
                          {notification.actionUrl && (
                            <button
                              onClick={() => {
                                markAsRead(notification.id);
                                window.location.href = notification.actionUrl!;
                              }}
                              className="text-xs text-green-600 hover:text-green-800 font-medium"
                            >
                              Ver
                            </button>
                          )}
                          
                          {!notification.read && (
                            <button
                              onClick={() => markAsRead(notification.id)}
                              className="text-xs text-gray-600 hover:text-gray-800 font-medium"
                            >
                              Marcar leída
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">
                {unreadCount} no leída{unreadCount !== 1 ? 's' : ''}
              </span>
              <button
                onClick={() => setNotifications(prev => prev.map(n => ({ ...n, read: true })))}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                Marcar todas como leídas
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
